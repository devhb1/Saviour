/**
 * Seed Govern historical incidents (S3.7).
 *
 *   pnpm seed:incidents
 *   pnpm check:seed
 */

import {
  listGovernIncidents,
  loadSeedIncidents,
  loadSeedManifest,
  seedHistoricalIncidents,
} from "../packages/core/src/incidents/seed";
import { loadRootEnv } from "../packages/core/src/config/env";

loadRootEnv();

const checkOnly = process.argv.includes("--check");

async function main() {
  const catalog = loadSeedIncidents();
  console.log(
    `catalog: ${catalog.incidents.length} incidents (locked ${catalog.lockedAt})\n`,
  );

  if (!checkOnly) {
    console.log("Seeding ENS + registry (live Sepolia)…\n");
    const manifest = await seedHistoricalIncidents();
    for (const row of manifest.incidents) {
      console.log(
        `${row.id} ${row.address.slice(0, 10)}… ens=${row.ensStatus || "?"} reg=${row.registryStatus ?? "?"} reused=${row.reused}`,
      );
    }
    console.log(`\nwrote deployments/seeded-incidents.json (count=${manifest.count})`);
  }

  console.log("\nGovern list (live resolve)…");
  const list = await listGovernIncidents();
  const named = list.filter((r) => r.ensStatus === "TAINTED" || r.ensStatus === "WATCH");
  for (const row of list) {
    console.log(
      `  ${row.id} ${row.ensStatus || "(none)"} · ${row.label.slice(0, 40)} · ${row.source_url.slice(0, 48)}`,
    );
  }

  if (named.length < 5) {
    throw new Error(
      `Govern list needs ≥5 named incidents, got ${named.length}. Run pnpm seed:incidents`,
    );
  }

  const manifest = loadSeedManifest();
  if (!manifest || manifest.count < 5) {
    throw new Error("deployments/seeded-incidents.json missing or thin");
  }

  console.log(`\nok: seed (${named.length} live ENS statuses, manifest=${manifest.count})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
