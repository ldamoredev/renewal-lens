import { NextResponse } from "next/server";

import {
  getVerifiedExample,
  isVerifiedExampleId,
} from "@/features/analyze-offer/infrastructure/verified-examples";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isVerifiedExampleId(id)) {
    return NextResponse.json(
      { ok: false, error: "invalid_file" },
      { status: 404 },
    );
  }
  return NextResponse.json(getVerifiedExample(id), {
    headers: { "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
