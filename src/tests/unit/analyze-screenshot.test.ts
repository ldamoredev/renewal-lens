import { describe, expect, it } from "vitest";

import { analyzeScreenshot } from "@/features/analyze-offer/application/analyze-screenshot";
import { presentAnalysis } from "@/features/analyze-offer/application/analysis-response";
import type { OfferFactsExtractor } from "@/features/analyze-offer/application/offer-facts-extractor";
import {
  mapRawExtraction,
  rawOfferExtractionSchema,
} from "@/features/analyze-offer/schemas/offer-extraction";
import streamlyRaw from "@/features/analyze-offer/infrastructure/fixtures/streamly-trial.raw.json";

const screenshot = { base64Data: "aGVsbG8=", mediaType: "image/png" as const };

function verifiedExtraction() {
  const structural = rawOfferExtractionSchema.parse(streamlyRaw);
  const mapped = mapRawExtraction(structural);
  if (!mapped.ok) throw new Error(mapped.issues.join("; "));
  return mapped.extraction;
}

describe("analyzeScreenshot", () => {
  it("maps an extracted offer through the deterministic pricing presentation", async () => {
    const extractor: OfferFactsExtractor = {
      async extract() {
        return { status: "extracted", extraction: verifiedExtraction() };
      },
    };

    const result = await analyzeScreenshot(screenshot, extractor);

    expect(result).toMatchObject({
      ok: true,
      state: "success",
      offer: {
        merchant: "Streamly",
        timeline: expect.arrayContaining([
          expect.objectContaining({ label: "Today", value: "$0.00" }),
          expect.objectContaining({
            label: "Regular price",
            value: "$12.99 / month",
          }),
        ]),
        firstYearCost: expect.objectContaining({ value: "$155.88" }),
      },
    });
  });

  it("preserves explicit ambiguity instead of presenting a complete result", async () => {
    const extractor: OfferFactsExtractor = {
      async extract() {
        return {
          status: "extracted",
          extraction: {
            ...verifiedExtraction(),
            ambiguities: ["currency code is not visible"],
          },
        };
      },
    };

    const result = await analyzeScreenshot(screenshot, extractor);
    expect(result).toMatchObject({
      ok: true,
      state: "ambiguous",
      offer: {
        ambiguities: ["currency code is not visible"],
        firstYearCost: { value: "Not confirmed" },
      },
    });
  });

  it("returns a partial result when deterministic pricing is blocked", async () => {
    const source = verifiedExtraction();
    const extractor: OfferFactsExtractor = {
      async extract() {
        return {
          status: "extracted",
          extraction: {
            ...source,
            dueToday: null,
            billingPhases: [source.billingPhases[0]],
          },
        };
      },
    };

    const result = await analyzeScreenshot(screenshot, extractor);
    expect(result).toMatchObject({
      ok: true,
      state: "partial",
      offer: { firstYearCost: { value: "Not available" } },
    });
  });

  it("returns an insufficient-screenshot result when no pricing is legible", async () => {
    const source = verifiedExtraction();
    const extractor: OfferFactsExtractor = {
      async extract() {
        return {
          status: "extracted",
          extraction: {
            ...source,
            dueToday: null,
            billingPhases: [],
            ambiguities: ["pricing footnotes are cropped"],
          },
        };
      },
    };

    const result = await analyzeScreenshot(screenshot, extractor);
    expect(result).toMatchObject({
      ok: true,
      state: "insufficient",
      offer: {
        ambiguities: ["pricing footnotes are cropped"],
        firstYearCost: { value: "Not available" },
      },
    });
  });

  it("presents visible commitment and fees and includes the fee in code-calculated cost", () => {
    const source = verifiedExtraction();
    const result = presentAnalysis({
      ...source,
      minimumCommitment: {
        months: 12,
        evidence: "12-month minimum commitment",
      },
      additionalFees: [
        {
          label: "Setup fee",
          amount: {
            minorUnits: 999,
            currencyCode: null,
            evidence: "$9.99 setup fee",
          },
          billingPeriod: null,
          evidence: "$9.99 setup fee",
        },
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      state: "success",
      offer: {
        firstYearCost: { value: "$165.87" },
        details: expect.arrayContaining([
          expect.objectContaining({
            label: "Minimum commitment",
            value: "12 months",
          }),
          expect.objectContaining({
            label: "Additional fee · Setup fee",
            value: "$9.99",
          }),
        ]),
      },
    });
  });

  it.each([
    ["invalid_output", "analysis_inconclusive"],
    ["refused", "analysis_inconclusive"],
    ["rate_limited", "rate_limited"],
    ["timeout", "timeout"],
    ["api_error", "service_unavailable"],
  ] as const)(
    "maps %s to %s without leaking payloads",
    async (status, error) => {
      const extractor: OfferFactsExtractor = {
        async extract() {
          return { status };
        },
      };

      expect(await analyzeScreenshot(screenshot, extractor)).toEqual({
        ok: false,
        error,
      });
    },
  );
});
