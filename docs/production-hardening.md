# Production Hardening (Phase 6)

RenewalLens runs on Railway as one persistent Node process listening on the
injected `PORT` (`next start` reads it automatically). Every hardening
mechanism below relies on that single-process decision; none of it is safe
on a serverless or multi-process runtime.

## Per-IP rate limiting

`POST /api/analyze` is guarded by an in-memory fixed-window limiter
(`src/lib/rate-limit/`). The client address is the first `x-forwarded-for`
hop (Railway's proxy), falling back to `x-real-ip`, then to a shared
`"unknown"` bucket. Defaults: **10 requests per 3600 s per IP**, overridable
with `RATE_LIMIT_MAX_REQUESTS` / `RATE_LIMIT_WINDOW_SECONDS`; malformed
values fall back to the defaults instead of failing boot. Blocked requests
return the existing `rate_limited` response (HTTP 429) plus a `Retry-After`
header. The limiter checks before any body parsing, so oversized or
malformed uploads cannot bypass it. Memory stays bounded: at most 10,000
tracked keys, with expired-entry sweeps and oldest-key eviction beyond that.
IP addresses live only in this in-memory map — they are never logged or
persisted.

The example route (`GET /api/examples/[id]`) is intentionally not limited:
it serves immutable cached fixtures and cannot reach Anthropic.

## Timeouts

Two layers bound one analysis:

1. The Anthropic client keeps its 45 s request timeout and one transport
   retry (Phase 2).
2. The route applies a 60 s overall deadline covering transform +
   extraction + the structural retry; expiry returns the `timeout` state
   (HTTP 504) instead of holding the connection.

## Health and metrics

`GET /health` (uncached, `Cache-Control: no-store`) returns `status`,
`uptimeSeconds`, and a snapshot of the in-memory analysis metrics: request
count, per-outcome counters (`success`, `partial`, …, `rate_limited`,
`timeout`, …), and duration aggregates (count/total/max). Metrics carry
labels and numbers only — never IPs, filenames, image content, extracted
text, or model payloads — so exposing them on the health endpoint is safe.
Use `/health` as the Railway health check path.

Each analysis request also emits one structured log line
(`{"event":"analyze_request",outcome,status,durationMs}`) with the same
safe-metadata-only policy.

## Security headers

`next.config.ts` applies to every route (built in
`src/lib/http/security-headers.ts`): `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
a restrictive `Permissions-Policy`, and `Strict-Transport-Security`. A fully
self-contained `Content-Security-Policy` (no external origins; `blob:`/
`data:` images for upload previews; inline script/style required by Next.js
and the theme pre-paint) is added in production builds only, because the dev
server needs `eval` for fast refresh and is never exposed.

## Environment

| Variable                    | Default             | Purpose                                                                                           |
| --------------------------- | ------------------- | ------------------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`         | —                   | Required for live analysis; without it `POST /api/analyze` degrades to `503 service_unavailable`. |
| `ANTHROPIC_MODEL`           | `claude-haiku-4-5`  | Extraction model override.                                                                        |
| `RATE_LIMIT_MAX_REQUESTS`   | `10`                | Analyze requests allowed per window per IP.                                                       |
| `RATE_LIMIT_WINDOW_SECONDS` | `3600`              | Rate-limit window length.                                                                         |
| `PORT`                      | injected by Railway | `next start` listens on it automatically.                                                         |
