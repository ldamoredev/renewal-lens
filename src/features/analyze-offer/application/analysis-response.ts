import { z } from "zod";

import type {
  BillingPhase,
  OfferExtraction,
  Period,
} from "@/features/analyze-offer/domain/extraction";
import {
  computeOfferPricing,
  type CalculationBlocker,
  type PricingAssumption,
} from "@/features/analyze-offer/domain/pricing";

export const presentationFactSchema = z.object({
  label: z.string(),
  value: z.string(),
  status: z.enum(["visible", "derived", "calculated", "not_visible"]),
  evidence: z.array(z.string()),
});

export type PresentationFact = z.infer<typeof presentationFactSchema>;

export const pricingResultOfferSchema = z.object({
  merchant: z.string(),
  timeline: z.array(presentationFactSchema),
  firstYearCost: presentationFactSchema,
  details: z.array(presentationFactSchema),
  missingInformation: z.array(z.string()),
  ambiguities: z.array(z.string()),
  assumptions: z.array(z.string()),
});

export type PricingResultOffer = z.infer<typeof pricingResultOfferSchema>;

export const analysisApiResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    state: z.enum(["success", "partial", "ambiguous", "insufficient"]),
    offer: pricingResultOfferSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.enum([
      "invalid_file",
      "file_too_large",
      "unsupported_image",
      "analysis_inconclusive",
      "rate_limited",
      "timeout",
      "service_unavailable",
    ]),
  }),
]);

export type AnalysisApiResponse = z.infer<typeof analysisApiResponseSchema>;

function formatDuration(period: Period): string {
  const unit = period.value === 1 ? period.unit : `${period.unit}s`;
  return `${period.value} ${unit}`;
}

function cadenceText(period: Period | null): string {
  if (period === null) return "Frequency not visible";
  if (period.value === 1) return period.unit;
  return `every ${formatDuration(period)}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatMoney(
  minorUnits: number,
  currencyCode: string | null,
  symbol: string | null,
): string {
  if (currencyCode !== null) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
      }).format(minorUnits / 100);
    } catch {
      // Preserve the visible numeric amount if an unexpected code passes.
    }
  }
  const amount = `${Math.floor(minorUnits / 100)}.${String(minorUnits % 100).padStart(2, "0")}`;
  return `${symbol ?? ""}${amount}${symbol === null ? " · currency unclear" : ""}`;
}

function uniqueEvidence(entries: readonly (string | null)[]): string[] {
  return Array.from(
    new Set(entries.filter((entry): entry is string => Boolean(entry))),
  );
}

function phaseFact(
  phase: BillingPhase,
  index: number,
  extraction: OfferExtraction,
): PresentationFact {
  const symbol = extraction.currency.symbol;
  if (phase.kind === "free_trial") {
    return {
      label: index === 0 ? "Free trial" : "Free period",
      value:
        phase.duration === null
          ? "Duration not visible"
          : formatDuration(phase.duration),
      status: phase.duration === null ? "not_visible" : "visible",
      evidence: [phase.evidence],
    };
  }

  const amount = phase.price
    ? formatMoney(phase.price.minorUnits, phase.price.currencyCode, symbol)
    : "Price not visible";
  const cadence = phase.billingPeriod
    ? ` / ${cadenceText(phase.billingPeriod)}`
    : "";
  const duration =
    phase.kind === "promotional" && phase.duration !== null
      ? ` for ${formatDuration(phase.duration)}`
      : "";
  return {
    label: phase.kind === "promotional" ? "Promotional price" : "Regular price",
    value: `${amount}${cadence}${duration}`,
    status: phase.price === null ? "not_visible" : "visible",
    evidence: uniqueEvidence([phase.price?.evidence ?? null, phase.evidence]),
  };
}

function blockerText(blocker: CalculationBlocker): string {
  switch (blocker.code) {
    case "no_pricing_visible":
      return "No legible pricing was found in the screenshot.";
    case "price_after_trial_unknown":
      return "The price charged after the trial is not visible.";
    case "trial_length_unknown":
      return "The trial duration is not visible.";
    case "phase_length_unknown":
      return "The duration of a billing phase is not visible.";
    case "billing_cadence_unknown":
      return "The actual billing frequency is not visible.";
    case "phase_price_unknown":
      return "A required billing price is not visible.";
    case "additional_fee_amount_unknown":
      return "An additional fee is visible, but its amount is not.";
    case "mixed_currencies":
      return "The screenshot contains charges in more than one currency.";
  }
}

function assumptionText(assumption: PricingAssumption): string {
  switch (assumption.code) {
    case "first_year_is_365_days_from_signup_today":
      return "First-year cost includes charges within 365 days of signup.";
    case "periods_converted_calendar_free":
      return "Billing periods use the documented calendar-free convention.";
    case "effective_monthly_is_first_year_cost_divided_by_12_half_up":
      return "Effective monthly cost is the first-year total divided by 12.";
    case "due_today_derived_from_first_phase":
      return "Due today was derived from the first visible billing phase.";
    case "single_charge_assumed_for_phase":
      return "A bounded price with no visible cadence was counted once.";
  }
}

function visibleOrMissing(
  label: string,
  value: string | null,
  evidence: string | null,
): PresentationFact {
  return {
    label,
    value: value ?? "Not visible",
    status: value === null ? "not_visible" : "visible",
    evidence: evidence === null ? [] : [evidence],
  };
}

export function presentAnalysis(
  extraction: OfferExtraction,
): AnalysisApiResponse {
  const pricing = computeOfferPricing(extraction);
  const symbol = extraction.currency.symbol;
  const recurringPhase = extraction.billingPhases.at(-1);
  const timeline: PresentationFact[] = [
    pricing.dueToday.available
      ? {
          label: "Today",
          value: formatMoney(
            pricing.dueToday.minorUnits,
            pricing.dueToday.currencyCode,
            symbol,
          ),
          status: pricing.dueToday.source === "derived" ? "derived" : "visible",
          evidence: pricing.dueToday.evidence
            ? [pricing.dueToday.evidence]
            : [],
        }
      : {
          label: "Today",
          value: "Not available",
          status: "not_visible",
          evidence: [],
        },
    ...extraction.billingPhases.map((phase, index) =>
      phaseFact(phase, index, extraction),
    ),
  ];

  const firstYearCost: PresentationFact = pricing.firstYear.available
    ? {
        label: "Estimated first-year cost",
        value: formatMoney(
          pricing.firstYear.totalMinorUnits,
          recurringPhase?.price?.currencyCode ?? null,
          symbol,
        ),
        status: "calculated",
        evidence: uniqueEvidence(
          pricing.firstYear.charges.map((charge) => charge.evidence),
        ),
      }
    : {
        label: "Estimated first-year cost",
        value: "Not available",
        status: "not_visible",
        evidence: [],
      };

  const details: PresentationFact[] = [];
  if (extraction.displayedEquivalentPrice !== null) {
    details.push({
      label: "Displayed equivalent",
      value: `${formatMoney(
        extraction.displayedEquivalentPrice.amount.minorUnits,
        extraction.displayedEquivalentPrice.amount.currencyCode,
        symbol,
      )} / ${cadenceText(extraction.displayedEquivalentPrice.period)}`,
      status: "visible",
      evidence: [extraction.displayedEquivalentPrice.amount.evidence],
    });
  }
  details.push(
    visibleOrMissing(
      "Actual billing",
      recurringPhase?.billingPeriod
        ? capitalize(cadenceText(recurringPhase.billingPeriod))
        : null,
      recurringPhase?.evidence ?? null,
    ),
    pricing.effectiveMonthly.available
      ? {
          label: "Effective monthly",
          value: formatMoney(
            pricing.effectiveMonthly.minorUnits,
            recurringPhase?.price?.currencyCode ?? null,
            symbol,
          ),
          status: "calculated",
          evidence: firstYearCost.evidence,
        }
      : {
          label: "Effective monthly",
          value: "Not available",
          status: "not_visible",
          evidence: [],
        },
    visibleOrMissing(
      "Auto-renewal",
      extraction.autoRenewal.status === "unknown"
        ? null
        : capitalize(extraction.autoRenewal.status),
      extraction.autoRenewal.evidence,
    ),
    visibleOrMissing(
      "Minimum commitment",
      extraction.minimumCommitment === null
        ? null
        : `${extraction.minimumCommitment.months} ${
            extraction.minimumCommitment.months === 1 ? "month" : "months"
          }`,
      extraction.minimumCommitment?.evidence ?? null,
    ),
    visibleOrMissing(
      "Cancellation",
      extraction.cancellation?.text ?? null,
      extraction.cancellation?.evidence ?? null,
    ),
  );

  if (extraction.additionalFees.length === 0) {
    details.push(visibleOrMissing("Additional fees", null, null));
  } else {
    for (const fee of extraction.additionalFees) {
      const amount =
        fee.amount === null
          ? "Amount not visible"
          : formatMoney(fee.amount.minorUnits, fee.amount.currencyCode, symbol);
      details.push({
        label: `Additional fee · ${fee.label}`,
        value: fee.billingPeriod
          ? `${amount} / ${cadenceText(fee.billingPeriod)}`
          : amount,
        status: fee.amount === null ? "not_visible" : "visible",
        evidence: [fee.evidence],
      });
    }
  }

  const missingInformation = !pricing.firstYear.available
    ? pricing.firstYear.blockers.map(blockerText)
    : [];
  missingInformation.push(
    ...details
      .filter((fact) => fact.status === "not_visible")
      .map((fact) => `${fact.label} is not visible.`),
  );
  if (extraction.currency.code === null) {
    missingInformation.push(
      extraction.currency.symbol === "$"
        ? "The currency code is not visible; $ is not assumed to mean USD."
        : "The currency code is not visible.",
    );
  }
  const state =
    extraction.billingPhases.length === 0
      ? "insufficient"
      : extraction.ambiguities.length > 0
        ? "ambiguous"
        : pricing.firstYear.available
          ? "success"
          : "partial";

  return {
    ok: true,
    state,
    offer: {
      merchant: extraction.merchant?.name ?? "Offer",
      timeline,
      firstYearCost:
        state === "ambiguous"
          ? {
              ...firstYearCost,
              value: "Not confirmed",
              status: "not_visible",
            }
          : firstYearCost,
      details:
        state === "ambiguous"
          ? details.map((fact) =>
              fact.status === "calculated"
                ? { ...fact, value: "Not confirmed", status: "not_visible" }
                : fact,
            )
          : details,
      missingInformation: Array.from(new Set(missingInformation)),
      ambiguities: [...extraction.ambiguities],
      assumptions: pricing.assumptions.map(assumptionText),
    },
  };
}
