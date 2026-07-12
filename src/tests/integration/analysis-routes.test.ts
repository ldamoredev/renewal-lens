import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

import { POST as analyzeRoute } from "@/app/api/analyze/route";
import { GET as exampleRoute } from "@/app/api/examples/[id]/route";

const originalApiKey = process.env.ANTHROPIC_API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.ANTHROPIC_API_KEY;
  } else {
    process.env.ANTHROPIC_API_KEY = originalApiKey;
  }
});

describe("verified example route", () => {
  it("returns a cached calculated example without API configuration", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const response = await exampleRoute(
      new Request("http://local/api/examples/fitclub"),
      {
        params: Promise.resolve({ id: "fitclub" }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("immutable");
    expect(await response.json()).toMatchObject({
      ok: true,
      state: "success",
      offer: {
        merchant: "FitClub+",
        firstYearCost: { value: "$220.89" },
      },
    });
  });

  it("returns 404 for an unknown example", async () => {
    const response = await exampleRoute(
      new Request("http://local/api/examples/nope"),
      {
        params: Promise.resolve({ id: "nope" }),
      },
    );
    expect(response.status).toBe(404);
  });
});

describe("analysis upload route", () => {
  it("rejects an oversized request before parsing multipart data", async () => {
    const response = await analyzeRoute(
      new Request("http://local/api/analyze", {
        method: "POST",
        headers: { "content-length": String(12 * 1024 * 1024) },
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "file_too_large",
    });
  });

  it("rejects a request without an image", async () => {
    const response = await analyzeRoute(
      new Request("http://local/api/analyze", {
        method: "POST",
        body: new FormData(),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_file" });
  });

  it("degrades cleanly when a valid image arrives without an API key", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#4e9be8" },
    })
      .png()
      .toBuffer();
    const pngBytes = new Uint8Array(png.byteLength);
    pngBytes.set(png);
    const formData = new FormData();
    formData.set(
      "image",
      new File([pngBytes], "offer.png", { type: "image/png" }),
    );

    const response = await analyzeRoute(
      new Request("http://local/api/analyze", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "service_unavailable",
    });
  });
});
