import type { OfferExtraction } from "@/features/analyze-offer/domain/extraction";

export type ScreenshotMediaType =
  "image/png" | "image/jpeg" | "image/webp" | "image/gif";

/** A validated, transient screenshot ready for extraction. Never persisted. */
export type ScreenshotInput = {
  readonly base64Data: string;
  readonly mediaType: ScreenshotMediaType;
};

/**
 * Outcome of one extraction attempt (including its single controlled
 * structural retry). Failure variants carry no model payloads or image
 * content so they are safe to log and to surface as UI states.
 */
export type ExtractionOutcome =
  | { readonly status: "extracted"; readonly extraction: OfferExtraction }
  | { readonly status: "invalid_output" }
  | { readonly status: "refused" }
  | { readonly status: "rate_limited" }
  | { readonly status: "timeout" }
  | { readonly status: "api_error" };

/** Port implemented by the Anthropic adapter (and by test fakes). */
export interface OfferFactsExtractor {
  extract(screenshot: ScreenshotInput): Promise<ExtractionOutcome>;
}
