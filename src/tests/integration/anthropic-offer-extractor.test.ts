import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";

import type { ScreenshotInput } from "@/features/analyze-offer/application/offer-facts-extractor";
import {
  AnthropicOfferExtractor,
  EXTRACTION_OUTPUT_JSON_SCHEMA,
  type ExtractionModelClient,
  type ExtractionModelResponse,
} from "@/features/analyze-offer/infrastructure/anthropic-offer-extractor";
import streamlyRaw from "@/tests/fixtures/extractions/streamly-trial.raw.json";

const screenshot: ScreenshotInput = {
  base64Data: "aGVsbG8=",
  mediaType: "image/png",
};

const validText = JSON.stringify(streamlyRaw);

function textResponse(text: string): ExtractionModelResponse {
  return { stop_reason: "end_turn", content: [{ type: "text", text }] };
}

/** Queue-based fake client; each entry either resolves or throws. */
function fakeClient(
  outcomes: Array<ExtractionModelResponse | Error>,
): ExtractionModelClient & {
  requests: Anthropic.MessageCreateParamsNonStreaming[];
} {
  const requests: Anthropic.MessageCreateParamsNonStreaming[] = [];
  return {
    requests,
    async create(request) {
      requests.push(request);
      const outcome = outcomes.shift();
      if (outcome === undefined) {
        throw new Error("fake client exhausted: unexpected extra call");
      }
      if (outcome instanceof Error) {
        throw outcome;
      }
      return outcome;
    },
  };
}

describe("AnthropicOfferExtractor", () => {
  it("extracts on the first attempt and sends the structured request", async () => {
    const client = fakeClient([textResponse(validText)]);
    const extractor = new AnthropicOfferExtractor(client, "claude-haiku-4-5");

    const outcome = await extractor.extract(screenshot);

    expect(outcome.status).toBe("extracted");
    if (outcome.status === "extracted") {
      expect(outcome.extraction.billingPhases).toHaveLength(2);
    }
    expect(client.requests).toHaveLength(1);
    const request = client.requests[0];
    expect(request.model).toBe("claude-haiku-4-5");
    expect(request.system).toBeTruthy();
    expect(request.output_config?.format).toEqual({
      type: "json_schema",
      schema: EXTRACTION_OUTPUT_JSON_SCHEMA,
    });
    const content = request.messages[0].content;
    expect(Array.isArray(content)).toBe(true);
    if (Array.isArray(content)) {
      expect(content[0]).toMatchObject({
        type: "image",
        source: { type: "base64", media_type: "image/png", data: "aGVsbG8=" },
      });
    }
  });

  it("retries exactly once after invalid output and can succeed", async () => {
    const client = fakeClient([
      textResponse("this is not json"),
      textResponse(validText),
    ]);
    const extractor = new AnthropicOfferExtractor(client, "claude-haiku-4-5");

    const outcome = await extractor.extract(screenshot);

    expect(outcome.status).toBe("extracted");
    expect(client.requests).toHaveLength(2);
    const retryMessages = client.requests[1].messages;
    expect(retryMessages).toHaveLength(3);
    expect(retryMessages[1]).toEqual({
      role: "assistant",
      content: "this is not json",
    });
    expect(retryMessages[2].content).toContain("was not valid JSON");
  });

  it("stops after the single retry and reports invalid_output", async () => {
    const client = fakeClient([
      textResponse('{"broken": true}'),
      textResponse("still not the contract"),
    ]);
    const extractor = new AnthropicOfferExtractor(client, "claude-haiku-4-5");

    const outcome = await extractor.extract(screenshot);

    expect(outcome).toEqual({ status: "invalid_output" });
    expect(client.requests).toHaveLength(2);
  });

  it("treats semantic contract violations as structurally invalid output", async () => {
    const withPricedTrial = JSON.parse(validText) as Record<string, unknown> & {
      billingPhases: Array<Record<string, unknown>>;
    };
    withPricedTrial.billingPhases[0].price = {
      decimalText: "1.00",
      currencyCode: null,
      evidence: "$1",
    };
    const client = fakeClient([
      textResponse(JSON.stringify(withPricedTrial)),
      textResponse(JSON.stringify(withPricedTrial)),
    ]);
    const extractor = new AnthropicOfferExtractor(client, "claude-haiku-4-5");

    const outcome = await extractor.extract(screenshot);

    expect(outcome).toEqual({ status: "invalid_output" });
    expect(client.requests[1].messages[2].content).toContain("free trial");
  });

  it("does not retry when the model refuses", async () => {
    const client = fakeClient([{ stop_reason: "refusal", content: [] }]);
    const extractor = new AnthropicOfferExtractor(client, "claude-haiku-4-5");

    const outcome = await extractor.extract(screenshot);

    expect(outcome).toEqual({ status: "refused" });
    expect(client.requests).toHaveLength(1);
  });

  it("maps transport failures to explicit outcomes", async () => {
    const cases: Array<[Error, string]> = [
      [new Anthropic.APIConnectionTimeoutError(), "timeout"],
      [
        new Anthropic.RateLimitError(429, {}, "rate limited", new Headers()),
        "rate_limited",
      ],
      [
        new Anthropic.InternalServerError(500, {}, "boom", new Headers()),
        "api_error",
      ],
      [new Error("network exploded"), "api_error"],
    ];
    for (const [error, expected] of cases) {
      const client = fakeClient([error]);
      const extractor = new AnthropicOfferExtractor(client, "claude-haiku-4-5");
      const outcome = await extractor.extract(screenshot);
      expect(outcome.status).toBe(expected);
      expect(client.requests).toHaveLength(1);
    }
  });

  it("surfaces transport failures that happen during the retry attempt", async () => {
    const client = fakeClient([
      textResponse("not json"),
      new Anthropic.APIConnectionTimeoutError(),
    ]);
    const extractor = new AnthropicOfferExtractor(client, "claude-haiku-4-5");

    const outcome = await extractor.extract(screenshot);

    expect(outcome).toEqual({ status: "timeout" });
    expect(client.requests).toHaveLength(2);
  });
});

describe("EXTRACTION_OUTPUT_JSON_SCHEMA", () => {
  it("stays inside the structured-output schema subset", () => {
    const serialized = JSON.stringify(EXTRACTION_OUTPUT_JSON_SCHEMA);
    for (const keyword of [
      '"$schema"',
      '"pattern"',
      '"minLength"',
      '"minimum"',
      '"maximum"',
    ]) {
      expect(serialized).not.toContain(keyword);
    }
    expect(EXTRACTION_OUTPUT_JSON_SCHEMA.type).toBe("object");
    expect(EXTRACTION_OUTPUT_JSON_SCHEMA.additionalProperties).toBe(false);
    expect(EXTRACTION_OUTPUT_JSON_SCHEMA.required).toContain("billingPhases");
  });
});
