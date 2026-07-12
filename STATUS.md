# RenewalLens Status

## Current phase

Phase 3 — Deterministic pricing engine (`COMPLETED`, Claude Code / Claude Fable 5). No later phase is active. Phase 4 remains `NOT_STARTED`.

## Current objective

Completed: `computeOfferPricing` consumes `OfferExtraction` and computes due today, the 365-day first-year cost with its full charge schedule, and the half-up effective monthly cost using integer minor units only. The closed first-year convention is recorded as machine-readable `assumptions[]`, missing or contradictory data produces machine-readable blockers instead of guesses, and all expected values in the tests were verified by hand.

## Overall progress

4 of 9 phases are complete. Product UI, mock examples, the extraction contract, and the pricing engine are ready. Nothing is wired to a real upload flow or route yet — that is Phase 4, which also owns the verified fixture cache for the preloaded examples.

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
|     4 | Real upload flow and example fixture cache      | NOT_STARTED | —                 | Validated image pipeline; examples never call live API            |
|     5 | Results, evidence, and uncertainty states       | NOT_STARTED | —                 | Human-readable complete, partial, ambiguous, insufficient results |
|     6 | Production hardening                            | NOT_STARTED | —                 | In-memory IP limits, timeouts, privacy, metrics, Railway runtime  |
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

## Work in progress

- None. The Claude Design integration is complete.

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
- Blockers and assumptions are machine-readable codes; human copy for them belongs to Phase 5 presentation components.
- A bounded paid phase with no visible cadence ("first month $1") is one charge at phase start, recorded as an assumption rather than blocked.
- Due today can remain available while the first-year cost is blocked (honest partial results); a trailing free trial with no visible paid price abstains with `price_after_trial_unknown` instead of claiming a $0 year.
- `displayedEquivalentPrice` is never read by the engine's math paths.

## Known issues

- The Browser skill package referenced by the environment was missing during Phase 1, so interactive screenshot-based desktop/mobile inspection was unavailable. A final human visual pass remains recommended.
- Uploaded files are mock-only and are not parsed or validated. This is intentional and belongs to Phase 4.
- The Anthropic adapter has never been exercised against the live API (Phase 2 tests are deterministic by policy). The first live call happens when Phase 4 wires the upload pipeline; structured-output acceptance of the pruned JSON Schema should be confirmed with one manual call at that point.
- Screenshot resizing to the 1,568-pixel long side documented in `docs/architecture.md` is not implemented yet; it belongs to the Phase 4 image pipeline, which must also enforce MIME/size limits before the adapter is reached.

## Blockers

- None.

## Validation evidence

- `pnpm validate`: passed end to end on 2026-07-12 (after Phase 3).
  - TypeScript: passed.
  - ESLint with zero warnings: passed.
  - Prettier check: passed.
  - Vitest: 48 tests passed in 5 test files (31 from Phases 1–2 + 17 new pricing tests).
  - Next.js production build: passed; `/` and `/_not-found` generated as static routes.
- All expected pricing values were verified by hand before being written into tests (totals, charge counts, day offsets, and rounding), including the three canonical totals from `docs/architecture.md`.
- No live Anthropic call was made at any point.

## Files changed in the current phase

- `README.md`
- `STATUS.md`
- `docs/architecture.md`
- `docs/pricing-engine.md` (new)
- `src/features/analyze-offer/domain/pricing.ts` (new)
- `src/tests/unit/pricing-engine.test.ts` (new)

## Handoff for the next agent

Completed:

- Extraction contract (Phase 2): `OfferExtraction` domain types with evidence, `rawOfferExtractionSchema` + `mapRawExtraction` boundary, extraction prompts, and `AnthropicOfferExtractor` with one bounded structural retry (`createAnthropicOfferExtractor()` is the server-side factory; default model `claude-haiku-4-5`).
- Pricing engine (Phase 3): `computeOfferPricing` in `src/features/analyze-offer/domain/pricing.ts` returns `OfferPricing` with `dueToday`, `firstYear` (total + `ScheduledCharge[]`), `effectiveMonthly`, and machine-readable `assumptions[]`; missing data yields machine-readable `CalculationBlocker`s. Conventions are documented in `docs/pricing-engine.md`.
- 48 deterministic tests pass, including the three hand-verified canonical totals ($155.88, $120.00, $220.89).

Validation:

- `pnpm validate`: passed (typecheck, lint zero-warnings, format, 48 tests, production build).

Important context for Phase 4 (real upload flow and example fixture cache):

- The pipeline to assemble is: validated upload → `ScreenshotInput` → `OfferFactsExtractor.extract()` → `computeOfferPricing()` → presentation model. Both ends already exist and are tested; Phase 4 owns the server route, MIME/size/dimension validation, resize to the 1,568 px long side (`sharp` is already allowed in the pnpm native build policy), and transient handling (never persist or log image bytes).
- Preloaded examples must never call Anthropic: build verified extraction fixtures for Streamly/CloudVault/FitClub+ (the Phase 2 raw fixtures in `src/tests/fixtures/extractions/` are faithful to the SVG text and can seed them) and run them through `computeOfferPricing` at request time or build time.
- `ExtractionOutcome` failure variants (`invalid_output`, `refused`, `rate_limited`, `timeout`, `api_error`) map naturally onto the Phase 1 UI states; blockers/assumptions map onto the partial/ambiguous states, but final result copy is Phase 5's job.
- The first live API call should include a one-time manual confirmation that the pruned structured-output schema is accepted (see Known issues).
- `createAnthropicOfferExtractor()` throws without `ANTHROPIC_API_KEY`; the route must degrade to a clear error state instead of crashing the page.
- `mock-offers.ts` remains presentation-only data.

Next recommended phase:

- Phase 4 — Real upload flow and example fixture cache.

Do not start Phase 4 automatically.

## Deferred ideas

- Phase 7 stretch: Playwright end-to-end critical flow.
- Phase 7 stretch: 15–20 screenshot evaluation set with field-level metrics.
- Bounding boxes and automatic screenshot crops are outside v1.
- Database, authentication, chat, PDFs, multi-image analysis, comparison, and offer scoring are outside the MVP.
