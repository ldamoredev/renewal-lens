import type { AnalysisApiResponse } from "@/features/analyze-offer/application/analysis-response";
import { presentAnalysis } from "@/features/analyze-offer/application/analysis-response";
import {
  mapRawExtraction,
  rawOfferExtractionSchema,
} from "@/features/analyze-offer/schemas/offer-extraction";
import cloudvaultRaw from "@/features/analyze-offer/infrastructure/fixtures/cloudvault-annual.raw.json";
import fitclubRaw from "@/features/analyze-offer/infrastructure/fixtures/fitclub-promo.raw.json";
import streamlyRaw from "@/features/analyze-offer/infrastructure/fixtures/streamly-trial.raw.json";

export const verifiedExampleIds = [
  "streamly",
  "cloudvault",
  "fitclub",
] as const;
export type VerifiedExampleId = (typeof verifiedExampleIds)[number];

const rawFixtures: Record<VerifiedExampleId, unknown> = {
  streamly: streamlyRaw,
  cloudvault: cloudvaultRaw,
  fitclub: fitclubRaw,
};

function buildVerifiedExample(id: VerifiedExampleId): AnalysisApiResponse {
  const structural = rawOfferExtractionSchema.safeParse(rawFixtures[id]);
  if (!structural.success) {
    throw new Error(
      `Verified example ${id} no longer matches the extraction schema`,
    );
  }
  const mapped = mapRawExtraction(structural.data);
  if (!mapped.ok) {
    throw new Error(`Verified example ${id} violates the extraction contract`);
  }
  return presentAnalysis(mapped.extraction);
}

const verifiedExamples = Object.fromEntries(
  verifiedExampleIds.map((id) => [id, buildVerifiedExample(id)]),
) as Record<VerifiedExampleId, AnalysisApiResponse>;

export function isVerifiedExampleId(value: string): value is VerifiedExampleId {
  return verifiedExampleIds.includes(value as VerifiedExampleId);
}

export function getVerifiedExample(id: VerifiedExampleId): AnalysisApiResponse {
  return verifiedExamples[id];
}
