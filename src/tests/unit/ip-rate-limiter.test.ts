import { describe, expect, it } from "vitest";

import {
  DEFAULT_ANALYZE_MAX_REQUESTS,
  DEFAULT_ANALYZE_WINDOW_SECONDS,
  readRateLimitConfig,
} from "@/lib/rate-limit/analyze-rate-limiter";
import { FixedWindowRateLimiter } from "@/lib/rate-limit/ip-rate-limiter";

describe("FixedWindowRateLimiter", () => {
  it("allows up to the limit inside one window and then blocks", () => {
    const limiter = new FixedWindowRateLimiter(2, 60_000);

    expect(limiter.check("a", 0)).toEqual({ allowed: true });
    expect(limiter.check("a", 1_000)).toEqual({ allowed: true });
    const blocked = limiter.check("a", 2_000);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      // Window closes at 60s; 58s remain, rounded up.
      expect(blocked.retryAfterSeconds).toBe(58);
    }
  });

  it("resets the window after it elapses", () => {
    const limiter = new FixedWindowRateLimiter(1, 1_000);

    expect(limiter.check("a", 0).allowed).toBe(true);
    expect(limiter.check("a", 999).allowed).toBe(false);
    expect(limiter.check("a", 1_000).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const limiter = new FixedWindowRateLimiter(1, 60_000);

    expect(limiter.check("a", 0).allowed).toBe(true);
    expect(limiter.check("a", 1).allowed).toBe(false);
    expect(limiter.check("b", 2).allowed).toBe(true);
  });

  it("reports at least one second before retry", () => {
    const limiter = new FixedWindowRateLimiter(1, 1_000);

    limiter.check("a", 0);
    const blocked = limiter.check("a", 999);

    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBe(1);
    }
  });

  it("sweeps expired entries when the key cap is reached", () => {
    const limiter = new FixedWindowRateLimiter(1, 100, 2);
    limiter.check("a", 0);
    limiter.check("b", 0);
    // Both previous windows expired: capacity is reclaimed by sweeping.
    expect(limiter.check("c", 200).allowed).toBe(true);
    expect(limiter.trackedKeyCount).toBe(1);
  });

  it("stays bounded by evicting the oldest live key when full", () => {
    const limiter = new FixedWindowRateLimiter(1, 60_000, 2);
    limiter.check("a", 0);
    limiter.check("b", 1);
    limiter.check("c", 2);
    expect(limiter.trackedKeyCount).toBeLessThanOrEqual(2);
  });
});

describe("readRateLimitConfig", () => {
  it("uses defaults when the variables are absent", () => {
    expect(readRateLimitConfig({})).toEqual({
      maxRequests: DEFAULT_ANALYZE_MAX_REQUESTS,
      windowSeconds: DEFAULT_ANALYZE_WINDOW_SECONDS,
    });
  });

  it("reads valid positive integers", () => {
    expect(
      readRateLimitConfig({
        RATE_LIMIT_MAX_REQUESTS: "5",
        RATE_LIMIT_WINDOW_SECONDS: "900",
      }),
    ).toEqual({ maxRequests: 5, windowSeconds: 900 });
  });

  it("falls back to defaults on malformed values instead of failing boot", () => {
    for (const bad of ["abc", "0", "-3", "2.5", ""]) {
      expect(
        readRateLimitConfig({
          RATE_LIMIT_MAX_REQUESTS: bad,
          RATE_LIMIT_WINDOW_SECONDS: bad,
        }),
      ).toEqual({
        maxRequests: DEFAULT_ANALYZE_MAX_REQUESTS,
        windowSeconds: DEFAULT_ANALYZE_WINDOW_SECONDS,
      });
    }
  });
});
