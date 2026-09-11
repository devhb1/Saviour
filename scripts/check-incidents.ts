/**
 * Gate: /api/incidents data path — seeded ∪ live, named ≥5.
 *
 *   pnpm check:incidents
 */

import { loadRootEnv } from "../packages/core/src/config/env";
import {
  listAllIncidents,
  loadLiveIncidentIndex,
  recordLiveIncident,
} from "../packages/core/src/incidents/index";
import {
  loadSeedIncidents,
  loadSeedManifest,
} from "../packages/core/src/incidents/seed";

loadRootEnv();

async function main() {
  console.log("check:incidents — seeded ∪ live index\n");

  const catalog = loadSeedIncidents();
  const manifest = loadSeedManifest();
  console.log("seed catalog", catalog.incidents.length);
  console.log("seed manifest", manifest?.count ?? 0, manifest?.seededAt ?? "(none)");

  // Ensure live index has at least seed addresses (idempotent sync)
  for (const s of catalog.incidents) {
    const fromManifest = manifest?.incidents.find(
      (r) => r.address.toLowerCase() === s.address.toLowerCase(),
    );
    recordLiveIncident({
      address: s.address,
      status: s.status,
      label: s.label,
      incidentId: fromManifest?.incidentId ?? null,
      ensName: fromManifest?.ensName ?? null,
      source: "seed",
      source_url: s.source_url,
    });
  }

  const live = loadLiveIncidentIndex();
  console.log("live index", live.incidents.length, live.updatedAt);

  const list = await listAllIncidents();
  console.log(
    "merged",
    list.incidents.length,
    "seeded",
    list.seededCount,
    "liveExtra",
    list.liveCount,
    "named",
    list.named,
  );

  for (const row of list.incidents) {
    console.log(
      `  ${row.origin} ${row.id} [${row.proof}] ${row.ensStatus || "—"} ${row.address.slice(0, 10)}…`,
    );
  }

  const attack1 = list.incidents.find((i) => i.id === "SEED-ATTACK-1");
  const attack2 = list.incidents.find((i) => i.id === "SEED-ATTACK-2");
  if (attack1?.proof !== "graph") {
    throw new Error("SEED-ATTACK-1 must be proof=graph");
  }
  if (attack2?.proof !== "provenance") {
    throw new Error("SEED-ATTACK-2 must be proof=provenance");
  }

  if (list.seededCount < 5) {
    throw new Error("Need ≥5 seeded incidents in catalog");
  }
  if (list.named < 4) {
    throw new Error(
      `Need ≥4 named ENS statuses, got ${list.named}. Run pnpm seed:incidents or Remember live.`,
    );
  }

  // At least one ATTACK seed present
  if (!list.incidents.some((i) => i.id.includes("ATTACK-1") || i.address.startsWith("0x935bfb"))) {
    throw new Error("ATTACK-1 missing from incidents list");
  }

  console.log("\nok: check:incidents (seeded + live · proof badges)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
