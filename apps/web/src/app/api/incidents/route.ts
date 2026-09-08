import { listGovernIncidents, loadSeedManifest } from "@saviours/core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/incidents
 * Govern catalog: curated seed list + live ENS/registry status.
 */
export async function GET() {
  try {
    const incidents = await listGovernIncidents();
    const manifest = loadSeedManifest();
    return NextResponse.json({
      count: incidents.length,
      named: incidents.filter(
        (i) => i.ensStatus === "TAINTED" || i.ensStatus === "WATCH",
      ).length,
      seededAt: manifest?.seededAt ?? null,
      incidents,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Incidents list failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
