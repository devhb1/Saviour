import { getIncidentHeadline } from "@saviours/core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/incidents/headline
 * Instant registry counts for chrome — no Sepolia enrich (unlike full list).
 */
export async function GET() {
  try {
    const h = getIncidentHeadline();
    return NextResponse.json({
      ...h,
      chain: "sepolia",
      note: "index counts · no live ENS enrich",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Incident headline failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
