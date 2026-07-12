import { describe, expect, it } from "vitest";

import {
  getVerifiedExample,
  isVerifiedExampleId,
  verifiedExampleIds,
} from "@/features/analyze-offer/infrastructure/verified-examples";

describe("verified example cache", () => {
  it("serves all three examples from deterministic local fixtures", () => {
    const expectedTotals = ["$155.88", "$120.00", "$220.89"];

    expect(verifiedExampleIds).toEqual(["streamly", "cloudvault", "fitclub"]);
    for (const [index, id] of verifiedExampleIds.entries()) {
      const result = getVerifiedExample(id);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.state).toBe("success");
        expect(result.offer.firstYearCost.value).toBe(expectedTotals[index]);
        expect(result.offer.timeline.length).toBeGreaterThan(1);
        expect(result.offer.missingInformation.length).toBeGreaterThan(0);
      }
    }
  });

  it("rejects unknown example identifiers", () => {
    expect(isVerifiedExampleId("streamly")).toBe(true);
    expect(isVerifiedExampleId("netflix")).toBe(false);
  });
});
