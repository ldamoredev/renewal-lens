import type { NextConfig } from "next";

import { buildSecurityHeaders } from "@/lib/http/security-headers";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: buildSecurityHeaders({
          includeContentSecurityPolicy: process.env.NODE_ENV === "production",
        }),
      },
    ];
  },
};

export default nextConfig;
