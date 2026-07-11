# RenewalLens

RenewalLens is a public multimodal AI web application that explains the billing structure visible in a subscription, free-trial, checkout, or promotional pricing screenshot.

The central design rule is simple: **AI interprets the offer; code calculates the cost.** Anthropic extracts structured, evidence-backed facts from visible text. A pure TypeScript domain module will calculate first-year cost, effective monthly cost, charge count, and timing without asking the model to do arithmetic.

The project is being built in nine deliberately bounded phases over a two-day MVP schedule. The active phase and reproducible handoff live in [`STATUS.md`](./STATUS.md).

## Current state

Phases 0 and 1 are complete. The responsive product experience, fictional example screenshots, mock analysis flow, uncertainty states, and visual system are ready. Phase 2 — the Anthropic extraction contract — is recommended next but remains unstarted. The current interface uses presentation fixtures only; no live model call or pricing engine exists yet.

The three built-in examples are fictional and deterministic:

- Streamly: a seven-day free trial followed by monthly billing.
- CloudVault: a monthly equivalent displayed for an annual charge.
- FitClub+: a one-dollar first month followed by a higher monthly price.

## Local development

Requirements: Node.js 20.9 or newer and pnpm 11.12.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

Run the complete gate with `pnpm validate`.

## Architecture

```text
UI
↓
Application use case
↓
AI extraction adapter
↓
Zod-validated domain extraction
↓
Deterministic pricing engine
↓
Presentation model
```

Money uses integer minor units. Missing information remains absent, ambiguous evidence remains ambiguous, and extracted facts retain textual evidence wherever possible. Preloaded examples use verified local fixtures and never make live API calls.

See [`docs/architecture.md`](./docs/architecture.md) for boundaries, deployment decisions, privacy constraints, and the first-year cost convention reserved for Phase 3.

## Deployment direction

Railway is the decided production target. RenewalLens will run as one persistent Node process so in-memory per-IP rate limiting is meaningful without introducing a database. Railway supplies `PORT` at runtime. Deployment itself belongs to Phase 8.

## Scope

The MVP has no accounts, database, chat, persistent screenshot storage, legal advice, offer scoring, comparison workflow, or purchase recommendation.

## Agent workflow

Read [`AGENTS.md`](./AGENTS.md) and [`STATUS.md`](./STATUS.md) before changing the repository. Work only on the active phase and do not start the next phase automatically.
