import { describe, expect, it } from "vitest";

import {
  EXTRACTION_CONTRACT_VERSION,
  type BillingPhase,
  type ExtractedMoney,
  type OfferExtraction,
} from "@/features/analyze-offer/domain/extraction";
import { computeOfferPricing } from "@/features/analyze-offer/domain/pricing";
import {
  mapRawExtraction,
  rawOfferExtractionSchema,
} from "@/features/analyze-offer/schemas/offer-extraction";
import cloudvaultRaw from "@/features/analyze-offer/infrastructure/fixtures/cloudvault-annual.raw.json";
import fitclubRaw from "@/features/analyze-offer/infrastructure/fixtures/fitclub-promo.raw.json";
import streamlyRaw from "@/features/analyze-offer/infrastructure/fixtures/streamly-trial.raw.json";

function extractionFromFixture(fixture: unknown): OfferExtraction {
  const structural = rawOfferExtractionSchema.safeParse(fixture);
  if (!structural.success) {
    throw new Error("fixture is structurally invalid");
  }
  const mapped = mapRawExtraction(structural.data);
  if (!mapped.ok) {
    throw new Error(
      `fixture violates the contract: ${mapped.issues.join("; ")}`,
    );
  }
  return mapped.extraction;
}

function money(
  minorUnits: number,
  currencyCode: string | null = null,
): ExtractedMoney {
  return { minorUnits, currencyCode, evidence: "test evidence" };
}

function extraction(
  phases: readonly BillingPhase[],
  overrides: Partial<OfferExtraction> = {},
): OfferExtraction {
  return {
    contractVersion: EXTRACTION_CONTRACT_VERSION,
    merchant: null,
    currency: { code: null, symbol: "$", evidence: null },
    dueToday: null,
    billingPhases: phases,
    displayedEquivalentPrice: null,
    autoRenewal: { status: "unknown", evidence: null },
    cancellation: null,
    minimumCommitment: null,
    additionalFees: [],
    ambiguities: [],
    ...overrides,
  };
}

function assumptionCodes(pricing: ReturnType<typeof computeOfferPricing>) {
  return pricing.assumptions.map((assumption) => assumption.code);
}

function blockerCodes(computation: {
  available: false;
  blockers: readonly { code: string }[];
}): string[] {
  return computation.blockers.map((blocker) => blocker.code);
}

describe("computeOfferPricing on the three verified examples", () => {
  it("Streamly: 7-day free trial then $12.99/month = $155.88 first year", () => {
    const pricing = computeOfferPricing(extractionFromFixture(streamlyRaw));

    expect(pricing.firstYear).toMatchObject({
      available: true,
      totalMinorUnits: 15588,
      chargeCount: 12,
    });
    if (pricing.firstYear.available) {
      expect(pricing.firstYear.charges[0].dayOffset).toBe(7);
      expect(pricing.firstYear.charges[11].dayOffset).toBe(341);
      expect(
        pricing.firstYear.charges.every((c) => c.amountMinorUnits === 1299),
      ).toBe(true);
    }
    expect(pricing.effectiveMonthly).toEqual({
      available: true,
      minorUnits: 1299,
    });
    // Due today $0.00 is visible on the screenshot, so it is extracted.
    expect(pricing.dueToday).toMatchObject({
      available: true,
      minorUnits: 0,
      source: "extracted",
    });
    expect(assumptionCodes(pricing)).toContain(
      "first_year_is_365_days_from_signup_today",
    );
  });

  it("CloudVault: $120 billed annually = one charge, $120.00 first year", () => {
    const pricing = computeOfferPricing(extractionFromFixture(cloudvaultRaw));

    expect(pricing.firstYear).toMatchObject({
      available: true,
      totalMinorUnits: 12000,
      chargeCount: 1,
    });
    if (pricing.firstYear.available) {
      expect(pricing.firstYear.charges[0].dayOffset).toBe(0);
    }
    expect(pricing.effectiveMonthly).toEqual({
      available: true,
      minorUnits: 1000,
    });
    // No visible due-today amount: derived from the first (annual) phase.
    expect(pricing.dueToday).toMatchObject({
      available: true,
      minorUnits: 12000,
      source: "derived",
    });
    expect(assumptionCodes(pricing)).toContain(
      "due_today_derived_from_first_phase",
    );
  });

  it("FitClub+: $1 first month then $19.99/month = $220.89 first year", () => {
    const pricing = computeOfferPricing(extractionFromFixture(fitclubRaw));

    // Hand-verified: 100 + 11 x 1999 = 22089.
    expect(pricing.firstYear).toMatchObject({
      available: true,
      totalMinorUnits: 22089,
      chargeCount: 12,
    });
    if (pricing.firstYear.available) {
      const promoCharges = pricing.firstYear.charges.filter(
        (c) => c.phaseIndex === 0,
      );
      expect(promoCharges).toHaveLength(1);
      expect(promoCharges[0]).toMatchObject({
        dayOffset: 0,
        amountMinorUnits: 100,
      });
      const regularCharges = pricing.firstYear.charges.filter(
        (c) => c.phaseIndex === 1,
      );
      expect(regularCharges).toHaveLength(11);
      expect(regularCharges[0].dayOffset).toBe(30);
      expect(regularCharges[10].dayOffset).toBe(334);
    }
    // Hand-verified: 22089 / 12 = 1840.75 -> 1841 (half up).
    expect(pricing.effectiveMonthly).toEqual({
      available: true,
      minorUnits: 1841,
    });
    expect(pricing.dueToday).toMatchObject({
      available: true,
      minorUnits: 100,
      source: "extracted",
    });
  });
});

describe("computeOfferPricing boundary cadences", () => {
  it("weekly billing yields 53 charges in the 365-day window", () => {
    const pricing = computeOfferPricing(
      extraction([
        {
          kind: "regular",
          price: money(500),
          billingPeriod: { value: 1, unit: "week" },
          duration: null,
          evidence: "weekly plan",
        },
      ]),
    );
    // Hand-verified: charges on days 0, 7, ..., 364 -> 53 charges x 500.
    expect(pricing.firstYear).toMatchObject({
      available: true,
      totalMinorUnits: 26500,
      chargeCount: 53,
    });
    // 26500 / 12 = 2208.33 -> 2208.
    expect(pricing.effectiveMonthly).toEqual({
      available: true,
      minorUnits: 2208,
    });
  });

  it("quarterly billing yields 4 charges", () => {
    const pricing = computeOfferPricing(
      extraction([
        {
          kind: "regular",
          price: money(2500),
          billingPeriod: { value: 3, unit: "month" },
          duration: null,
          evidence: "quarterly plan",
        },
      ]),
    );
    expect(pricing.firstYear).toMatchObject({
      available: true,
      totalMinorUnits: 10000,
      chargeCount: 4,
    });
  });

  it("the annual renewal on day 365 stays outside the first year", () => {
    const pricing = computeOfferPricing(
      extraction([
        {
          kind: "regular",
          price: money(9999),
          billingPeriod: { value: 1, unit: "year" },
          duration: null,
          evidence: "annual plan",
        },
      ]),
    );
    expect(pricing.firstYear).toMatchObject({
      available: true,
      chargeCount: 1,
    });
  });

  it("rounds an exact half cent up in the effective monthly cost", () => {
    const pricing = computeOfferPricing(
      extraction([
        {
          kind: "regular",
          price: money(18),
          billingPeriod: { value: 1, unit: "year" },
          duration: null,
          evidence: "tiny plan",
        },
      ]),
    );
    // 18 / 12 = 1.5 -> 2 (half up).
    expect(pricing.effectiveMonthly).toEqual({
      available: true,
      minorUnits: 2,
    });
  });

  it("ignores phases that start after the first-year window", () => {
    const pricing = computeOfferPricing(
      extraction([
        {
          kind: "promotional",
          price: money(100),
          billingPeriod: { value: 1, unit: "year" },
          duration: { value: 2, unit: "year" },
          evidence: "two promo years",
        },
        {
          kind: "regular",
          price: money(9900),
          billingPeriod: { value: 1, unit: "year" },
          duration: null,
          evidence: "later regular price",
        },
      ]),
    );
    // Hand-verified: the promo phase charges annually on day 0 and day 365;
    // day 365 is outside the [0, 365) window, so only the day-0 charge
    // counts, and the regular phase (starting in year 3) is never reached.
    expect(pricing.firstYear).toMatchObject({
      available: true,
      totalMinorUnits: 100,
      chargeCount: 1,
    });
  });
});

describe("computeOfferPricing abstention", () => {
  it("reports no_pricing_visible when there are no phases", () => {
    const pricing = computeOfferPricing(extraction([]));
    expect(pricing.firstYear.available).toBe(false);
    if (!pricing.firstYear.available) {
      expect(blockerCodes(pricing.firstYear)).toEqual(["no_pricing_visible"]);
    }
    expect(pricing.effectiveMonthly.available).toBe(false);
    expect(pricing.dueToday.available).toBe(false);
  });

  it("abstains when a trial has no visible paid price after it", () => {
    const pricing = computeOfferPricing(
      extraction([
        {
          kind: "free_trial",
          price: null,
          billingPeriod: null,
          duration: { value: 7, unit: "day" },
          evidence: "7-day trial",
        },
      ]),
    );
    expect(pricing.firstYear.available).toBe(false);
    if (!pricing.firstYear.available) {
      expect(blockerCodes(pricing.firstYear)).toEqual([
        "price_after_trial_unknown",
      ]);
    }
    // Due today is still safely derivable: the first phase is free.
    expect(pricing.dueToday).toMatchObject({
      available: true,
      minorUnits: 0,
      source: "derived",
    });
  });

  it("abstains when the trial length is not visible", () => {
    const pricing = computeOfferPricing(
      extraction([
        {
          kind: "free_trial",
          price: null,
          billingPeriod: null,
          duration: null,
          evidence: "free trial",
        },
        {
          kind: "regular",
          price: money(1299),
          billingPeriod: { value: 1, unit: "month" },
          duration: null,
          evidence: "$12.99 / month",
        },
      ]),
    );
    expect(pricing.firstYear.available).toBe(false);
    if (!pricing.firstYear.available) {
      expect(blockerCodes(pricing.firstYear)).toEqual(["trial_length_unknown"]);
    }
  });

  it("abstains when the billing cadence is not visible", () => {
    const pricing = computeOfferPricing(
      extraction([
        {
          kind: "regular",
          price: money(4900),
          billingPeriod: null,
          duration: null,
          evidence: "$49",
        },
      ]),
    );
    expect(pricing.firstYear.available).toBe(false);
    if (!pricing.firstYear.available) {
      expect(blockerCodes(pricing.firstYear)).toEqual([
        "billing_cadence_unknown",
      ]);
    }
    // Due today can still be derived from the visible first-phase price.
    expect(pricing.dueToday).toMatchObject({
      available: true,
      minorUnits: 4900,
      source: "derived",
    });
  });

  it("abstains when an ongoing phase is followed by another phase", () => {
    const pricing = computeOfferPricing(
      extraction([
        {
          kind: "promotional",
          price: money(100),
          billingPeriod: { value: 1, unit: "month" },
          duration: null,
          evidence: "$1 intro",
        },
        {
          kind: "regular",
          price: money(1999),
          billingPeriod: { value: 1, unit: "month" },
          duration: null,
          evidence: "$19.99 / month",
        },
      ]),
    );
    expect(pricing.firstYear.available).toBe(false);
    if (!pricing.firstYear.available) {
      expect(blockerCodes(pricing.firstYear)).toEqual(["phase_length_unknown"]);
    }
  });

  it("abstains when phases mix currencies", () => {
    const pricing = computeOfferPricing(
      extraction([
        {
          kind: "promotional",
          price: money(100, "USD"),
          billingPeriod: { value: 1, unit: "month" },
          duration: { value: 1, unit: "month" },
          evidence: "$1 intro",
        },
        {
          kind: "regular",
          price: money(1999, "EUR"),
          billingPeriod: { value: 1, unit: "month" },
          duration: null,
          evidence: "19,99 EUR / month",
        },
      ]),
    );
    expect(pricing.firstYear.available).toBe(false);
    if (!pricing.firstYear.available) {
      expect(blockerCodes(pricing.firstYear)).toEqual(["mixed_currencies"]);
    }
  });
});

describe("computeOfferPricing single-charge phases", () => {
  it("treats a bounded phase without cadence as one charge and records it", () => {
    const pricing = computeOfferPricing(
      extraction([
        {
          kind: "promotional",
          price: money(100),
          billingPeriod: null,
          duration: { value: 1, unit: "month" },
          evidence: "first month $1",
        },
        {
          kind: "regular",
          price: money(1999),
          billingPeriod: { value: 1, unit: "month" },
          duration: null,
          evidence: "$19.99 / month",
        },
      ]),
    );
    // Same shape as FitClub+ when the intro cadence is not spelled out:
    // 100 + 11 x 1999 = 22089.
    expect(pricing.firstYear).toMatchObject({
      available: true,
      totalMinorUnits: 22089,
      chargeCount: 12,
    });
    expect(assumptionCodes(pricing)).toContain(
      "single_charge_assumed_for_phase",
    );
  });
});

describe("computeOfferPricing additional fees", () => {
  const monthlyPlan: BillingPhase = {
    kind: "regular",
    price: money(1000),
    billingPeriod: { value: 1, unit: "month" },
    duration: null,
    evidence: "$10 / month",
  };

  it("adds a visible one-time fee to the first-year total", () => {
    const pricing = computeOfferPricing(
      extraction([monthlyPlan], {
        additionalFees: [
          {
            label: "Setup fee",
            amount: money(999),
            billingPeriod: null,
            evidence: "$9.99 setup fee",
          },
        ],
      }),
    );

    // 12 x $10 + $9.99 = $129.99.
    expect(pricing.firstYear).toMatchObject({
      available: true,
      totalMinorUnits: 12999,
      chargeCount: 13,
    });
  });

  it("adds recurring fees at their visible cadence", () => {
    const pricing = computeOfferPricing(
      extraction([monthlyPlan], {
        additionalFees: [
          {
            label: "Service fee",
            amount: money(100),
            billingPeriod: { value: 1, unit: "month" },
            evidence: "$1 monthly service fee",
          },
        ],
      }),
    );

    // 12 x $10 + 12 x $1 = $132.
    expect(pricing.firstYear).toMatchObject({
      available: true,
      totalMinorUnits: 13200,
      chargeCount: 24,
    });
  });

  it("abstains when a visible fee has no amount", () => {
    const pricing = computeOfferPricing(
      extraction([monthlyPlan], {
        additionalFees: [
          {
            label: "Taxes",
            amount: null,
            billingPeriod: null,
            evidence: "Taxes apply",
          },
        ],
      }),
    );

    expect(pricing.firstYear.available).toBe(false);
    if (!pricing.firstYear.available) {
      expect(blockerCodes(pricing.firstYear)).toContain(
        "additional_fee_amount_unknown",
      );
    }
  });
});

describe("computeOfferPricing metadata", () => {
  it("echoes the contract version and never uses the equivalent price", () => {
    const withEquivalent = extraction(
      [
        {
          kind: "regular",
          price: money(12000),
          billingPeriod: { value: 1, unit: "year" },
          duration: null,
          evidence: "$120 billed annually",
        },
      ],
      {
        displayedEquivalentPrice: {
          amount: money(1000),
          period: { value: 1, unit: "month" },
        },
      },
    );
    const pricing = computeOfferPricing(withEquivalent);
    expect(pricing.contractVersion).toBe(EXTRACTION_CONTRACT_VERSION);
    // First-year math comes from the annual charge, not from 12 x $10.
    expect(pricing.firstYear).toMatchObject({
      available: true,
      totalMinorUnits: 12000,
      chargeCount: 1,
    });
  });

  it("records the closed convention only when a total was computed", () => {
    const unavailable = computeOfferPricing(extraction([]));
    expect(assumptionCodes(unavailable)).not.toContain(
      "first_year_is_365_days_from_signup_today",
    );
  });
});
