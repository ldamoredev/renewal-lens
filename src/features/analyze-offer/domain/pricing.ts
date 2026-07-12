/**
 * Deterministic pricing engine. Consumes an OfferExtraction and derives
 * every monetary result with integer arithmetic on minor units — the model
 * never calculates anything.
 *
 * Closed first-year convention (docs/architecture.md): first-year cost is
 * the sum of all charges whose charge date falls within the 365 days after
 * signup, assuming signup today.
 *
 * Time is measured internally in twelfth-days so every period converts to
 * an integer without floating point or calendar lookups:
 *   day = 12, week = 84, month = 365 (one twelfth of a 365-day year),
 *   year = 4380. The first-year window is [0, 4380) twelfth-days, so
 *   monthly billing yields at most 12 charges in the first year and an
 *   annual renewal on the 365th day falls outside it.
 *
 * This module is pure domain code. It must not import Next.js, React,
 * Anthropic, Zod, or any infrastructure module.
 */

import type {
  BillingPhase,
  OfferExtraction,
  Period,
} from "@/features/analyze-offer/domain/extraction";

const TWELFTHS_PER_DAY = 12;
const TWELFTHS_PER_UNIT = {
  day: 12,
  week: 84,
  month: 365,
  year: 4380,
} as const;
export const FIRST_YEAR_DAYS = 365;
const FIRST_YEAR_TWELFTHS = FIRST_YEAR_DAYS * TWELFTHS_PER_DAY;
const MONTHS_PER_YEAR = 12;

function periodToTwelfths(period: Period): number {
  return period.value * TWELFTHS_PER_UNIT[period.unit];
}

/** Integer division rounding half up; inputs are non-negative. */
function divideHalfUp(dividend: number, divisor: number): number {
  return Math.floor((dividend + Math.floor(divisor / 2)) / divisor);
}

/**
 * Machine-readable reasons why a value could not be computed. Copy for
 * humans belongs to the presentation layer, never here.
 */
export type CalculationBlocker =
  | { readonly code: "no_pricing_visible" }
  | { readonly code: "price_after_trial_unknown" }
  | { readonly code: "trial_length_unknown"; readonly phaseIndex: number }
  | { readonly code: "phase_length_unknown"; readonly phaseIndex: number }
  | { readonly code: "billing_cadence_unknown"; readonly phaseIndex: number }
  | { readonly code: "phase_price_unknown"; readonly phaseIndex: number }
  | {
      readonly code: "additional_fee_amount_unknown";
      readonly feeIndex: number;
    }
  | { readonly code: "mixed_currencies" };

/** Machine-readable record of every convention the result relies on. */
export type PricingAssumption =
  | { readonly code: "first_year_is_365_days_from_signup_today" }
  | { readonly code: "periods_converted_calendar_free" }
  | {
      readonly code: "effective_monthly_is_first_year_cost_divided_by_12_half_up";
    }
  | { readonly code: "due_today_derived_from_first_phase" }
  | {
      readonly code: "single_charge_assumed_for_phase";
      readonly phaseIndex: number;
    };

export type ScheduledCharge = {
  /** Whole days after signup (twelfth-days floored), signup day = 0. */
  readonly dayOffset: number;
  readonly amountMinorUnits: number;
  readonly currencyCode: string | null;
  readonly phaseIndex: number;
  readonly evidence: string;
};

export type FirstYearComputation =
  | {
      readonly available: true;
      readonly totalMinorUnits: number;
      readonly chargeCount: number;
      readonly charges: readonly ScheduledCharge[];
    }
  | {
      readonly available: false;
      readonly blockers: readonly CalculationBlocker[];
    };

export type EffectiveMonthlyComputation =
  | { readonly available: true; readonly minorUnits: number }
  | {
      readonly available: false;
      readonly blockers: readonly CalculationBlocker[];
    };

export type DueTodayComputation =
  | {
      readonly available: true;
      readonly minorUnits: number;
      readonly currencyCode: string | null;
      readonly source: "extracted" | "derived";
      readonly evidence: string | null;
    }
  | {
      readonly available: false;
      readonly blockers: readonly CalculationBlocker[];
    };

export type OfferPricing = {
  readonly contractVersion: string;
  readonly dueToday: DueTodayComputation;
  readonly firstYear: FirstYearComputation;
  readonly effectiveMonthly: EffectiveMonthlyComputation;
  readonly assumptions: readonly PricingAssumption[];
};

type ScheduleResult = {
  readonly charges: ScheduledCharge[];
  readonly blockers: CalculationBlocker[];
  readonly assumptions: PricingAssumption[];
};

function checkCurrencyConsistency(
  extraction: OfferExtraction,
): CalculationBlocker | null {
  const codes = new Set<string>();
  for (const phase of extraction.billingPhases) {
    if (phase.price?.currencyCode) {
      codes.add(phase.price.currencyCode);
    }
  }
  for (const fee of extraction.additionalFees) {
    if (fee.amount?.currencyCode) {
      codes.add(fee.amount.currencyCode);
    }
  }
  return codes.size > 1 ? { code: "mixed_currencies" } : null;
}

function scheduleFreeTrial(
  phase: BillingPhase,
  phaseIndex: number,
  isLast: boolean,
  cursor: number,
  result: ScheduleResult,
): number | null {
  if (isLast) {
    // The screenshot shows a trial but no paid price after it: the honest
    // answer is that the first-year cost is not visible.
    result.blockers.push({ code: "price_after_trial_unknown" });
    return null;
  }
  if (phase.duration === null) {
    result.blockers.push({ code: "trial_length_unknown", phaseIndex });
    return null;
  }
  return cursor + periodToTwelfths(phase.duration);
}

function schedulePaidPhase(
  phase: BillingPhase,
  phaseIndex: number,
  isLast: boolean,
  cursor: number,
  result: ScheduleResult,
): number | null {
  const price = phase.price;
  if (price === null) {
    result.blockers.push({ code: "phase_price_unknown", phaseIndex });
    return null;
  }
  const phaseEnd =
    phase.duration === null ? null : cursor + periodToTwelfths(phase.duration);

  if (phase.billingPeriod === null) {
    if (phaseEnd === null) {
      result.blockers.push({ code: "billing_cadence_unknown", phaseIndex });
      return null;
    }
    // A bounded phase with a price but no visible cadence (e.g. "first
    // month for $1") is treated as one charge at the phase start.
    if (cursor < FIRST_YEAR_TWELFTHS) {
      result.charges.push(chargeAt(cursor, price, phaseIndex));
    }
    result.assumptions.push({
      code: "single_charge_assumed_for_phase",
      phaseIndex,
    });
    return phaseEnd;
  }

  const step = periodToTwelfths(phase.billingPeriod);
  const limit = Math.min(phaseEnd ?? FIRST_YEAR_TWELFTHS, FIRST_YEAR_TWELFTHS);
  for (let t = cursor; t < limit; t += step) {
    result.charges.push(chargeAt(t, price, phaseIndex));
  }
  if (phaseEnd === null) {
    if (!isLast) {
      // An ongoing phase cannot be followed by another phase; the timeline
      // is contradictory, so later phases cannot be anchored.
      result.blockers.push({ code: "phase_length_unknown", phaseIndex });
      return null;
    }
    return FIRST_YEAR_TWELFTHS;
  }
  return phaseEnd;
}

function chargeAt(
  twelfths: number,
  price: NonNullable<BillingPhase["price"]>,
  phaseIndex: number,
): ScheduledCharge {
  return {
    dayOffset: Math.floor(twelfths / TWELFTHS_PER_DAY),
    amountMinorUnits: price.minorUnits,
    currencyCode: price.currencyCode,
    phaseIndex,
    evidence: price.evidence,
  };
}

function buildSchedule(extraction: OfferExtraction): ScheduleResult {
  const result: ScheduleResult = { charges: [], blockers: [], assumptions: [] };

  if (extraction.billingPhases.length === 0) {
    result.blockers.push({ code: "no_pricing_visible" });
    return result;
  }
  const currencyBlocker = checkCurrencyConsistency(extraction);
  if (currencyBlocker !== null) {
    result.blockers.push(currencyBlocker);
    return result;
  }

  let cursor = 0;
  for (const [index, phase] of extraction.billingPhases.entries()) {
    const isLast = index === extraction.billingPhases.length - 1;
    const next =
      phase.kind === "free_trial"
        ? scheduleFreeTrial(phase, index, isLast, cursor, result)
        : schedulePaidPhase(phase, index, isLast, cursor, result);
    if (next === null) {
      break;
    }
    cursor = next;
    if (cursor >= FIRST_YEAR_TWELFTHS) {
      // Later phases start after the first-year window and cannot affect
      // the result; stop without inspecting them.
      break;
    }
  }

  for (const [feeIndex, fee] of extraction.additionalFees.entries()) {
    if (fee.amount === null) {
      result.blockers.push({
        code: "additional_fee_amount_unknown",
        feeIndex,
      });
      continue;
    }
    const chargeIndex = extraction.billingPhases.length + feeIndex;
    if (fee.billingPeriod === null) {
      result.charges.push(chargeAt(0, fee.amount, chargeIndex));
      continue;
    }
    const step = periodToTwelfths(fee.billingPeriod);
    for (let cursor = 0; cursor < FIRST_YEAR_TWELFTHS; cursor += step) {
      result.charges.push(chargeAt(cursor, fee.amount, chargeIndex));
    }
  }
  return result;
}

function computeDueToday(
  extraction: OfferExtraction,
  assumptions: PricingAssumption[],
): DueTodayComputation {
  if (extraction.dueToday !== null) {
    return {
      available: true,
      minorUnits: extraction.dueToday.minorUnits,
      currencyCode: extraction.dueToday.currencyCode,
      source: "extracted",
      evidence: extraction.dueToday.evidence,
    };
  }
  const first = extraction.billingPhases[0];
  if (first === undefined) {
    return { available: false, blockers: [{ code: "no_pricing_visible" }] };
  }
  if (first.kind === "free_trial") {
    assumptions.push({ code: "due_today_derived_from_first_phase" });
    return {
      available: true,
      minorUnits: 0,
      currencyCode: null,
      source: "derived",
      evidence: first.evidence,
    };
  }
  if (first.price === null) {
    return {
      available: false,
      blockers: [{ code: "phase_price_unknown", phaseIndex: 0 }],
    };
  }
  assumptions.push({ code: "due_today_derived_from_first_phase" });
  return {
    available: true,
    minorUnits: first.price.minorUnits,
    currencyCode: first.price.currencyCode,
    source: "derived",
    evidence: first.price.evidence,
  };
}

export function computeOfferPricing(extraction: OfferExtraction): OfferPricing {
  const assumptions: PricingAssumption[] = [];
  const schedule = buildSchedule(extraction);

  let firstYear: FirstYearComputation;
  let effectiveMonthly: EffectiveMonthlyComputation;

  if (schedule.blockers.length > 0) {
    firstYear = { available: false, blockers: schedule.blockers };
    effectiveMonthly = { available: false, blockers: schedule.blockers };
  } else {
    const totalMinorUnits = schedule.charges.reduce(
      (sum, charge) => sum + charge.amountMinorUnits,
      0,
    );
    firstYear = {
      available: true,
      totalMinorUnits,
      chargeCount: schedule.charges.length,
      charges: schedule.charges,
    };
    effectiveMonthly = {
      available: true,
      minorUnits: divideHalfUp(totalMinorUnits, MONTHS_PER_YEAR),
    };
    assumptions.push(
      { code: "first_year_is_365_days_from_signup_today" },
      { code: "periods_converted_calendar_free" },
      { code: "effective_monthly_is_first_year_cost_divided_by_12_half_up" },
    );
    assumptions.push(...schedule.assumptions);
  }

  const dueToday = computeDueToday(extraction, assumptions);

  return {
    contractVersion: extraction.contractVersion,
    dueToday,
    firstYear,
    effectiveMonthly,
    assumptions,
  };
}
