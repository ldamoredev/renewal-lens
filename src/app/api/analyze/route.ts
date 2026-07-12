import { NextResponse } from "next/server";

import { analyzeScreenshot } from "@/features/analyze-offer/application/analyze-screenshot";
import type { AnalysisApiResponse } from "@/features/analyze-offer/application/analysis-response";
import { createAnthropicOfferExtractor } from "@/features/analyze-offer/infrastructure/anthropic-offer-extractor";
import { resolveClientIp } from "@/lib/http/client-ip";
import {
  MAX_UPLOAD_BYTES,
  prepareScreenshotUpload,
} from "@/lib/image/prepare-upload";
import { recordAnalysisRequest } from "@/lib/metrics/analysis-metrics";
import { getAnalyzeRateLimiter } from "@/lib/rate-limit/analyze-rate-limiter";

export const runtime = "nodejs";

/**
 * Hard ceiling for one analysis request. The Anthropic client already
 * enforces its own request timeout; this bounds the whole route
 * (transform + extraction + retry) so a wedged upstream cannot hold the
 * connection open indefinitely.
 */
const ANALYSIS_DEADLINE_MS = 60_000;

function statusFor(response: AnalysisApiResponse): number {
  if (response.ok) return 200;
  switch (response.error) {
    case "invalid_file":
    case "file_too_large":
    case "unsupported_image":
      return 400;
    case "analysis_inconclusive":
      return 422;
    case "rate_limited":
      return 429;
    case "timeout":
      return 504;
    case "service_unavailable":
      return 503;
  }
}

function outcomeLabel(response: AnalysisApiResponse): string {
  return response.ok ? response.state : response.error;
}

async function withDeadline(
  work: Promise<AnalysisApiResponse>,
  deadlineMs: number,
): Promise<AnalysisApiResponse> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<AnalysisApiResponse>((resolve) => {
    timer = setTimeout(
      () => resolve({ ok: false, error: "timeout" }),
      deadlineMs,
    );
  });
  try {
    return await Promise.race([work, expiry]);
  } finally {
    clearTimeout(timer);
  }
}

type HandledResponse = {
  readonly body: AnalysisApiResponse;
  readonly headers?: Record<string, string>;
};

async function handleAnalyze(request: Request): Promise<HandledResponse> {
  const decision = getAnalyzeRateLimiter().check(
    resolveClientIp(request.headers),
    Date.now(),
  );
  if (!decision.allowed) {
    return {
      body: { ok: false, error: "rate_limited" },
      headers: { "Retry-After": String(decision.retryAfterSeconds) },
    };
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_UPLOAD_BYTES + 1_048_576
  ) {
    return { body: { ok: false, error: "file_too_large" } };
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return { body: { ok: false, error: "invalid_file" } };
  }
  const image = formData.get("image");
  if (!(image instanceof File)) {
    return { body: { ok: false, error: "invalid_file" } };
  }
  const prepared = await prepareScreenshotUpload(image);
  if (!prepared.ok) {
    return { body: { ok: false, error: prepared.error } };
  }

  let extractor;
  try {
    extractor = createAnthropicOfferExtractor();
  } catch {
    return { body: { ok: false, error: "service_unavailable" } };
  }
  const body = await withDeadline(
    analyzeScreenshot(prepared.screenshot, extractor),
    ANALYSIS_DEADLINE_MS,
  );
  return { body };
}

export async function POST(request: Request) {
  const startedAtMs = Date.now();
  const { body, headers } = await handleAnalyze(request);
  const status = statusFor(body);
  const durationMs = Date.now() - startedAtMs;
  const outcome = outcomeLabel(body);

  recordAnalysisRequest({ outcome, durationMs });
  // Safe operational metadata only: no IPs, filenames, image content,
  // extracted text, or model payloads.
  console.info(
    JSON.stringify({ event: "analyze_request", outcome, status, durationMs }),
  );

  return NextResponse.json(body, { status, headers });
}
