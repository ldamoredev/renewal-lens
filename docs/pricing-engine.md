# Deterministic Pricing Engine (Phase 3)

`computeOfferPricing` (`src/features/analyze-offer/domain/pricing.ts`) turns
an `OfferExtraction` into monetary results using integer arithmetic on minor
units only. It is pure domain code with no Next.js, React, Anthropic, Zod, or
infrastructure imports, and it never reads `displayedEquivalentPrice` for
math — the advertised equivalent is display-only context.

## First-year convention

The closed product decision from `docs/architecture.md`:

> First-year cost is the sum of all charges whose charge date falls within
> the 365 days after signup, assuming signup today.

Applied deterministically without calendar lookups by measuring time in
**twelfth-days** (integers): day = 12, week = 84, month = 365 (one twelfth of
a 365-day year), year = 4380. The first-year window is `[0, 4380)`
twelfth-days, so:

- Monthly billing yields at most 12 charges in the first year. A 7-day trial
  followed by monthly billing yields 12 charges (Streamly: 12 × $12.99 =
  $155.88).
- A $1 first month followed by $19.99/month yields 1 + 11 charges (FitClub+:
  $220.89) because the 12th regular charge lands exactly on day 365.
- An annual plan charges once; its renewal on day 365 falls outside the
  window (CloudVault: $120.00).

Charge timing is exposed as whole `dayOffset` values (twelfth-days floored).

## Outputs

`OfferPricing` carries four independent computations plus assumptions:

- `dueToday` — the extracted due-today amount when visible; otherwise
  derived from the first phase ($0 for a leading free trial, the phase price
  for a leading paid phase) and marked `source: "derived"`.
- `firstYear` — total minor units, charge count, and the full schedule of
  `ScheduledCharge`s (day offset, amount, currency, phase index, evidence).
- `effectiveMonthly` — first-year total divided by 12, rounded half up on
  minor units.
- `assumptions[]` — machine-readable codes recording every convention used:
  the 365-day convention, calendar-free period conversion, the half-up
  division, derived due-today, and single-charge phase interpretations.
  Presentation copy for these codes belongs to Phase 5 components.

## Abstention instead of guessing

Missing or contradictory data produces machine-readable
`CalculationBlocker`s, never estimates:

| Blocker                     | Trigger                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `no_pricing_visible`        | No billing phases were extracted.                                                   |
| `price_after_trial_unknown` | The last visible phase is a free trial (no paid price on screen).                   |
| `trial_length_unknown`      | A non-final trial has no visible duration, so later phases cannot be anchored.      |
| `phase_length_unknown`      | An ongoing phase is followed by another phase (contradictory timeline).             |
| `billing_cadence_unknown`   | A paid phase has neither cadence nor duration.                                      |
| `phase_price_unknown`       | A paid phase carries no price (defensive; the schema mapper normally rejects this). |
| `mixed_currencies`          | Phases carry different explicit ISO currency codes.                                 |

A bounded paid phase with a price but no visible cadence ("first month $1")
is treated as one charge at the phase start and recorded in `assumptions[]`
rather than blocking.

`dueToday` can remain available while `firstYear` is blocked (e.g. a visible
price with unknown cadence), which lets the UI show honest partial results.

## Rounding

The only division in the engine is the effective-monthly computation:
`floor((total + 6) / 12)` — round half up on minor units. Hand-verified:
$220.89 / 12 = 1840.75 → $18.41.
