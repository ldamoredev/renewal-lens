import { describe, expect, it } from "vitest";

import { EXTRACTION_CONTRACT_VERSION } from "@/features/analyze-offer/domain/extraction";
import {
  mapRawExtraction,
  parseDecimalToMinorUnits,
  rawOfferExtractionSchema,
  type RawOfferExtraction,
} from "@/features/analyze-offer/schemas/offer-extraction";
import cloudvaultRaw from "@/features/analyze-offer/infrastructure/fixtures/cloudvault-annual.raw.json";
import fitclubRaw from "@/features/analyze-offer/infrastructure/fixtures/fitclub-promo.raw.json";
import streamlyRaw from "@/features/analyze-offer/infrastructure/fixtures/streamly-trial.raw.json";

function parseFixture(fixture: unknown): RawOfferExtraction {
  const result = rawOfferExtractionSchema.safeParse(fixture);
  expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  if (!result.success) {
    throw new Error("unreachable");
  }
  return result.data;
}

function mapFixtureOrFail(fixture: unknown) {
  const mapped = mapRawExtraction(parseFixture(fixture));
  expect(mapped.ok, mapped.ok ? "" : mapped.issues.join("; ")).toBe(true);
  if (!mapped.ok) {
    throw new Error("unreachable");
  }
  return mapped.extraction;
}

describe("parseDecimalToMinorUnits", () => {
  it("converts hand-verified decimal strings to integer minor units", () => {
    expect(parseDecimalToMinorUnits("12.99")).toBe(1299);
    expect(parseDecimalToMinorUnits("120")).toBe(12000);
    expect(parseDecimalToMinorUnits("0.00")).toBe(0);
    expect(parseDecimalToMinorUnits("0.5")).toBe(50);
    expect(parseDecimalToMinorUnits("1234.56")).toBe(123456);
    expect(parseDecimalToMinorUnits("19.99")).toBe(1999);
  });

  it("rejects localized, signed, grouped, or over-precise formats", () => {
    expect(parseDecimalToMinorUnits("12,99")).toBeNull();
    expect(parseDecimalToMinorUnits("$12.99")).toBeNull();
    expect(parseDecimalToMinorUnits("-5")).toBeNull();
    expect(parseDecimalToMinorUnits("12.999")).toBeNull();
    expect(parseDecimalToMinorUnits("1,234.56")).toBeNull();
    expect(parseDecimalToMinorUnits("")).toBeNull();
    expect(parseDecimalToMinorUnits(".99")).toBeNull();
  });
});

describe("extraction fixtures", () => {
  it("maps the Streamly free-trial fixture with a zero due-today charge", () => {
    const extraction = mapFixtureOrFail(streamlyRaw);
    expect(extraction.contractVersion).toBe(EXTRACTION_CONTRACT_VERSION);
    expect(extraction.dueToday?.minorUnits).toBe(0);
    expect(extraction.billingPhases).toHaveLength(2);
    expect(extraction.billingPhases[0]).toMatchObject({
      kind: "free_trial",
      price: null,
      duration: { value: 7, unit: "day" },
    });
    expect(extraction.billingPhases[1].price?.minorUnits).toBe(1299);
    expect(extraction.billingPhases[1].billingPeriod).toEqual({
      value: 1,
      unit: "month",
    });
    // A bare "$" never implies USD.
    expect(extraction.currency.code).toBeNull();
    expect(extraction.currency.symbol).toBe("$");
  });

  it("keeps CloudVault's monthly equivalent separate from the annual charge", () => {
    const extraction = mapFixtureOrFail(cloudvaultRaw);
    expect(extraction.billingPhases).toHaveLength(1);
    expect(extraction.billingPhases[0].price?.minorUnits).toBe(12000);
    expect(extraction.billingPhases[0].billingPeriod).toEqual({
      value: 1,
      unit: "year",
    });
    expect(extraction.displayedEquivalentPrice?.amount.minorUnits).toBe(1000);
    expect(extraction.displayedEquivalentPrice?.period).toEqual({
      value: 1,
      unit: "month",
    });
    // Absence stays explicit: no visible due-today or cancellation terms.
    expect(extraction.dueToday).toBeNull();
    expect(extraction.cancellation).toBeNull();
  });

  it("maps FitClub's promotional first month followed by the regular price", () => {
    const extraction = mapFixtureOrFail(fitclubRaw);
    expect(extraction.dueToday?.minorUnits).toBe(100);
    expect(extraction.billingPhases[0]).toMatchObject({
      kind: "promotional",
      duration: { value: 1, unit: "month" },
    });
    expect(extraction.billingPhases[0].price?.minorUnits).toBe(100);
    expect(extraction.billingPhases[1].price?.minorUnits).toBe(1999);
    expect(extraction.billingPhases[1].duration).toBeNull();
  });

  it("maps visible minimum commitment and additional fees with evidence", () => {
    const raw = parseFixture(structuredClone(streamlyRaw));
    const extraction = mapRawExtraction({
      ...raw,
      minimumCommitment: {
        status: "visible",
        months: 12,
        evidence: "12-month minimum commitment",
      },
      additionalFees: [
        {
          label: "Setup fee",
          amount: {
            decimalText: "9.99",
            currencyCode: null,
            evidence: "$9.99 setup fee",
          },
          frequency: "one_time",
          evidence: "$9.99 setup fee",
        },
      ],
    });

    expect(extraction.ok).toBe(true);
    if (extraction.ok) {
      expect(extraction.extraction.minimumCommitment?.months).toBe(12);
      expect(extraction.extraction.additionalFees[0].amount?.minorUnits).toBe(
        999,
      );
    }
  });
});

describe("rawOfferExtractionSchema", () => {
  it("rejects unknown keys, missing keys, and invalid enums", () => {
    const base = parseFixture(streamlyRaw);
    expect(
      rawOfferExtractionSchema.safeParse({ ...base, extra: true }).success,
    ).toBe(false);
    const missingKey: Record<string, unknown> = { ...base };
    delete missingKey.autoRenewal;
    expect(rawOfferExtractionSchema.safeParse(missingKey).success).toBe(false);
    expect(
      rawOfferExtractionSchema.safeParse({
        ...base,
        autoRenewal: { status: "maybe", evidence: null },
      }).success,
    ).toBe(false);
  });
});

describe("mapRawExtraction semantic rules", () => {
  const base = () => parseFixture(structuredClone(streamlyRaw));

  it("rejects a free trial that carries a price", () => {
    const raw = base();
    const mapped = mapRawExtraction({
      ...raw,
      billingPhases: [
        {
          ...raw.billingPhases[0],
          price: { decimalText: "1.00", currencyCode: null, evidence: "$1" },
        },
        raw.billingPhases[1],
      ],
    });
    expect(mapped.ok).toBe(false);
    if (!mapped.ok) {
      expect(mapped.issues.join(" ")).toContain("free trial");
    }
  });

  it("rejects a paid phase without a price", () => {
    const raw = base();
    const mapped = mapRawExtraction({
      ...raw,
      billingPhases: [{ ...raw.billingPhases[1], price: null }],
    });
    expect(mapped.ok).toBe(false);
  });

  it("rejects empty evidence on money facts", () => {
    const raw = base();
    const mapped = mapRawExtraction({
      ...raw,
      dueToday: { decimalText: "0.00", currencyCode: null, evidence: "   " },
    });
    expect(mapped.ok).toBe(false);
  });

  it("rejects malformed decimal amounts and currency codes", () => {
    const raw = base();
    const badAmount = mapRawExtraction({
      ...raw,
      dueToday: { decimalText: "12,99", currencyCode: null, evidence: "x" },
    });
    expect(badAmount.ok).toBe(false);

    const badCurrency = mapRawExtraction({
      ...raw,
      dueToday: { decimalText: "0.00", currencyCode: "usd", evidence: "x" },
    });
    expect(badCurrency.ok).toBe(false);
  });

  it("rejects non-positive period values", () => {
    const raw = base();
    const mapped = mapRawExtraction({
      ...raw,
      billingPhases: [
        {
          ...raw.billingPhases[0],
          duration: { value: 0, unit: "day" },
        },
        raw.billingPhases[1],
      ],
    });
    expect(mapped.ok).toBe(false);
  });

  it("rejects invalid commitments and unsupported fee amounts", () => {
    const raw = base();
    const invalidCommitment = mapRawExtraction({
      ...raw,
      minimumCommitment: {
        status: "visible",
        months: 0,
        evidence: "minimum term",
      },
    });
    expect(invalidCommitment.ok).toBe(false);

    const emptyFeeEvidence = mapRawExtraction({
      ...raw,
      additionalFees: [
        {
          label: "Service fee",
          amount: null,
          frequency: "one_time",
          evidence: "   ",
        },
      ],
    });
    expect(emptyFeeEvidence.ok).toBe(false);
  });

  it("drops blank ambiguity entries but keeps real ones", () => {
    const raw = base();
    const mapped = mapRawExtraction({
      ...raw,
      ambiguities: ["  ", "two prices shown for the same plan "],
    });
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.extraction.ambiguities).toEqual([
        "two prices shown for the same plan",
      ]);
    }
  });
});
