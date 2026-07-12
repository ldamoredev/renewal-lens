# Upload and Example Pipeline (Phase 4)

## Routes

- `POST /api/analyze` accepts one multipart field named `image` and is the only path that can call Anthropic.
- `GET /api/examples/:id` serves `streamly`, `cloudvault`, or `fitclub` from a precomputed in-process fixture cache. It never constructs an Anthropic client and responds with an immutable public cache header.

Both routes return the shared, Zod-validated `AnalysisApiResponse` contract from `src/features/analyze-offer/application/analysis-response.ts`.

## Upload validation and transformation

`prepareScreenshotUpload` applies the server-side boundary before an adapter sees image bytes:

1. Require a non-empty file no larger than 10 MiB.
2. Accept only `image/png`, `image/jpeg`, or `image/webp`.
3. Decode with Sharp using `failOn: "error"` and a 40-megapixel input limit.
4. Confirm decoded format matches the declared MIME type and reject multi-page/animated input.
5. Apply EXIF orientation, resize inside a 1,568 × 1,568 box without enlargement, re-encode, and omit source metadata.
6. Convert only the transformed bytes to base64 for the transient `ScreenshotInput` passed to Anthropic.

The route performs no filesystem writes, database calls, object storage operations, or image logging. Buffers become unreachable when the request ends.

## Application orchestration

```text
multipart image
→ validate and resize
→ ScreenshotInput
→ OfferFactsExtractor.extract()
→ OfferExtraction
→ computeOfferPricing()
→ AnalysisApiResponse
→ existing result UI
```

Extraction failures map to payload-free product errors. Rate limiting maps to the existing `rate_limited` state; other external failures map to the controlled technical-error state. Successful extractions with pricing blockers become partial, while explicit model ambiguities become ambiguous.

The browser aborts its previous request whenever a visitor selects another example, uploads another file, opens a prototype state, or leaves the page. This prevents stale responses from replacing newer UI state. Server-side external cancellation propagation is deferred because the Phase 2 extractor port does not currently accept an `AbortSignal`.

## Verified example cache

The production fixtures live under `src/features/analyze-offer/infrastructure/fixtures/`. They are the same hand-verified structured extractions tested against the fictional SVG screenshots. At module initialization they pass through the strict extraction schema, semantic mapper, deterministic pricing engine, and presentation mapper. A contract regression fails fast instead of silently serving stale data.

Expected first-year totals remain:

- Streamly: `$155.88`, 12 monthly charges after a seven-day trial.
- CloudVault: `$120.00`, one annual charge; the displayed `$10/month` remains an equivalent only.
- FitClub+: `$220.89`, one `$1` promotional charge and 11 charges of `$19.99`.

## Controlled limitation

No `ANTHROPIC_API_KEY` was present during Phase 4 validation, so the paid live call was not executed. The route, SDK adapter, response mapping, missing-key degradation, image pipeline, and all example paths are covered deterministically. The first environment with a configured key must perform one manual upload to confirm Anthropic accepts the pruned structured-output schema.

Final result wording and expanded evidence interaction belong to Phase 5.
