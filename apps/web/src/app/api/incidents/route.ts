import { listAllIncidents, loadLiveIncidentIndex, loadSeedManifest } from "@saviours/core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/incidents
 * Seeded catalog ∪ live Remember index + live ENS/registry status.
 */
export async function GET() {
  try {
    const list = await listAllIncidents();
    const manifest = loadSeedManifest();
    const live = loadLiveIncidentIndex();
    return NextResponse.json({
      count: list.incidents.length,
      named: list.named,
      seededCount: list.seededCount,
      liveCount: list.liveCount,
      seededAt: list.seededAt ?? manifest?.seededAt ?? null,
      liveUpdatedAt: list.liveUpdatedAt ?? live.updatedAt,
      incidents: list.incidents,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Incidents list failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
