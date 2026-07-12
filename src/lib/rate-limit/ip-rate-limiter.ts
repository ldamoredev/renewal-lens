/**
 * In-memory fixed-window rate limiter. The Railway deployment decision
 * (one persistent Node process) is what makes this consistent without a
 * database; do not reuse it in a serverless or multi-process runtime.
 */

export type RateLimitDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly retryAfterSeconds: number };

type WindowEntry = {
  windowStartMs: number;
  count: number;
};

export class FixedWindowRateLimiter {
  private readonly entries = new Map<string, WindowEntry>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
    /** Memory bound: beyond this many tracked keys, oldest entries go. */
    private readonly maxTrackedKeys = 10_000,
  ) {}

  check(key: string, nowMs: number): RateLimitDecision {
    const existing = this.entries.get(key);
    if (
      existing !== undefined &&
      nowMs - existing.windowStartMs >= this.windowMs
    ) {
      this.entries.delete(key);
    }

    const entry = this.entries.get(key);
    if (entry === undefined) {
      this.ensureCapacity(nowMs);
      this.entries.set(key, { windowStartMs: nowMs, count: 1 });
      return { allowed: true };
    }

    if (entry.count < this.maxRequests) {
      entry.count += 1;
      return { allowed: true };
    }

    const windowEndMs = entry.windowStartMs + this.windowMs;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((windowEndMs - nowMs) / 1000)),
    };
  }

  get trackedKeyCount(): number {
    return this.entries.size;
  }

  private ensureCapacity(nowMs: number): void {
    if (this.entries.size < this.maxTrackedKeys) {
      return;
    }
    for (const [key, entry] of this.entries) {
      if (nowMs - entry.windowStartMs >= this.windowMs) {
        this.entries.delete(key);
      }
    }
    // Still full of live entries: evict the oldest-inserted keys so the
    // map stays bounded even under address-rotation abuse.
    while (this.entries.size >= this.maxTrackedKeys) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) {
        return;
      }
      this.entries.delete(oldestKey);
    }
  }
}
