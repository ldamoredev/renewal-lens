/**
 * In-memory operational counters for the analysis endpoint. Safe by
 * construction: only outcome labels, counts, and durations — never IPs,
 * image bytes, extracted text, or model payloads. Consistent because the
 * Railway runtime is a single persistent Node process.
 */

export type AnalysisMetricsSnapshot = {
  readonly startedAt: string;
  readonly requests: number;
  readonly outcomes: Readonly<Record<string, number>>;
  readonly durationMs: {
    readonly count: number;
    readonly totalMs: number;
    readonly maxMs: number;
  };
};

const startedAt = new Date().toISOString();

let requests = 0;
let outcomes: Record<string, number> = {};
let durationCount = 0;
let durationTotalMs = 0;
let durationMaxMs = 0;

export function recordAnalysisRequest(input: {
  outcome: string;
  durationMs: number;
}): void {
  requests += 1;
  outcomes[input.outcome] = (outcomes[input.outcome] ?? 0) + 1;
  durationCount += 1;
  durationTotalMs += Math.max(0, Math.round(input.durationMs));
  durationMaxMs = Math.max(durationMaxMs, Math.round(input.durationMs));
}

export function snapshotAnalysisMetrics(): AnalysisMetricsSnapshot {
  return {
    startedAt,
    requests,
    outcomes: { ...outcomes },
    durationMs: {
      count: durationCount,
      totalMs: durationTotalMs,
      maxMs: durationMaxMs,
    },
  };
}

export function resetAnalysisMetricsForTests(): void {
  requests = 0;
  outcomes = {};
  durationCount = 0;
  durationTotalMs = 0;
  durationMaxMs = 0;
}
