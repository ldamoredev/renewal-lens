import { NextResponse } from "next/server";

import { analyzeScreenshot } from "@/features/analyze-offer/application/analyze-screenshot";
import type { AnalysisApiResponse } from "@/features/analyze-offer/application/analysis-response";
import { createAnthropicOfferExtractor } from "@/features/analyze-offer/infrastructure/anthropic-offer-extractor";
import {
  MAX_UPLOAD_BYTES,
  prepareScreenshotUpload,
} from "@/lib/image/prepare-upload";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_UPLOAD_BYTES + 1_048_576
  ) {
    return NextResponse.json(
      { ok: false, error: "file_too_large" } satisfies AnalysisApiResponse,
      { status: 400 },
    );
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_file" } satisfies AnalysisApiResponse,
      { status: 400 },
    );
  }
  const image = formData.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "invalid_file" } satisfies AnalysisApiResponse,
      { status: 400 },
    );
  }
  const prepared = await prepareScreenshotUpload(image);
  if (!prepared.ok) {
    const response = { ok: false, error: prepared.error } as const;
    return NextResponse.json(response, { status: statusFor(response) });
  }

  let extractor;
  try {
    extractor = createAnthropicOfferExtractor();
  } catch {
    const response = {
      ok: false,
      error: "service_unavailable",
    } as const satisfies AnalysisApiResponse;
    return NextResponse.json(response, { status: 503 });
  }
  const response = await analyzeScreenshot(prepared.screenshot, extractor);
  return NextResponse.json(response, { status: statusFor(response) });
}
