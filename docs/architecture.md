# RenewalLens Architecture

## Product boundary

RenewalLens converts the pricing terms visible in one screenshot into a clear, evidence-backed billing explanation. It does not infer hidden conditions, assess legality, judge value, or recommend purchasing or cancellation decisions.

## Layering

```text
Next.js UI and API routes
  → application orchestration
  → Anthropic extraction adapter
  → Zod-validated extraction model
  → pure deterministic pricing domain
  → presentation model
```

Dependencies point inward. The pure domain layer has no dependency on React, Next.js, Anthropic, transport types, or storage. Prompts belong to infrastructure; financial formulas belong to domain code; display copy belongs to presentation components.

## Probabilistic extraction, deterministic calculation

The model may interpret only visible screenshot content and return structured facts with textual evidence. It does not calculate final totals. TypeScript uses integer minor units for all money, explicit frequencies and durations, documented rounding, and visible unavailable-calculation reasons.

The distinction between an advertised monthly equivalent and an actual charge is mandatory. For example, “$10/month, billed annually” exposes a monthly equivalent of 1,000 minor units but an actual annual charge of 12,000 minor units. The extraction contract defines this explicitly and the presentation labels the equivalent separately from the actual cadence.

## First-year convention

This closed product decision is implemented and tested in the Phase 3 engine (see `docs/pricing-engine.md`):

> First-year cost is the sum of all charges whose charge date falls within the 365 days after signup, assuming signup today.

Consequences include 12 monthly charges after a seven-day free trial, and one $1 promotional charge plus 11 $19.99 regular charges for a $220.89 first-year total. Every calculated result records this convention in `assumptions[]`.

## Examples

The three fictional examples are the public demo path: Streamly covers a seven-day free trial, CloudVault separates a displayed monthly equivalent from an annual charge, and FitClub+ covers a promotional first month followed by a regular monthly price. Their screenshot assets and verified extraction fixtures are versioned in the repository. Selecting an example never calls Anthropic. Live API analysis is reserved for visitor uploads.

## Runtime and deployment decision

Railway is the closed deployment target. The production application will run as a single persistent Node process and listen on Railway's injected `process.env.PORT`. This makes in-memory per-IP rate limiting consistent for the database-free MVP; a serverless platform could distribute requests across isolated process memories and make that protection unreliable.

No database is planned. Phase 4 implements transient upload handling: PNG/JPEG/WebP files are size-limited, decoded, MIME-confirmed, orientation-normalized, metadata-stripped, and resized to a maximum 1,568-pixel long side before model submission. No image is persisted or logged. See `docs/upload-pipeline.md`. The Phase 6 production contract adds `GET /health`, rate limits, security headers, safe operational metrics, and environment configuration. Phase 8 performs the actual Railway deployment.

## Security and privacy boundaries

- `ANTHROPIC_API_KEY` remains server-side and uncommitted.
- Uploaded image bytes and extracted sensitive content are not logged.
- External files, request bodies, environment variables, and model responses are validated.
- Logs contain only safe operational metadata.
- Live model calls have bounded input size, output tokens, timeout, rate limit, and at most one controlled structural retry.

## Presentation boundary

Phase 5 maps extraction facts and pricing outcomes into a transport-safe
presentation model before React renders them. Every fact carries its own
evidence list and an explicit `visible`, `derived`, `calculated`, or
`not_visible` status. React arranges these facts but performs no financial
logic. See `docs/result-presentation.md`.

## Deferred decisions

Production rate-limit values, operational metrics, and final Railway runtime
configuration remain Phase 6 decisions.
