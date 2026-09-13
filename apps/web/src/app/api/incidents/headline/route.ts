import { getIncidentHeadline } from "@saviours/core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/incidents/headline
 * Instant registry counts for chrome — JSON index, no Sepolia RPC.
 */
export async function GET() {
  try {
    const h = getIncidentHeadline();
    return NextResponse.json(
      {
        ...h,
        chain: "sepolia",
        note: "index counts · no live ENS enrich",
      },
      {
        headers: {
          "Cache-Control": "public, max-age=15, stale-while-revalidate=60",
        },
      },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Incident headline failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
