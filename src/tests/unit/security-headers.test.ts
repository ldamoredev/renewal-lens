import { describe, expect, it } from "vitest";

import {
  buildSecurityHeaders,
  CONTENT_SECURITY_POLICY,
} from "@/lib/http/security-headers";

function asMap(headers: readonly { key: string; value: string }[]) {
  return new Map(headers.map((header) => [header.key, header.value]));
}

describe("buildSecurityHeaders", () => {
  it("always includes the baseline hardening headers", () => {
    const headers = asMap(
      buildSecurityHeaders({ includeContentSecurityPolicy: false }),
    );
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(headers.get("Strict-Transport-Security")).toContain("max-age=");
    expect(headers.has("Content-Security-Policy")).toBe(false);
  });

  it("adds the self-contained CSP when requested", () => {
    const headers = asMap(
      buildSecurityHeaders({ includeContentSecurityPolicy: true }),
    );
    expect(headers.get("Content-Security-Policy")).toBe(
      CONTENT_SECURITY_POLICY,
    );
  });

  it("never allows an external origin in the CSP", () => {
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/https?:\/\//);
  });
});
