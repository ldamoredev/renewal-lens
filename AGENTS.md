# RenewalLens Agent Guide

`STATUS.md` is the source of truth for the current project state. Read it before planning or changing anything.

## Product vision

RenewalLens turns a screenshot of a subscription, trial, checkout, or promotional plan into an evidence-backed explanation of its visible billing structure. Multimodal AI extracts structured facts; deterministic TypeScript calculates monetary results. Missing or ambiguous information must remain visibly missing or ambiguous. The product never judges an offer, gives legal or financial advice, or invents terms.

## Required startup protocol

1. Read this file and `STATUS.md` in full. Claude Code must also read `CLAUDE.md`.
2. Inspect the existing code, tests, working tree, decisions, blockers, and validation evidence before editing.
3. Confirm the active phase in `STATUS.md`. Work exclusively on that phase.
4. If the phase is `NOT_STARTED`, mark it `IN_PROGRESS`, name the agent, and record its concrete objective before implementation.
5. Never begin a phase that is not active. When the active phase is completed, update the handoff and stop.

## Stack

- TypeScript with strict mode
- Next.js App Router and React
- Tailwind CSS
- Zod at external boundaries
- Anthropic multimodal API, server-side only (Phase 2)
- Vitest for domain and integration tests
- pnpm as the package manager
- Railway deployment with one persistent Node process
- No database, authentication, or image persistence in the MVP

## Commands

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm validate
```

`pnpm validate` is the full local quality gate. Add focused test commands when later phases introduce test suites. Never hide or omit a failing command from the handoff.

## Repository structure

```text
src/app/                           Next.js routes, layouts, and server endpoints
src/components/                    Reusable presentation components
src/features/analyze-offer/
  application/                     Use cases and orchestration
  domain/                          Pure extraction types and pricing calculations
  infrastructure/                  Anthropic and other external adapters
  schemas/                         Zod schemas for untrusted data
src/lib/                           Cross-cutting infrastructure helpers
src/tests/fixtures/                Versioned extraction and scenario fixtures
src/tests/unit/                    Pure domain and schema tests
src/tests/integration/             Application boundary tests
docs/                              Architecture and operational decisions
```

Add narrower component folders as the UI grows. Preserve the conceptual flow: UI → application use case → AI adapter → validated extraction → deterministic pricing engine → presentation model.

## Architecture rules

- AI performs probabilistic extraction only. TypeScript performs every derived monetary calculation.
- The pricing engine is pure and must not import Next.js, React, Anthropic, or infrastructure modules.
- Use integer minor units for money. Never use floating point for monetary arithmetic.
- Keep `displayedEquivalentPrice` distinct from `initialCharge` and actual billing frequency.
- Every extracted fact should carry textual evidence when visible.
- Use `null`, `unknown`, explicit ambiguities, and partial states instead of assumptions.
- A bare `$` does not imply USD.
- Do not place financial logic in React components or presentation logic in prompts.
- Preloaded examples always use verified, versioned fixtures; they never call Anthropic live.
- Uploaded screenshots are processed transiently and never persisted.
- Railway is the closed deployment decision: one Node process makes in-memory per-IP rate limiting consistent. Do not reopen it without a documented technical reason.
- Do not add a database, auth, chat, PDFs, multi-image analysis, offer comparison, or scoring to the MVP.

## TypeScript conventions

- Keep strict mode enabled; avoid `any` and unsafe casts.
- Prefer small functions, explicit domain types, discriminated unions, and immutable inputs.
- Validate all external input with Zod before it enters the domain.
- Keep imports directional; domain modules cannot depend on application, infrastructure, or UI modules.
- Use descriptive names and represent absence explicitly.

## Test policy

- Add or update tests in the same phase as behavior.
- Domain calculations require hand-verified expected values and boundary cases.
- Test abstention, missing evidence, ambiguity, localized money formats, and invalid external data—not only happy paths.
- Tests must be deterministic and must not call paid or live APIs.
- Run focused tests during development and the full phase-relevant quality gate before completion.
- Playwright and the extended evaluation set are stretch goals only after the base product is complete.

## Security and privacy

- Never commit secrets or expose `ANTHROPIC_API_KEY` to client code.
- Never log, cache, or persist uploaded image content.
- Validate MIME type, size, dimensions, request shape, and model output at server boundaries.
- Logs may contain operational metadata but not screenshots, extracted sensitive text, credentials, or full model payloads.
- Keep timeouts, request limits, a single controlled extraction retry, and explicit error states.
- Never send preloaded examples to the live API.

## Documentation policy

- Keep `README.md`, `AGENTS.md`, `CLAUDE.md`, `STATUS.md`, and relevant `docs/` files aligned with reality.
- Product, README, architecture docs, and Contra copy are English. The Phase 8 LinkedIn draft is Spanish.
- Record important decisions, changed assumptions, deferred scope, and known debt in `STATUS.md` and the relevant design document.
- Do not claim commands, tests, metrics, or manual checks that were not actually run.

## Definition of a completed phase

A phase is complete only when all scoped acceptance criteria are met, the main affected flow works, required documentation exists, relevant tests pass, TypeScript and lint have no errors, validation evidence is recorded, and no known blocker invalidates the objective. Otherwise leave it `IN_PROGRESS` or mark it `BLOCKED` with a precise reason.

## Status update and handoff

Before ending a phase:

1. Run typecheck, lint, relevant tests, a production build, and an appropriate manual check.
2. Mark the phase accurately in the roadmap.
3. Update completed work, remaining work, decisions, issues, blockers, and deferred ideas.
4. List files changed and exact commands with their outcomes.
5. Write a concrete handoff: what is complete, what matters, known issues, and the next recommended phase.
6. Identify the next phase but leave it `NOT_STARTED`; do not implement any part of it.
7. Stop.
