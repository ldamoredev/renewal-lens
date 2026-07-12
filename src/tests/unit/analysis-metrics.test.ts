import { beforeEach, describe, expect, it } from "vitest";

import {
  recordAnalysisRequest,
  resetAnalysisMetricsForTests,
  snapshotAnalysisMetrics,
} from "@/lib/metrics/analysis-metrics";

beforeEach(() => {
  resetAnalysisMetricsForTests();
});

describe("analysis metrics", () => {
  it("starts empty", () => {
    const snapshot = snapshotAnalysisMetrics();
    expect(snapshot.requests).toBe(0);
    expect(snapshot.outcomes).toEqual({});
    expect(snapshot.durationMs).toEqual({ count: 0, totalMs: 0, maxMs: 0 });
  });

  it("aggregates outcome counters and durations", () => {
    recordAnalysisRequest({ outcome: "success", durationMs: 1200 });
    recordAnalysisRequest({ outcome: "success", durationMs: 800 });
    recordAnalysisRequest({ outcome: "rate_limited", durationMs: 3 });

    const snapshot = snapshotAnalysisMetrics();
    expect(snapshot.requests).toBe(3);
    expect(snapshot.outcomes).toEqual({ success: 2, rate_limited: 1 });
    expect(snapshot.durationMs).toEqual({
      count: 3,
      totalMs: 2003,
      maxMs: 1200,
    });
  });

  it("exposes copies, not internal state", () => {
    recordAnalysisRequest({ outcome: "success", durationMs: 10 });
    const snapshot = snapshotAnalysisMetrics();
    (snapshot.outcomes as Record<string, number>).success = 999;
    expect(snapshotAnalysisMetrics().outcomes.success).toBe(1);
  });
});
