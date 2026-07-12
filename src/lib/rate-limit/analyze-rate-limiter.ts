import { FixedWindowRateLimiter } from "@/lib/rate-limit/ip-rate-limiter";

export const DEFAULT_ANALYZE_MAX_REQUESTS = 10;
export const DEFAULT_ANALYZE_WINDOW_SECONDS = 3_600;

export type RateLimitConfig = {
  readonly maxRequests: number;
  readonly windowSeconds: number;
};

function parsePositiveInteger(
  raw: string | undefined,
  fallback: number,
): number {
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed <= 0 ||
    String(parsed) !== raw.trim()
  ) {
    return fallback;
  }
  return parsed;
}

/** Malformed values fall back to safe defaults instead of failing boot. */
export function readRateLimitConfig(
  env: Record<string, string | undefined>,
): RateLimitConfig {
  return {
    maxRequests: parsePositiveInteger(
      env.RATE_LIMIT_MAX_REQUESTS,
      DEFAULT_ANALYZE_MAX_REQUESTS,
    ),
    windowSeconds: parsePositiveInteger(
      env.RATE_LIMIT_WINDOW_SECONDS,
      DEFAULT_ANALYZE_WINDOW_SECONDS,
    ),
  };
}

let instance: FixedWindowRateLimiter | null = null;

export function getAnalyzeRateLimiter(): FixedWindowRateLimiter {
  if (instance === null) {
    const config = readRateLimitConfig(process.env);
    instance = new FixedWindowRateLimiter(
      config.maxRequests,
      config.windowSeconds * 1_000,
    );
  }
  return instance;
}

export function resetAnalyzeRateLimiterForTests(): void {
  instance = null;
}
