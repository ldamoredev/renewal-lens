import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as analyzeRoute } from "@/app/api/analyze/route";
import { GET as healthRoute } from "@/app/health/route";
import {
  recordAnalysisRequest,
  resetAnalysisMetricsForTests,
  snapshotAnalysisMetrics,
} from "@/lib/metrics/analysis-metrics";
import { resetAnalyzeRateLimiterForTests } from "@/lib/rate-limit/analyze-rate-limiter";

const managedEnv = ["RATE_LIMIT_MAX_REQUESTS", "RATE_LIMIT_WINDOW_SECONDS"];
const originalEnv = new Map(
  managedEnv.map((name) => [name, process.env[name]]),
);

beforeEach(() => {
  process.env.RATE_LIMIT_MAX_REQUESTS = "2";
  process.env.RATE_LIMIT_WINDOW_SECONDS = "3600";
  resetAnalyzeRateLimiterForTests();
  resetAnalysisMetricsForTests();
  // Keep the safe structured log line out of test output.
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  for (const [name, value] of originalEnv) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
  resetAnalyzeRateLimiterForTests();
  resetAnalysisMetricsForTests();
  vi.restoreAllMocks();
});

function post(ip: string): Promise<Response> {
  return analyzeRoute(
    new Request("http://local/api/analyze", {
      method: "POST",
      body: new FormData(),
      headers: { "x-forwarded-for": ip },
    }),
  );
}

describe("per-IP rate limiting on /api/analyze", () => {
  it("blocks the third request in the window and sets Retry-After", async () => {
    expect((await post("203.0.113.7")).status).toBe(400);
    expect((await post("203.0.113.7")).status).toBe(400);

    const blocked = await post("203.0.113.7");
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ ok: false, error: "rate_limited" });
    const retryAfter = Number(blocked.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(3600);
  });

  it("does not punish a different address", async () => {
    await post("203.0.113.7");
    await post("203.0.113.7");
    expect((await post("203.0.113.7")).status).toBe(429);
    expect((await post("198.51.100.9")).status).toBe(400);
  });

  it("records safe outcome metrics for every request", async () => {
    await post("203.0.113.7");
    await post("203.0.113.7");
    await post("203.0.113.7");

    const snapshot = snapshotAnalysisMetrics();
    expect(snapshot.requests).toBe(3);
    expect(snapshot.outcomes).toEqual({ invalid_file: 2, rate_limited: 1 });
    // Metrics carry labels and numbers only — nothing request-derived.
    expect(JSON.stringify(snapshot)).not.toContain("203.0.113.7");
  });
});

describe("GET /health", () => {
  it("reports ok with uptime and the metrics snapshot, uncached", async () => {
    recordAnalysisRequest({ outcome: "success", durationMs: 42 });

    const response = await healthRoute();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(body.metrics.requests).toBe(1);
    expect(body.metrics.outcomes).toEqual({ success: 1 });
  });
});
