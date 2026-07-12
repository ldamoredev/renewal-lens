import type {
  OfferFactsExtractor,
  ScreenshotInput,
} from "@/features/analyze-offer/application/offer-facts-extractor";
import type { AnalysisApiResponse } from "@/features/analyze-offer/application/analysis-response";
import { presentAnalysis } from "@/features/analyze-offer/application/analysis-response";

export async function analyzeScreenshot(
  screenshot: ScreenshotInput,
  extractor: OfferFactsExtractor,
): Promise<AnalysisApiResponse> {
  const outcome = await extractor.extract(screenshot);
  switch (outcome.status) {
    case "extracted":
      return presentAnalysis(outcome.extraction);
    case "rate_limited":
      return { ok: false, error: "rate_limited" };
    case "timeout":
      return { ok: false, error: "timeout" };
    case "invalid_output":
    case "refused":
      return { ok: false, error: "analysis_inconclusive" };
    case "api_error":
      return { ok: false, error: "service_unavailable" };
  }
}
