/**
 * Extraction contract: the structured facts the multimodal model may read
 * from one screenshot. Every monetary amount is stored as integer minor
 * units (scale 2). Absence is explicit: `null` means the fact was not
 * visible in the screenshot, never "assume a default".
 *
 * This module is pure domain code. It must not import Next.js, React,
 * Anthropic, Zod, or any infrastructure module.
 */

export const EXTRACTION_CONTRACT_VERSION = "2026-07-12.1";

/** Fixed decimal scale for monetary minor units in the MVP. */
export const MONEY_SCALE = 2;

export type PeriodUnit = "day" | "week" | "month" | "year";

/** A count of period units, e.g. { value: 7, unit: "day" }. */
export type Period = {
  readonly value: number;
  readonly unit: PeriodUnit;
};

/**
 * A monetary amount read from the screenshot.
 * `currencyCode` is an ISO 4217 code only when the code itself is visible
 * or the symbol is unambiguous; a bare "$" never implies USD and yields
 * `null` with the symbol preserved separately on `CurrencyObservation`.
 */
export type ExtractedMoney = {
  /** Integer amount in minor units at MONEY_SCALE (e.g. 1299 for 12.99). */
  readonly minorUnits: number;
  readonly currencyCode: string | null;
  /** Verbatim text from the screenshot supporting this amount. */
  readonly evidence: string;
};

export type CurrencyObservation = {
  readonly code: string | null;
  readonly symbol: string | null;
  readonly evidence: string | null;
};

export type BillingPhaseKind = "free_trial" | "promotional" | "regular";

/**
 * One stage of the offer's billing timeline, in chronological order.
 * - `price` is null only for a free phase (free trial).
 * - `billingPeriod` is how often the phase price is charged; null when the
 *   phase involves no recurring charge or the cadence is not visible.
 * - `duration` is how long the phase lasts; null means ongoing until
 *   cancelled (or not visible).
 */
export type BillingPhase = {
  readonly kind: BillingPhaseKind;
  readonly price: ExtractedMoney | null;
  readonly billingPeriod: Period | null;
  readonly duration: Period | null;
  readonly evidence: string;
};

/**
 * An advertised per-period equivalent that is not the actual charge,
 * e.g. "$10 / month" displayed for a plan billed 120 annually.
 * Kept strictly separate from `dueToday` and phase prices.
 */
export type DisplayedEquivalentPrice = {
  readonly amount: ExtractedMoney;
  readonly period: Period;
};

export type AutoRenewalStatus = "yes" | "no" | "unknown";

export type AutoRenewalObservation = {
  readonly status: AutoRenewalStatus;
  readonly evidence: string | null;
};

export type CancellationObservation = {
  readonly text: string;
  readonly evidence: string;
};

export type MerchantObservation = {
  readonly name: string;
  readonly evidence: string;
};

/** The full set of facts extracted from one screenshot. */
export type OfferExtraction = {
  readonly contractVersion: string;
  readonly merchant: MerchantObservation | null;
  readonly currency: CurrencyObservation;
  /** Amount explicitly presented as payable now, when visible. */
  readonly dueToday: ExtractedMoney | null;
  /** Chronological billing stages; empty when no pricing is legible. */
  readonly billingPhases: readonly BillingPhase[];
  readonly displayedEquivalentPrice: DisplayedEquivalentPrice | null;
  readonly autoRenewal: AutoRenewalObservation;
  readonly cancellation: CancellationObservation | null;
  /** Model-reported ambiguities, verbatim and short (may be empty). */
  readonly ambiguities: readonly string[];
};
