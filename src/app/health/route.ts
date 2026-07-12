import { NextResponse } from "next/server";

import { snapshotAnalysisMetrics } from "@/lib/metrics/analysis-metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Railway health check plus safe operational metrics: outcome counters
 * and durations only — never IPs, image content, or model payloads.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      metrics: snapshotAnalysisMetrics(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
