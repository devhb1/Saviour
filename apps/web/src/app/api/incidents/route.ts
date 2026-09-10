import { listAllIncidents, loadLiveIncidentIndex, loadSeedManifest } from "@saviours/core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Product law: `<address>.saviours.eth` only — no category segments. */
const CANONICAL_ENS = /^0x[a-f0-9]{40}\.[a-z0-9-]+\.eth$/i;

/**
 * GET /api/incidents
 * Seeded catalog ∪ live Remember index + live ENS/registry status.
 * Flags malformed / category-path ENS names; attaches rulePath hints for Registry UI.
 */
export async function GET() {
  try {
    const list = await listAllIncidents();
    const manifest = loadSeedManifest();
    const live = loadLiveIncidentIndex();
    const incidents = list.incidents.map((row) => {
      const ensName = (row.ensName ?? "").trim().toLowerCase();
      const label = ensName.includes(".")
        ? ensName.slice(0, ensName.indexOf("."))
        : "";
      const ensNameCanonical =
        Boolean(ensName) &&
        CANONICAL_ENS.test(ensName) &&
        /^0x[a-f0-9]{40}$/.test(label) &&
        !label.includes(".") &&
        ensName.split(".").length === 3; // addr.parent.eth
      return {
        ...row,
        ensNameCanonical,
        rulePath: inferRulePath(row),
      };
    });
    const malformed = incidents.filter((r) => r.ensName && !r.ensNameCanonical);
    return NextResponse.json({
      count: list.incidents.length,
      named: list.named,
      seededCount: list.seededCount,
      liveCount: list.liveCount,
      seededAt: list.seededAt ?? manifest?.seededAt ?? null,
      liveUpdatedAt: list.liveUpdatedAt ?? live.updatedAt,
      malformedEnsCount: malformed.length,
      incidents,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Incidents list failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function inferRulePath(row: {
  id?: string;
  label?: string;
  ensStatus?: string;
  expectedStatus?: string;
  proof?: string;
}): string | null {
  const blob = `${row.id ?? ""} ${row.label ?? ""}`.toLowerCase();
  const status = (row.ensStatus || row.expectedStatus || "").toUpperCase();
  if (blob.includes("bot") || status === "WATCH") return "BOT_PROFILE";
  if (blob.includes("cooccur") || blob.includes("hop")) {
    return "REGISTRY_COOCCURRENCE";
  }
  if (
    blob.includes("attack") ||
    blob.includes("flash") ||
    blob.includes("makina") ||
    blob.includes("euler") ||
    (row.proof === "graph" && status === "TAINTED")
  ) {
    return "FLASHLOAN_ONE_SHOT ∧ ATOMIC";
  }
  if (status === "TAINTED") return "TAINTED · see evidence";
  return null;
}
