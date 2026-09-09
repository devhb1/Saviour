/**
 * Re-register ATTACK-1 after accidental unregister (film blocker).
 *   pnpm --filter @saviours/core exec tsx src/ens/reregisterAttack1.ts
 */
import { loadRootEnv } from "../config/env";
import { getEvidenceBundle } from "../evidence/getEvidence";
import { evidenceHashFrom } from "../registry/ids";
import { registerIncidentName, writeIncidentStoryTexts } from "./client";
import { resolveIncident } from "./resolve";
import { buildStoryTextRecords } from "./story";
import { checkTarget } from "../shield/check";

loadRootEnv();

const ATTACK_1 = "0x935bfb495e33f74d2e9735df1da66ace442ede48";

async function main() {
  console.log("reregisterAttack1 — ENS name was unregistered\n");

  const before = await resolveIncident(ATTACK_1, {
    keys: ["saviours.status"],
  });
  console.log("BEFORE", { hit: before.hit, status: before.records["saviours.status"] });

  const bundle = await getEvidenceBundle(1, ATTACK_1);
  const status = bundle.signalStatus.status;
  console.log("live Graph", status, bundle.signalStatus.rule);
  if (status !== "TAINTED" && status !== "WATCH") {
    throw new Error(`unexpected status ${status}`);
  }

  const story = buildStoryTextRecords({
    signals: bundle.signals,
    status,
    evidence: bundle.evidence,
    rulesVersion: "pivot-3.3",
  });

  const registered = await registerIncidentName({
    address: ATTACK_1,
    status,
    incidentId: `0x${"51".repeat(32)}`,
    incidentLabel: "SAV-ATTACK-1-rereg",
    confidence: 0.92,
    evidenceHash: evidenceHashFrom(
      bundle.evidence.slice(0, 8).map((e, i) => ({
        id: e.id || `e-${i}`,
        source: e.source || "graph",
        reference: e.txHash || e.id || `r-${i}`,
        claim: e.claim || e.id,
        timestamp: e.timestamp || 1,
        rawHash: ("11".repeat(32)) as `0x${string}`,
      })),
    ),
    threat: bundle.signals.map((s) => s.id).join(","),
    investigatorName: "investigator-01.savioursqsy56o.eth",
  });
  console.log("registered", registered.ensName, registered.txHash ?? "(reused)");

  const written = await writeIncidentStoryTexts(ATTACK_1, story);
  console.log("story", written.txHash ?? "(unchanged)", story);

  const after = await resolveIncident(ATTACK_1);
  console.log("AFTER", {
    hit: after.hit,
    status: after.records["saviours.status"],
    plain: after.records["saviours.plainVerdict"],
    source: after.source,
  });

  const shield = await checkTarget({
    targetChainId: 1,
    address: ATTACK_1,
    registryNetwork: "sepolia",
  });
  console.log("SHIELD", {
    decision: shield.decision,
    source: shield.source,
  });

  if (!after.hit || after.records["saviours.status"] !== status) {
    throw new Error("re-register failed — status not readable");
  }
  if (shield.decision !== "BLOCK" && status === "TAINTED") {
    throw new Error(`Shield want BLOCK got ${shield.decision}`);
  }
  console.log("\nok: ATTACK-1 named again");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
