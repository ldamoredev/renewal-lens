import { describe, expect, it } from "vitest";

import {
  analysisApiResponseSchema,
  presentAnalysis,
  type AnalysisApiResponse,
} from "@/features/analyze-offer/application/analysis-response";
import { computeOfferPricing } from "@/features/analyze-offer/domain/pricing";
import streamlyRaw from "@/features/analyze-offer/infrastructure/fixtures/streamly-trial.raw.json";
import {
  mapRawExtraction,
  rawOfferExtractionSchema,
  type RawOfferExtraction,
} from "@/features/analyze-offer/schemas/offer-extraction";

/**
 * The model's output is the only untrusted input in the system. This suite
 * feeds hostile-but-structurally-valid payloads through the real boundary
 * and asserts one invariant everywhere: the pipeline ends in an honest
 * result or an explicit rejection/blocker — never an exception, NaN,
 * Infinity, or an invented number.
 */

function baseRaw(): RawOfferExtraction {
  return rawOfferExtractionSchema.parse(structuredClone(streamlyRaw));
}

type BoundaryOutcome =
  | { readonly kind: "rejected"; readonly issues: readonly string[] }
  | { readonly kind: "response"; readonly response: AnalysisApiResponse };

function runUntrusted(raw: RawOfferExtraction): BoundaryOutcome {
  const mapped = mapRawExtraction(raw);
  if (!mapped.ok) {
    expect(mapped.issues.length).toBeGreaterThan(0);
    return { kind: "rejected", issues: mapped.issues };
  }
  const response = analysisApiResponseSchema.parse(
    presentAnalysis(mapped.extraction),
  );
  expect(JSON.stringify(response)).not.toMatch(/NaN|Infinity/);
  return { kind: "response", response };
}

function expectRejected(raw: RawOfferExtraction): readonly string[] {
  const outcome = runUntrusted(raw);
  expect(outcome.kind).toBe("rejected");
  return outcome.kind === "rejected" ? outcome.issues : [];
}

function expectResponse(raw: RawOfferExtraction): AnalysisApiResponse {
  const outcome = runUntrusted(raw);
  expect(outcome.kind).toBe("response");
  if (outcome.kind !== "response") {
    throw new Error("unreachable");
  }
  return outcome.response;
}

function withDueToday(decimalText: string): RawOfferExtraction {
  const raw = baseRaw();
  return {
    ...raw,
    dueToday: { decimalText, currencyCode: null, evidence: "Due today" },
  };
}

describe("malformed money survives structural parsing but not the contract", () => {
  it.each([
    ["thirteen digits", "1234567890123"],
    ["excess precision", "12.999"],
    ["negative", "-5"],
    ["exponent notation", "1e3"],
    ["locale comma", "12,99"],
    ["hex-ish", "0x10"],
  ])("rejects %s (%s)", (_name, decimalText) => {
    expectRejected(withDueToday(decimalText));
  });
});

describe("absurd periods are rejected, boundary periods compute exactly", () => {
  it("rejects zero and over-cap period values", () => {
    const raw = baseRaw();
    for (const value of [0, 10_001, -7]) {
      expectRejected({
        ...raw,
        billingPhases: [
          raw.billingPhases[0],
          {
            ...raw.billingPhases[1],
            billingPeriod: { value, unit: "month" },
          },
        ],
      });
    }
  });

  it("computes daily billing without drift: 365 charges in the window", () => {
    const raw = baseRaw();
    const mapped = mapRawExtraction({
      ...raw,
      dueToday: null,
      billingPhases: [
        {
          kind: "regular",
          price: {
            decimalText: "1.99",
            currencyCode: null,
            evidence: "$1.99/day",
          },
          billingPeriod: { value: 1, unit: "day" },
          duration: null,
          evidence: "$1.99/day",
        },
      ],
    });
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      const pricing = computeOfferPricing(mapped.extraction);
      // Hand-verified: days 0..364 -> 365 charges x 199 = 72635.
      expect(pricing.firstYear).toMatchObject({
        available: true,
        chargeCount: 365,
        totalMinorUnits: 72_635,
      });
    }
  });

  it("keeps maximum-magnitude money inside safe integer arithmetic", () => {
    const raw = baseRaw();
    const mapped = mapRawExtraction({
      ...raw,
      dueToday: null,
      billingPhases: [
        {
          kind: "regular",
          price: {
            decimalText: "999999999999.99",
            currencyCode: null,
            evidence: "huge",
          },
          billingPeriod: { value: 1, unit: "month" },
          duration: null,
          evidence: "huge",
        },
      ],
    });
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      const pricing = computeOfferPricing(mapped.extraction);
      expect(pricing.firstYear.available).toBe(true);
      if (pricing.firstYear.available) {
        // 12 x 99999999999999 — exact, and still a safe integer.
        expect(pricing.firstYear.totalMinorUnits).toBe(1_199_999_999_999_988);
        expect(Number.isSafeInteger(pricing.firstYear.totalMinorUnits)).toBe(
          true,
        );
      }
    }
  });
});

describe("contradictory or incomplete offers stay honest", () => {
  it("never calculates a total across mixed currencies", () => {
    const raw = baseRaw();
    const response = expectResponse({
      ...raw,
      dueToday: null,
      billingPhases: [
        {
          kind: "promotional",
          price: { decimalText: "1.00", currencyCode: "USD", evidence: "$1" },
          billingPeriod: { value: 1, unit: "month" },
          duration: { value: 1, unit: "month" },
          evidence: "$1 intro",
        },
        {
          kind: "regular",
          price: {
            decimalText: "19.99",
            currencyCode: "EUR",
            evidence: "19,99 €",
          },
          billingPeriod: { value: 1, unit: "month" },
          duration: null,
          evidence: "19,99 € / month",
        },
      ],
    });
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.offer.firstYearCost.status).not.toBe("calculated");
      expect(response.offer.firstYearCost.value).not.toMatch(/\d/);
    }
  });

  it("never anchors phases after an ongoing phase (implausible order)", () => {
    const raw = baseRaw();
    const response = expectResponse({
      ...raw,
      billingPhases: [
        { ...raw.billingPhases[1] }, // regular, ongoing, first
        {
          kind: "promotional",
          price: { decimalText: "1.00", currencyCode: null, evidence: "$1" },
          billingPeriod: { value: 1, unit: "month" },
          duration: { value: 1, unit: "month" },
          evidence: "$1 later?",
        },
      ],
    });
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.offer.firstYearCost.status).not.toBe("calculated");
    }
  });

  it("blocks the total when a visible fee has no visible amount", () => {
    const raw = baseRaw();
    const response = expectResponse({
      ...raw,
      additionalFees: [
        {
          label: "Activation fee",
          amount: null,
          frequency: "one_time",
          evidence: "Activation fee applies",
        },
      ],
    });
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.offer.firstYearCost.status).not.toBe("calculated");
    }
  });

  it("rejects a not-visible commitment that smuggles values", () => {
    const raw = baseRaw();
    expectRejected({
      ...raw,
      minimumCommitment: { status: "not_visible", months: 12, evidence: "" },
    });
  });

  it("maps an empty screenshot to the insufficient state", () => {
    const raw = baseRaw();
    const response = expectResponse({
      ...raw,
      dueToday: null,
      billingPhases: [],
      cancellation: null,
      autoRenewal: { status: "unknown", evidence: null },
      ambiguities: ["no pricing legible in the image"],
    });
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.state).toBe("insufficient");
    }
  });
});

describe("noisy model text passes through without breaking anything", () => {
  it("keeps markup-like evidence verbatim and schema-valid", () => {
    const raw = baseRaw();
    const hostileEvidence = '<script>alert("x")</script> & "quotes" \\ 12.99';
    const response = expectResponse({
      ...raw,
      merchant: { name: "Ev<il> & Co", evidence: hostileEvidence },
    });
    expect(response.ok).toBe(true);
    if (response.ok) {
      // Verbatim transport; escaping is the renderer's job.
      expect(response.offer.merchant).toBe("Ev<il> & Co");
    }
  });

  it("drops blank ambiguities, keeps duplicates, and reports ambiguous", () => {
    const raw = baseRaw();
    const response = expectResponse({
      ...raw,
      ambiguities: [
        "   ",
        ...Array.from({ length: 50 }, () => "two totals shown"),
      ],
    });
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.state).toBe("ambiguous");
      expect(response.offer.ambiguities).toHaveLength(50);
      expect(
        response.offer.ambiguities.every(
          (entry) => entry === "two totals shown",
        ),
      ).toBe(true);
    }
  });
});
