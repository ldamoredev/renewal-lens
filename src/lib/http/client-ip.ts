/**
 * Resolves the client address behind Railway's proxy. The first entry of
 * `x-forwarded-for` is the original client; `x-real-ip` is the fallback.
 * The value is used only as an in-memory rate-limit key and is never
 * logged or persisted.
 */
export function resolveClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded !== null) {
    const first = forwarded.split(",")[0].trim();
    if (first.length > 0) {
      return first;
    }
  }
  const real = headers.get("x-real-ip")?.trim();
  if (real) {
    return real;
  }
  return "unknown";
}
