import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import type {
  ExtractionOutcome,
  OfferFactsExtractor,
  ScreenshotInput,
} from "@/features/analyze-offer/application/offer-facts-extractor";
import type { OfferExtraction } from "@/features/analyze-offer/domain/extraction";
import {
  mapRawExtraction,
  rawOfferExtractionSchema,
} from "@/features/analyze-offer/schemas/offer-extraction";
import {
  buildRetryPrompt,
  EXTRACTION_SYSTEM_PROMPT,
  EXTRACTION_USER_PROMPT,
} from "@/features/analyze-offer/infrastructure/extraction-prompt";

/**
 * Phase 2 decision: Haiku 4.5 is the default extraction model — the
 * cheapest current model with vision and structured-output support.
 * Override with ANTHROPIC_MODEL.
 */
export const DEFAULT_EXTRACTION_MODEL = "claude-haiku-4-5";

const REQUEST_TIMEOUT_MS = 45_000;
const MAX_OUTPUT_TOKENS = 2_048;
/** Transport-level retries left to the SDK (429/5xx/connection errors). */
const SDK_MAX_RETRIES = 1;

/** Narrow response view so tests can fake the client without the SDK. */
export type ExtractionModelResponse = {
  readonly stop_reason: string | null;
  readonly content: ReadonlyArray<{
    readonly type: string;
    readonly text?: string;
  }>;
};

export type ExtractionModelClient = {
  create(
    request: Anthropic.MessageCreateParamsNonStreaming,
  ): Promise<ExtractionModelResponse>;
};

/**
 * Structured outputs reject schema keywords outside their subset. The wire
 * schema uses none semantically, but zod's JSON Schema emitter adds
 * numeric bounds for z.int(); prune them (safe here because no property
 * in the contract is named after a JSON Schema keyword).
 */
const UNSUPPORTED_SCHEMA_KEYWORDS = new Set([
  "$schema",
  "pattern",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
]);

function pruneUnsupportedKeywords(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(pruneUnsupportedKeywords);
  }
  if (node !== null && typeof node === "object") {
    return Object.fromEntries(
      Object.entries(node)
        .filter(([key]) => !UNSUPPORTED_SCHEMA_KEYWORDS.has(key))
        .map(([key, value]) => [key, pruneUnsupportedKeywords(value)]),
    );
  }
  return node;
}

export const EXTRACTION_OUTPUT_JSON_SCHEMA = pruneUnsupportedKeywords(
  z.toJSONSchema(rawOfferExtractionSchema),
) as Record<string, unknown>;

type ParseAttempt =
  | { readonly ok: true; readonly extraction: OfferExtraction }
  | {
      readonly ok: false;
      readonly issues: readonly string[];
      readonly rawText: string;
    };

function parseModelResponse(response: ExtractionModelResponse): ParseAttempt {
  const textBlock = response.content.find(
    (block) => block.type === "text" && typeof block.text === "string",
  );
  const rawText = textBlock?.text ?? "";
  if (rawText.length === 0) {
    return {
      ok: false,
      issues: ["response contained no text output"],
      rawText,
    };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    return { ok: false, issues: ["response was not valid JSON"], rawText };
  }

  const structural = rawOfferExtractionSchema.safeParse(parsedJson);
  if (!structural.success) {
    const issues = structural.error.issues.map(
      (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
    );
    return { ok: false, issues, rawText };
  }

  const mapped = mapRawExtraction(structural.data);
  if (!mapped.ok) {
    return { ok: false, issues: mapped.issues, rawText };
  }
  return { ok: true, extraction: mapped.extraction };
}

export class AnthropicOfferExtractor implements OfferFactsExtractor {
  constructor(
    private readonly client: ExtractionModelClient,
    private readonly model: string,
  ) {}

  async extract(screenshot: ScreenshotInput): Promise<ExtractionOutcome> {
    const initialMessages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: screenshot.mediaType,
              data: screenshot.base64Data,
            },
          },
          { type: "text", text: EXTRACTION_USER_PROMPT },
        ],
      },
    ];

    const first = await this.attempt(initialMessages);
    if (first.kind !== "invalid") {
      return first.outcome;
    }

    // The single controlled structural retry: replay the conversation with
    // the invalid answer and the machine-readable issue list.
    const retryMessages: Anthropic.MessageParam[] = [
      ...initialMessages,
      {
        role: "assistant",
        content: first.rawText.length > 0 ? first.rawText : "[no text output]",
      },
      { role: "user", content: buildRetryPrompt(first.issues) },
    ];

    const second = await this.attempt(retryMessages);
    if (second.kind !== "invalid") {
      return second.outcome;
    }
    return { status: "invalid_output" };
  }

  private async attempt(
    messages: Anthropic.MessageParam[],
  ): Promise<
    | { kind: "done"; outcome: ExtractionOutcome }
    | { kind: "invalid"; issues: readonly string[]; rawText: string }
  > {
    let response: ExtractionModelResponse;
    try {
      response = await this.client.create({
        model: this.model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: EXTRACTION_SYSTEM_PROMPT,
        messages,
        output_config: {
          format: {
            type: "json_schema",
            schema: EXTRACTION_OUTPUT_JSON_SCHEMA,
          },
        },
      });
    } catch (error) {
      return { kind: "done", outcome: mapTransportFailure(error) };
    }

    if (response.stop_reason === "refusal") {
      return { kind: "done", outcome: { status: "refused" } };
    }

    const parsed = parseModelResponse(response);
    if (parsed.ok) {
      return {
        kind: "done",
        outcome: { status: "extracted", extraction: parsed.extraction },
      };
    }
    return { kind: "invalid", issues: parsed.issues, rawText: parsed.rawText };
  }
}

function mapTransportFailure(error: unknown): ExtractionOutcome {
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return { status: "timeout" };
  }
  if (error instanceof Anthropic.RateLimitError) {
    return { status: "rate_limited" };
  }
  return { status: "api_error" };
}

export type AnthropicExtractorOptions = {
  readonly apiKey?: string;
  readonly model?: string;
  readonly timeoutMs?: number;
};

/**
 * Server-side factory. Must never be imported from client components:
 * it reads ANTHROPIC_API_KEY, which stays on the server.
 */
export function createAnthropicOfferExtractor(
  options: AnthropicExtractorOptions = {},
): OfferFactsExtractor {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured; live extraction is unavailable",
    );
  }
  const model =
    options.model ??
    (process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_EXTRACTION_MODEL);
  const client = new Anthropic({
    apiKey,
    timeout: options.timeoutMs ?? REQUEST_TIMEOUT_MS,
    maxRetries: SDK_MAX_RETRIES,
  });
  return new AnthropicOfferExtractor(client.messages, model);
}
