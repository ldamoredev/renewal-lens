import { describe, expect, it } from "vitest";

import {
  presentAnalysis,
  type AnalysisApiResponse,
} from "@/features/analyze-offer/application/analysis-response";
import cloudvaultRaw from "@/features/analyze-offer/infrastructure/fixtures/cloudvault-annual.raw.json";
import fitclubRaw from "@/features/analyze-offer/infrastructure/fixtures/fitclub-promo.raw.json";
import streamlyRaw from "@/features/analyze-offer/infrastructure/fixtures/streamly-trial.raw.json";
import { getVerifiedExample } from "@/features/analyze-offer/infrastructure/verified-examples";
import {
  mapRawExtraction,
  rawOfferExtractionSchema,
} from "@/features/analyze-offer/schemas/offer-extraction";

/**
 * Freezes the full pure pipeline (raw fixture → schema → mapper → engine →
 * presentation) against hand-verified expectations. Any future change to
 * the contract, engine, or presentation that alters a canonical result
 * must consciously update this file.
 */
function runPipeline(fixture: unknown): AnalysisApiResponse {
  const structural = rawOfferExtractionSchema.parse(fixture);
  const mapped = mapRawExtraction(structural);
  if (!mapped.ok) {
    throw new Error(
      `fixture violates the contract: ${mapped.issues.join("; ")}`,
    );
  }
  return presentAnalysis(mapped.extraction);
}

function offerOf(response: AnalysisApiResponse) {
  if (!response.ok) {
    throw new Error(`expected an ok response, got ${response.error}`);
  }
  return response.offer;
}

function fact(
  facts: readonly { label: string }[],
  label: string,
): { label: string; value: string; status: string; evidence: string[] } {
  const found = facts.find((entry) => entry.label === label);
  if (found === undefined) {
    throw new Error(`missing fact: ${label}`);
  }
  return found as never;
}

describe("Streamly pipeline regression (7-day trial, then $12.99/month)", () => {
  const response = runPipeline(streamlyRaw);
  const offer = offerOf(response);

  it("reaches the success state with the hand-verified totals", () => {
    expect(response.ok && response.state).toBe("success");
    expect(offer.merchant).toBe("Streamly");
    // 12 monthly charges of $12.99 in the 365-day window.
    expect(offer.firstYearCost).toMatchObject({
      value: "$155.88",
      status: "calculated",
    });
    expect(fact(offer.details, "Effective monthly")).toMatchObject({
      value: "$12.99",
      status: "calculated",
    });
  });

  it("shows the visible timeline with verbatim evidence", () => {
    expect(offer.timeline.map((entry) => [entry.label, entry.value])).toEqual([
      ["Today", "$0.00"],
      ["Free trial", "7 days"],
      ["Regular price", "$12.99 / month"],
    ]);
    expect(fact(offer.timeline, "Free trial").evidence).toEqual([
      "Watch free for 7 days",
    ]);
    expect(fact(offer.timeline, "Today").status).toBe("visible");
  });

  it("keeps absence explicit and never assumes USD", () => {
    expect(fact(offer.details, "Minimum commitment").status).toBe(
      "not_visible",
    );
    expect(fact(offer.details, "Additional fees").status).toBe("not_visible");
    expect(offer.missingInformation).toContain(
      "The currency code is not visible; $ is not assumed to mean USD.",
    );
    expect(offer.ambiguities).toEqual([]);
    expect(offer.assumptions).toContain(
      "First-year cost includes charges within 365 days of signup.",
    );
  });
});

describe("CloudVault pipeline regression ($10/month shown, $120 billed annually)", () => {
  const offer = offerOf(runPipeline(cloudvaultRaw));

  it("keeps the displayed equivalent separate from the actual charge", () => {
    expect(fact(offer.details, "Displayed equivalent")).toMatchObject({
      value: "$10.00 / month",
      status: "visible",
    });
    expect(fact(offer.details, "Actual billing")).toMatchObject({
      value: "Year",
    });
    // One annual charge; the renewal on day 365 is outside the window.
    expect(offer.firstYearCost).toMatchObject({
      value: "$120.00",
      status: "calculated",
    });
    expect(fact(offer.details, "Effective monthly").value).toBe("$10.00");
  });

  it("derives due today from the first phase and flags the derivation", () => {
    expect(fact(offer.timeline, "Today")).toMatchObject({
      value: "$120.00",
      status: "derived",
      evidence: ["$120 billed annually"],
    });
    expect(offer.assumptions).toContain(
      "Due today was derived from the first visible billing phase.",
    );
    expect(offer.missingInformation).toContain("Cancellation is not visible.");
  });
});

describe("FitClub+ pipeline regression ($1 first month, then $19.99/month)", () => {
  const offer = offerOf(runPipeline(fitclubRaw));

  it("computes the hand-verified promotional first year", () => {
    // 100 + 11 x 1999 = 22089 minor units; 22089/12 = 1840.75 -> 1841.
    expect(offer.firstYearCost).toMatchObject({
      value: "$220.89",
      status: "calculated",
    });
    expect(fact(offer.details, "Effective monthly").value).toBe("$18.41");
    expect(offer.timeline.map((entry) => [entry.label, entry.value])).toEqual([
      ["Today", "$1.00"],
      ["Promotional price", "$1.00 / month for 1 month"],
      ["Regular price", "$19.99 / month"],
    ]);
  });

  it("cites both the promotional and regular charge evidence in the total", () => {
    expect(offer.firstYearCost.evidence).toEqual([
      "Your first month. Just $1.",
      "$19.99 / month",
    ]);
  });
});

describe("verified example cache consistency", () => {
  const fixturesById = {
    streamly: streamlyRaw,
    cloudvault: cloudvaultRaw,
    fitclub: fitclubRaw,
  } as const;

  it.each(Object.keys(fixturesById) as (keyof typeof fixturesById)[])(
    "the cached %s example equals the live pipeline over its fixture",
    (id) => {
      // Guarantees the public example cache can never drift from the
      // real pipeline output for the same versioned fixture.
      expect(getVerifiedExample(id)).toEqual(runPipeline(fixturesById[id]));
    },
  );
});
