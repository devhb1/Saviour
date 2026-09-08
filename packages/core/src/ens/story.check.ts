/**
 * Gate: ENS story texts for ATTACK-1 (plainVerdict / atomicTx / …).
 *
 *   pnpm check:ens-story
 *
 * Live Graph → buildStoryTextRecords → writeIncidentStoryTexts → resolve.
 * Requires SEPOLIA_RPC + investigator/relayer key + prior check:ens-roles
 * so new text keys are granted.
 */

import { loadRootEnv } from "../config/env";
import { getEvidenceBundle } from "../evidence/getEvidence";
import { writeIncidentStoryTexts } from "./client";
import { isEnsIdentityReady } from "./identity";
import { resolveIncident } from "./resolve";
import { buildStoryTextRecords } from "./story";

loadRootEnv();

const ATTACK_1 = "0x935bfb495e33f74d2e9735df1da66ace442ede48";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log("check:ens-story — ATTACK-1 story texts\n");
  assert(isEnsIdentityReady(), "Need deployments/sepolia-ens-identity.json");

  const bundle = await getEvidenceBundle(1, ATTACK_1);
  const status = bundle.signalStatus.status;
  console.log("live signalStatus", status, bundle.signalStatus.rule);
  assert(
    status === "TAINTED" || status === "WATCH",
    `expected TAINTED/WATCH, got ${status}`,
  );

  const story = buildStoryTextRecords({
    signals: bundle.signals,
    status,
    evidence: bundle.evidence,
    rulesVersion: "pivot-3.3",
  });
  console.log("story keys", story);

  assert(story["saviours.plainVerdict"], "plainVerdict empty");
  if (status === "TAINTED") {
    assert(story["saviours.atomicTx"], "TAINTED should have atomicTx");
    assert(story["saviours.protocols"], "TAINTED should have protocols");
  }

  const written = await writeIncidentStoryTexts(ATTACK_1, story);
  console.log("wrote", written.ensName, written.txHash ?? "(unchanged)");

  const resolved = await resolveIncident(ATTACK_1);
  assert(resolved.hit, "ENS resolve miss");
  const plain = resolved.records["saviours.plainVerdict"] ?? "";
  console.log("resolved plainVerdict:", plain);
  assert(plain.length > 0, "plainVerdict not on ENS after write");

  if (story["saviours.atomicTx"]) {
    const tx = resolved.records["saviours.atomicTx"] ?? "";
    console.log("resolved atomicTx:", tx.slice(0, 18) + "…");
    assert(tx.length > 0, "atomicTx not on ENS after write");
  }

  console.log("\n✅ check:ens-story");
}

main().catch((e) => {
  console.error("\n❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
