export type SecurityHeader = { readonly key: string; readonly value: string };

/**
 * Kept compatible with the app as built: Next.js injects inline scripts
 * (theme pre-paint, hydration), styles are inlined by Tailwind/Fontsource,
 * and upload previews use blob: URLs. No external origin is ever allowed.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/**
 * CSP is applied only in production builds: development needs eval for
 * fast refresh, and the dev server is never exposed publicly.
 */
export function buildSecurityHeaders(options: {
  includeContentSecurityPolicy: boolean;
}): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
    {
      key: "Strict-Transport-Security",
      value: "max-age=15552000; includeSubDomains",
    },
  ];
  if (options.includeContentSecurityPolicy) {
    headers.push({
      key: "Content-Security-Policy",
      value: CONTENT_SECURITY_POLICY,
    });
  }
  return headers;
}
