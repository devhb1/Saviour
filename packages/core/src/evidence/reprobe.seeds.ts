/**
 * One-shot re-probe of provenance-seeded addresses.
 * Upgrade proof=graph ONLY when threat-class / BOT signals fire live.
 *
 *   pnpm --filter @saviours/core exec tsx src/evidence/reprobe.seeds.ts
 */
import { loadRootEnv } from "../config/env";
import { clearEvidenceCache } from "./cache";
import { getEvidenceBundle } from "./getEvidence";

loadRootEnv();
clearEvidenceCache();

const SEEDS = [
  { id: "ATTACK-2", address: "0x1f23eb80f0c16758e4a55d48097c343bd20be56f" },
  { id: "HOP-1", address: "0xa6c248384c5ddd934b83d0926d2e2a1ddf008387" },
  { id: "MAKINA-B", address: "0xbed26250db2097318386f540fd546acedf7bde25" },
  { id: "EULER", address: "0xb66cd966670d962c227b3eaba30a872dbfb995db" },
] as const;

const THREAT = new Set([
  "FLASHLOAN_ONE_SHOT",
  "ATOMIC_MULTI_PROTOCOL",
  "DRAIN_FANIN",
  "REGISTRY_COOCCURRENCE",
]);

async function main() {
  console.log("reprobe seeds — live Graph only\n");
  for (const seed of SEEDS) {
    const b = await getEvidenceBundle(1, seed.address);
    const sigs = b.signals.map((s) => s.id);
    const threat = sigs.filter((id) => THREAT.has(id));
    const bot = sigs.includes("BOT_PROFILE");
    const upgrade =
      threat.length > 0 ||
      (bot && b.signalStatus.status === "WATCH");
    console.log(
      JSON.stringify(
        {
          id: seed.id,
          rows: b.evidence.length,
          signals: sigs,
          status: b.signalStatus.status,
          rule: b.signalStatus.rule,
          cooccurLinked: b.cooccurrenceLinked?.length ?? 0,
          upgradeProofGraph: upgrade,
        },
        null,
        0,
      ),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
