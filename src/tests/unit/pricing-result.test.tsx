import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PricingResult } from "@/components/pricing-result/pricing-result";
import type { AnalysisState } from "@/components/states/analysis-state";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  defaultMockOffer,
  mockOffers,
} from "@/features/analyze-offer/presentation/mock-offers";

describe("Phase 1 pricing result states", () => {
  const expectedCopy: Record<AnalysisState, string> = {
    idle: "Your clear billing timeline will appear here.",
    loading: "Tracing the billing structure…",
    success: "Estimated first-year cost",
    partial: "Some billing details are missing.",
    ambiguous: "The actual billing frequency is unclear.",
    error: "We could not process this screenshot.",
    rate_limited: "Please wait before analyzing another image.",
  };

  for (const [state, copy] of Object.entries(expectedCopy) as Array<
    [AnalysisState, string]
  >) {
    it(`renders the ${state} state`, () => {
      const html = renderToStaticMarkup(
        <PricingResult
          state={state}
          offer={defaultMockOffer}
          isExample={state !== "idle"}
        />,
      );

      expect(html).toContain(copy);
    });
  }
});

describe("theme control", () => {
  it("renders an accessible dark/light theme toggle", () => {
    const html = renderToStaticMarkup(<ThemeToggle />);

    expect(html).toContain('aria-label="Toggle color theme"');
    expect(html).toContain("theme-toggle__moon");
    expect(html).toContain("theme-toggle__sun");
  });
});

describe("verified fictional examples", () => {
  it("covers trial, annual-equivalent, and promotional price-change patterns", () => {
    expect(mockOffers.map((offer) => offer.pattern)).toEqual([
      "7-day free trial",
      "Monthly equivalent",
      "Price change",
    ]);
  });

  it("keeps each expected first-year result explicit in presentation fixtures", () => {
    expect(mockOffers.map((offer) => offer.firstYearCost)).toEqual([
      "$155.88",
      "$120.00",
      "$220.89",
    ]);
  });
});
