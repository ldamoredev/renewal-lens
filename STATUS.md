# RenewalLens Status

## Current phase

Phase 6 — Production hardening (`COMPLETED`, Claude Code / Claude Fable 5). No later phase is active. Phase 7 remains `NOT_STARTED`.

## Current objective

Completed: the app is hardened for the single-process Railway runtime — in-memory per-IP rate limiting on `POST /api/analyze` with `Retry-After`, `GET /health` with safe operational metrics, a 60 s overall route deadline, security headers with a production-only self-contained CSP, structured safe-metadata logging, and environment-variable configuration with safe defaults. All behaviors were verified against a real production build.

## Overall progress

7 of 9 phases are complete. The product pipeline is feature-complete and production-hardened; the remaining work is the Phase 7 regression suite and the Phase 8 launch.

### Two-day time budget

- Day 1: Phases 0–3. Phase 0 has a hard one-hour timebox.
- Day 2: Phases 4–8.
- Scope-cut rule: if Phase 3 is not `COMPLETED` by the end of Day 1, reduce Phases 5–7 (fewer states, fewer fixtures, no stretch goals) instead of extending the schedule.
- Launch remains at the end of Day 2.
- Stretch only if time remains: Playwright end-to-end coverage and the Phase 7 extended evaluation set.

## Phase roadmap

| Phase | Name                                            | Status      | Owner/Agent       | Notes                                                             |
| ----: | ----------------------------------------------- | ----------- | ----------------- | ----------------------------------------------------------------- |
|     0 | Repository and documentation bootstrap          | COMPLETED   | Codex GPT-5.6 SOL | Next.js foundation, tooling, docs, architecture, validation ready |
|     1 | Product foundation, visual system, and examples | COMPLETED   | Codex GPT-5.6 SOL | Responsive UI, all states, three fictional examples, mock results |
|     2 | Anthropic extraction contract                   | COMPLETED   | Claude Fable 5    | Domain types, Zod boundary, prompt, adapter, single bounded retry |
|     3 | Deterministic pricing engine                    | COMPLETED   | Claude Fable 5    | Pure 365-day engine, twelfth-day timeline, blockers, 17 new tests |
|     4 | Real upload flow and example fixture cache      | COMPLETED   | Codex GPT-5.6 SOL | Upload, cached examples, live verification, and UI contrast pass  |
|     5 | Results, evidence, and uncertainty states       | COMPLETED   | Codex GPT-5.6 SOL | Per-fact evidence, honest absence, four analysis result states    |
|     6 | Production hardening                            | COMPLETED   | Claude Fable 5    | IP limits, /health, deadline, headers, metrics, verified runtime  |
|     7 | Tests, fixtures, and minimum evaluation         | NOT_STARTED | —                 | Required regression suite; Playwright/eval set are stretch only   |
|     8 | Launch and portfolio                            | NOT_STARTED | —                 | Railway deploy, public assets, README, Contra EN, LinkedIn ES     |

## Completed work

- Inspected the empty starting directory and confirmed there were no files or Git metadata to preserve.
- Initialized a Git repository on `main`.
- Bootstrapped Next.js 16 App Router, React 19, strict TypeScript, and Tailwind CSS 4.
- Added pnpm dependency locking and an explicit native build policy for `sharp` and `unrs-resolver`.
- Added ESLint, Prettier, Vitest, build, and aggregate validation scripts.
- Added the initial app route and an intentionally phase-limited repository-ready placeholder.
- Added the planned UI/application/domain/infrastructure/schema/test folder boundaries.
- Created and aligned `AGENTS.md`, `CLAUDE.md`, `STATUS.md`, and `README.md`.
- Recorded product boundaries, Railway's single-process decision, privacy constraints, deterministic calculation boundary, cached-example policy, and the closed first-year convention in `docs/architecture.md`.
- Added `.env.example` without secrets; the exact Haiku model identifier remains a Phase 2 decision.
- Built the responsive RenewalLens landing page, upload surface, analysis bridge, results panel, example gallery, process explanation, and footer.
- Implemented the dotted-to-solid analysis transition and reduced-motion behavior.
- Implemented idle, loading, success, partial, ambiguous, technical error, and rate-limited presentation states.
- Added mock state controls so every Phase 1 state is directly reviewable before the real pipeline exists.
- Created three original fictional screenshot assets: Streamly trial, CloudVault annual-equivalent pricing, and FitClub+ promotional pricing.
- Added typed presentation fixtures with explicit mock summaries and textual evidence.
- Added reusable upload, examples, pricing-result, state-notice, and brand components.
- Added self-hosted variable Space Grotesk and JetBrains Mono font packages.
- Added nine deterministic rendering and fixture tests plus Vitest alias configuration.
- Integrated Claude Design's refined floating glass header, ambient grid and orbs, glass analyzer shell, elevated upload surface, and glass example cards.
- Added the warm light palette with ivory surfaces, lavender actions, and muted green validation while retaining the same Space Grotesk and JetBrains Mono typography as dark mode.
- Added an accessible sun/moon theme toggle with system-preference initialization, pre-paint application, and `localStorage` persistence.
- Self-hosted Space Grotesk and JetBrains Mono for both themes so their metrics remain identical.
- Added responsive toggle/header behavior without changing existing reduced-motion support.
- Added `docs/design-system.md` and a tenth component test for toggle structure.
- Removed Fraunces/Inter and every theme-specific override of font metrics, spacing, radii, or component dimensions after visual comparison exposed layout reflow.
- Added a regression test that rejects layout-changing properties inside light-theme overrides, except for the toggle thumb itself.
- Extracted only production React/CSS/tests/docs from `renewal-lens-visual`; `.dc.html`, `support.js`, thumbnails, build output, and auxiliary Git history were not copied.
- Defined the versioned extraction contract (`EXTRACTION_CONTRACT_VERSION = 2026-07-12.1`) as pure domain types: merchant, currency observation, due-today amount, chronological billing phases (free trial / promotional / regular), displayed equivalent price kept separate from real charges, auto-renewal, cancellation, and ambiguities — all with verbatim textual evidence and explicit nulls.
- Added the strict Zod wire schema for untrusted model output plus a semantic mapper that converts dot-decimal money strings to integer minor units (scale 2) with string arithmetic only and rejects priced free trials, unpriced paid phases, empty evidence, malformed decimals, bad currency codes, and non-positive periods.
- Added the extraction prompts (system, user, retry) as infrastructure: extraction-only role, verbatim evidence, bare-`$`-is-not-USD rule, equivalent-price separation, JSON-only output.
- Added `AnthropicOfferExtractor`: structured outputs via `output_config.format` (JSON Schema generated from the Zod schema and pruned to the supported keyword subset), 45 s timeout, SDK `maxRetries: 1` for transport errors, exactly one controlled structural retry with a machine-readable issue list, and typed mapping to `extracted` / `invalid_output` / `refused` / `rate_limited` / `timeout` / `api_error` outcomes that carry no payloads.
- Defined the `OfferFactsExtractor` application port and `ScreenshotInput` type so the application layer depends on an abstraction, not on Anthropic.
- Added three hand-verified raw extraction fixtures matching the visible text of the Streamly, CloudVault, and FitClub+ SVG assets.
- Added 20 deterministic tests (schema/mapper unit tests plus adapter integration tests with a fake client) covering minor-unit conversion, localized-format rejection, ambiguity handling, retry bounding, refusal, and transport-error mapping.
- Selected and documented `claude-haiku-4-5` as the default extraction model; `.env.example` updated.
- Wrote `docs/extraction-contract.md`.
- Implemented `computeOfferPricing` in `src/features/analyze-offer/domain/pricing.ts`: a pure engine (no Next.js/React/Anthropic/Zod/infrastructure imports) that walks the extracted billing phases on an integer twelfth-day timeline (day = 12, week = 84, month = 365, year = 4380; first-year window `[0, 4380)`).
- Computed due today (extracted when visible, otherwise derived from the first phase and flagged), the first-year total with its full `ScheduledCharge[]` schedule, and the effective monthly cost (first-year total ÷ 12, half-up on minor units).
- Encoded abstention as machine-readable `CalculationBlocker`s (`no_pricing_visible`, `price_after_trial_unknown`, `trial_length_unknown`, `phase_length_unknown`, `billing_cadence_unknown`, `phase_price_unknown`, `mixed_currencies`) and every convention as machine-readable `PricingAssumption`s.
- Added 17 hand-verified pricing tests covering the three example patterns end to end from raw fixtures (Streamly $155.88 / 12 charges, CloudVault $120.00 / 1 charge, FitClub+ $220.89 / 12 charges), weekly (53 charges), quarterly (4), the day-365 renewal boundary, exact-half rounding, single-charge phases, phases beyond the window, all blockers, and equivalent-price exclusion.
- Wrote `docs/pricing-engine.md` and updated `docs/architecture.md` to mark the first-year convention as implemented.
- Added the shared `AnalysisApiResponse` contract and mapper from evidence-backed extraction plus deterministic pricing into the existing Phase 1 result shape.
- Added `analyzeScreenshot`, which depends only on the `OfferFactsExtractor` port and maps every extraction outcome to a payload-free controlled product response.
- Added `POST /api/analyze`: multipart parsing, early content-length rejection, file validation, transient image preparation, missing-key degradation, Anthropic extraction, deterministic pricing, and typed HTTP status mapping.
- Added `prepareScreenshotUpload`: 10 MiB limit, PNG/JPEG/WebP allowlist, decoded-format/MIME match, 40 MP limit, animation rejection, EXIF orientation, metadata stripping, re-encoding, and maximum 1,568 px long side.
- Promoted Streamly, CloudVault, and FitClub+ to production infrastructure fixtures and added an in-process verified cache that validates/maps/calculates them at module initialization.
- Added `GET /api/examples/[id]` with immutable public caching; examples never construct an Anthropic client.
- Replaced mock upload/example results in the client with real fetch flows, stale-request cancellation, a 520 ms example animation, Zod response validation, and explicit file/service error messages.
- Added Sharp as a direct runtime dependency and documented the full pipeline in `docs/upload-pipeline.md`.
- Added 18 Phase 4 tests across image preparation, orchestration, partial/ambiguous mapping, fixture cache, and route behavior; the full suite now has 66 tests.
- Verified the live structured-output path with the independent Northstar Cinema screenshot: seven-day trial, $14.99 monthly renewal, $0 due today, and a deterministic $179.88 first-year total.
- Ran each fictional example through the live upload path once and confirmed exact agreement with the checked-in fixtures: Streamly $155.88, CloudVault $120.00, and FitClub+ $220.89.
- Fixed the light-theme first-year callout contrast with paint-only overrides, preserving identical theme geometry, and added a regression test; the full suite now has 67 tests.
- Added a transport-safe `PresentationFact` model with `visible`, `derived`, `calculated`, and `not_visible` statuses plus evidence arrays for every displayed result.
- Rebuilt the result panel around a multi-stage billing timeline, per-fact evidence disclosures, calculated first-year/effective-monthly values, actual cadence, displayed equivalents, renewal, commitment, cancellation, additional fees, missing information, ambiguities, and calculation notes.
- Added explicit `success`, `partial`, `ambiguous`, and `insufficient` analysis outcomes; ambiguous calculations display `Not confirmed`, while insufficient screenshots request wider captures with pricing footnotes.
- Versioned the extraction contract as `2026-07-12.2` to represent minimum commitment and additional fees without inventing absent values.
- Kept the expanded structured-output schema inside Anthropic's union budget by using an explicit commitment visibility state and a non-null fee-frequency enum; verified the revised schema live with Streamly.
- Extended the deterministic engine so visible one-time and recurring fees enter the first-year schedule; an additional fee with no visible amount blocks the total instead of being ignored.
- Added `docs/result-presentation.md` and updated architecture, extraction, pricing, and README documentation.
- Added 10 Phase 5 regression tests for evidence rendering, insufficient and ambiguous outcomes, commitment/fee mapping, fee calculations, live-schema structure, and richer fixture responses; the suite now has 77 tests.
- Added the in-memory fixed-window per-IP rate limiter (`src/lib/rate-limit/`): defaults 10 requests per 3600 s, env-overridable (`RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_WINDOW_SECONDS`) with fallback-to-default parsing, bounded to 10,000 tracked keys with expired sweeps and oldest-key eviction.
- Wired the limiter into `POST /api/analyze` before any body parsing, keyed by the first `x-forwarded-for` hop (Railway proxy) with `x-real-ip` and shared `"unknown"` fallbacks; blocked requests return the existing `rate_limited` state plus a `Retry-After` header.
- Added `GET /health` (uncached) returning status, uptime, and the safe in-memory analysis metrics snapshot (request count, per-outcome counters, duration aggregates — labels and numbers only).
- Added the analysis metrics registry (`src/lib/metrics/analysis-metrics.ts`) and one structured safe-metadata log line per analysis request (`event`, `outcome`, `status`, `durationMs` — never IPs, filenames, image bytes, extracted text, or model payloads).
- Added a 60 s overall route deadline around transform + extraction that returns the existing `timeout` state (HTTP 504) instead of holding the connection.
- Added security headers to every route via `next.config.ts` + `src/lib/http/security-headers.ts`: nosniff, DENY framing, strict referrer policy, restrictive permissions policy, HSTS, and a production-only fully self-contained CSP.
- Added `docs/production-hardening.md`, updated `.env.example` and `README.md`, and added 22 hardening tests (limiter, config parsing, client IP, metrics, headers, and route-level 429/health integration); the suite now has 99 tests.

## Work in progress

- None. Phase 5 is complete; Phase 6 has not started.

## Remaining tasks for current phase

- None.

## Decisions made

- pnpm is the package manager.
- TypeScript strict mode is required.
- The initial structure preserves UI, application, domain, infrastructure, and schema boundaries.
- Railway remains the closed deployment choice: one persistent Node process, in-memory per-IP limiting, and no database.
- The bootstrap page is intentionally only a repository-ready placeholder; Phase 1 owns the product visual system.
- Exact Anthropic model selection is deferred to Phase 2, while `ANTHROPIC_MODEL` remains configurable.
- The closed 365-day first-year convention is recorded in `docs/architecture.md` for Phase 3 implementation.
- Phase 1 examples use original SVG assets so offer copy and prices remain precise, inspectable, and free of third-party branding.
- Fonts are self-hosted through Fontsource packages, avoiding runtime font requests.
- Presentation fixtures are intentionally separate from the future extraction schema and deterministic engine.
- The mock upload reuses a presentation result only to exercise UI behavior; Phase 4 owns file validation and the real pipeline.
- Prototype state controls are kept in a collapsed disclosure so all required states remain reviewable without dominating the product interface.
- Dark and light themes share one component tree and switch through root `data-theme` selectors.
- The toggle stores only `dark` or `light`; it stores no user or analysis data.
- First visits follow `prefers-color-scheme`; explicit choices persist under `renewallens-theme`.
- Generated Claude Design exports remain external references and are not production dependencies.
- Theme selectors may override only color, background, border color, shadow, opacity, blur, and other non-geometric paint properties. Only the toggle thumb may transform between states.
- `claude-haiku-4-5` is the default extraction model (cheapest current model with vision and structured-output support); `ANTHROPIC_MODEL` overrides it.
- The model returns money as plain dot-decimal `decimalText`; TypeScript converts it to integer minor units deterministically. The MVP fixes the minor-unit scale at 2; other currency scales are deferred until a real currency requires them.
- The extraction request uses Anthropic structured outputs; the JSON Schema is generated from the Zod wire schema and pruned of keywords outside the structured-output subset, so the Zod schema stays free of regex/min/max and semantic rules live in the mapper.
- Semantic contract violations (e.g. a priced free trial) consume the same single retry as invalid JSON; there is never more than one structural retry per extraction.
- A bare `$` yields `currencyCode: null` with the symbol preserved separately; ISO codes are reported only when explicit or unambiguous.
- Extraction outcomes are payload-free discriminated unions, safe to log and to map to the existing Phase 1 UI states.
- Phase 2 fixtures document the wire contract; Phase 4 still owns the verified fixture cache that the preloaded examples will serve from.
- Time is measured in integer twelfth-days (month = one twelfth of a 365-day year), which realizes the closed convention without floating point or calendar lookups: monthly billing yields at most 12 first-year charges and an annual renewal on day 365 falls outside the window.
- The effective monthly cost is the first-year total divided by 12, rounded half up on minor units — the engine's only division.
- `/api/analyze` is the only public path allowed to construct the Anthropic adapter; `/api/examples/*` is fixture-only and cacheable.
- Upload limits are 10 MiB encoded input and 40 megapixels decoded; supported formats are PNG, JPEG, and WebP.
- Image output retains the validated MIME family, applies orientation, removes metadata, never enlarges, and caps the long side at 1,568 px.
- Client responses are validated with the same shared Zod schema used by the server response contract.
- Phase 4 cancellation prevents stale UI updates; propagating `AbortSignal` into the extractor port is deferred.
- Blockers and assumptions remain machine-readable in the domain and are translated into human copy by the Phase 5 presentation boundary.
- A bounded paid phase with no visible cadence ("first month $1") is one charge at phase start, recorded as an assumption rather than blocked.
- Due today can remain available while the first-year cost is blocked (honest partial results); a trailing free trial with no visible paid price abstains with `price_after_trial_unknown` instead of claiming a $0 year.
- `displayedEquivalentPrice` is never read by the engine's math paths.
- Presentation facts are created in the application layer before React; components arrange facts and evidence but perform no pricing calculations.
- Missing cancellation, commitment, renewal, fees, or currency code remain `Not visible`/listed absence and never become a negative assertion.
- A model-reported ambiguity takes precedence over a calculable schedule: derived totals are displayed as `Not confirmed` until the ambiguity is resolved.
- No extracted billing phases maps to `insufficient`, distinct from technical failure and from a partial but useful extraction.
- Additional fees with `one_time` frequency are scheduled once at signup; recurring fees follow their visible frequency. A fee with unknown amount blocks first-year cost.
- Anthropic's structured-output union budget is protected by a union-free minimum-commitment visibility object and fee-frequency enum; the public domain still exposes absence as `null`.
- Rate limiting applies only to `POST /api/analyze` (the endpoint that spends money); the immutable example route stays unlimited. The limiter runs before body parsing so oversized uploads cannot bypass it.
- Client IPs are used only as in-memory rate-limit keys and are never logged or persisted; logs and `/health` metrics carry outcome labels, counts, and durations only.
- Malformed rate-limit environment values fall back to safe defaults instead of failing boot.
- The CSP is production-only (dev needs eval for fast refresh) and fully self-contained: no external origin is allowed anywhere; inline script/style stay allowed because Next.js hydration and the theme pre-paint script require them.
- `/health` exposes the metrics snapshot publicly; this is safe by construction because the registry cannot contain request-derived content.
- The route deadline (60 s) responds with `timeout` rather than aborting the upstream call; the Anthropic client's own 45 s timeout remains the inner bound.

## Known issues

- The Browser skill package remained absent during Phases 1 and 5, so responsive behavior was verified through common CSS breakpoints, server-rendered component tests, and the user's visual checks rather than automated screenshots. A final human desktop/mobile pass remains recommended.
- The in-memory rate limit resets on every deploy/restart and is per-process by design (single Railway process); horizontal scaling would require revisiting the closed Railway decision.
- The 60 s route deadline responds early but does not cancel the in-flight Anthropic request; the SDK timeout bounds the leaked work at 45 s per attempt.

## Blockers

- None.

## Validation evidence

- `pnpm validate`: passed end to end after Phase 6 on 2026-07-12.
  - TypeScript: passed.
  - ESLint with zero warnings: passed.
  - Prettier check: passed.
  - Vitest: 99 tests passed in 14 files (77 from Phases 1–5 + 22 new hardening tests).
  - Next.js production build: passed; routes `/`, `/_not-found`, `/api/analyze`, `/api/examples/[id]`, `/health`.
- Manual production-runtime check (`pnpm start`, `NODE_ENV=production`, `PORT=3411`, `RATE_LIMIT_MAX_REQUESTS=2`, no API key):
  - `GET /health` returned `status: ok` with uptime and an empty metrics snapshot, `Cache-Control: no-store`.
  - `GET /` returned 200 with all security headers including the self-contained CSP.
  - Three analyze POSTs from one forwarded IP returned 400, 400, then 429 with `Retry-After: 3600`; a different IP still received 400.
  - `GET /health` afterwards reported `requests: 5`, `outcomes: { invalid_file: 3, rate_limited: 2 }` and contained no IPs.
  - Server log showed only structured `analyze_request` lines with outcome/status/duration.

## Files changed in the current phase

- `.env.example`
- `README.md`
- `STATUS.md`
- `docs/production-hardening.md` (new)
- `next.config.ts`
- `src/app/api/analyze/route.ts`
- `src/app/health/route.ts` (new)
- `src/lib/http/client-ip.ts` (new)
- `src/lib/http/security-headers.ts` (new)
- `src/lib/metrics/analysis-metrics.ts` (new)
- `src/lib/rate-limit/analyze-rate-limiter.ts` (new)
- `src/lib/rate-limit/ip-rate-limiter.ts` (new)
- `src/tests/integration/production-hardening.test.ts` (new)
- `src/tests/unit/analysis-metrics.test.ts` (new)
- `src/tests/unit/client-ip.test.ts` (new)
- `src/tests/unit/ip-rate-limiter.test.ts` (new)
- `src/tests/unit/security-headers.test.ts` (new)

## Handoff for the next agent

Completed:

- The full product pipeline works and is production-hardened: `validated upload → transient Sharp transform → ScreenshotInput → OfferFactsExtractor → computeOfferPricing → AnalysisApiResponse → UI`, now guarded by per-IP rate limiting, a 60 s route deadline, security headers, `GET /health`, safe metrics, and structured safe-metadata logging.
- Rate limiting: in-memory fixed window, 10 requests/hour/IP by default, env-overridable, checked before body parsing, `Retry-After` on 429, bounded memory. IPs are never logged or persisted.
- `GET /health` is the Railway health-check path and exposes only outcome counters and durations.
- Security headers apply to every route; the production build adds a fully self-contained CSP (verified against the real production server).
- 99 deterministic tests pass.

Validation:

- `pnpm validate`: passed (typecheck, lint zero-warnings, format, 99 tests, production build with the new `/health` route).
- Manual production-runtime verification: health payload, all security headers including CSP, the 400/400/429+`Retry-After` sequence per IP, per-IP independence, metrics counters, and clean structured logs (see Validation evidence).

Important context for Phase 7 (tests, fixtures, and minimum evaluation):

- The required scope is the regression suite; Playwright and the 15–20 screenshot evaluation set are stretch goals only.
- 99 deterministic tests already cover schema, mapper, engine, orchestration, routes, presentation, theme invariance, and hardening. Phase 7 should focus on gaps: end-to-end fixture regressions across the full pipeline (raw fixture → presentation payload), adversarial/malformed extraction cases, and any uncovered UI states — not on re-testing what exists.
- Everything is deterministic by policy: no test may call the live API. The live checks already performed are recorded in Validation evidence.
- Reset helpers exist for singletons (`resetAnalyzeRateLimiterForTests`, `resetAnalysisMetricsForTests`); route tests can drive rate limiting via `RATE_LIMIT_*` env vars plus `resetAnalyzeRateLimiterForTests()`.
- Vitest isolates test files per worker, so module-level singletons (limiter, metrics) do not leak between files.

Other context:

- The Railway deploy itself is Phase 8; `next start` already honors the injected `PORT`, and `/health` is ready to be configured as the health-check path.
- The browser skill package is unavailable in this environment; a human desktop/mobile visual pass remains recommended before launch.
- Anthropic rejects schemas with too many union/array parameters. Keep the commitment object and fee-frequency enum union-free unless a live schema check proves an alternative valid.

Next recommended phase:

- Phase 7 — Tests, fixtures, and minimum evaluation.

Do not start Phase 7 automatically.

## Deferred ideas

- Phase 7 stretch: Playwright end-to-end critical flow.
- Phase 7 stretch: 15–20 screenshot evaluation set with field-level metrics.
- Bounding boxes and automatic screenshot crops are outside v1.
- Database, authentication, chat, PDFs, multi-image analysis, comparison, and offer scoring are outside the MVP.
