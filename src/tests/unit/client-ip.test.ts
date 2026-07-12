import { describe, expect, it } from "vitest";

import { resolveClientIp } from "@/lib/http/client-ip";

describe("resolveClientIp", () => {
  it("uses the first x-forwarded-for hop", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2",
    });
    expect(resolveClientIp(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": " 198.51.100.9 " });
    expect(resolveClientIp(headers)).toBe("198.51.100.9");
  });

  it("returns a stable bucket when no address header is present", () => {
    expect(resolveClientIp(new Headers())).toBe("unknown");
    expect(
      resolveClientIp(new Headers({ "x-forwarded-for": " , 10.0.0.1" })),
    ).toBe("unknown");
  });
});
