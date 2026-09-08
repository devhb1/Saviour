/**
 * Live Sepolia Shield gate — ENS-first MEMORY HIT (no Graph, no AI).
 *
 *   pnpm check:shield
 *
 * 1) Remember fresh TAINTED address (live ENS + registry)
 * 2) Shield → source=ens, BLOCK, usedAi=false, graphQueries=0
 * 3) Vitalik → ESCALATE (purged registry)
 * 4) Unnamed random → ESCALATE
 */

import { randomBytes } from "node:crypto";
import { RULES_VERSION } from "../classifier/validate";
import { isEnsIdentityReady } from "../ens/identity";
import { resolveIncident } from "../ens/resolve";
import type { ThreatAssessment } from "../types";
import { isRegistryDeployed, rememberValidatedAssessment } from "../registry/remember";
import { checkTarget } from "./check";

function syntheticTarget(): `0x${string}` {
  return `0x${randomBytes(20).toString("hex")}`;
}

function sample(target: `0x${string}`): ThreatAssessment {
  const nonce = randomBytes(4).toString("hex");
  return {
    status: "TAINTED",
    confidence: 0.93,
    entity: { chainId: 1, address: target, entityType: "EOA" },
    threatTypes: ["DRAINER"],
    evidence: [
      {
        id: "s1",
        source: "shield-ens-gate",
        reference: `r-${nonce}`,
        claim: "shield ens gate",
        timestamp: 1,
        rawHash: "aa".repeat(32),
      },
      {
        id: "s2",
        source: "shield-ens-gate",
        reference: `r2-${nonce}`,
        claim: "shield ens gate 2",
        timestamp: 2,
        rawHash: "bb".repeat(32),
      },
    ],
    counterEvidence: [],
    fingerprint: { behaviorHash: `0x${randomBytes(32).toString("hex")}` },
    modelVersion: "shield-ens-gate",
    rulesVersion: RULES_VERSION,
    createdAt: Math.floor(Date.now() / 1000),
  };
}

async function main() {
  if (!isRegistryDeployed("sepolia")) {
    throw new Error("Need deployments/sepolia.json");
  }
  if (!isEnsIdentityReady()) {
    throw new Error("Need deployments/sepolia-ens-identity.json");
  }

  console.log("check:shield — Sepolia ENS-first (live)\n");

  const target = syntheticTarget();
  console.log("1) remember TAINTED", target);
  const remembered = await rememberValidatedAssessment(sample(target), {
    network: "sepolia",
    ens: true,
    threatSignals: ["FLASHLOAN_ONE_SHOT"],
  });
  if (!remembered.persisted || !remembered.ensName) {
    throw new Error(`remember failed: ${JSON.stringify(remembered)}`);
  }
  console.log("   ensName", remembered.ensName);

  // Prove ENS text is live before Shield
  const resolved = await resolveIncident(target);
  if (resolved.records["saviours.status"] !== "TAINTED") {
    throw new Error(
      `ENS status not TAINTED before shield: ${JSON.stringify(resolved.records)}`,
    );
  }
  console.log("   ENS status TAINTED (resolveIncident live)");

  console.log("\n2) Shield named target…");
  const hit = await checkTarget({
    targetChainId: 1,
    address: target,
    registryNetwork: "sepolia",
  });
  console.log("  ", {
    decision: hit.decision,
    source: hit.source,
    usedAi: hit.usedAi,
    latencyMs: hit.latencyMs,
    ensName: hit.ensName,
    graphQueries: hit.cost.graphQueries,
    aiCalls: hit.cost.aiCalls,
    status: hit.records?.["saviours.status"],
  });

  if (hit.decision !== "BLOCK") {
    throw new Error(`expected BLOCK, got ${hit.decision}`);
  }
  if (hit.source !== "ens") {
    throw new Error(`expected source=ens, got ${hit.source}`);
  }
  if (hit.usedAi !== false) {
    throw new Error("usedAi must be false");
  }
  if (hit.cost.graphQueries !== 0 || hit.cost.aiCalls !== 0) {
    throw new Error("MEMORY HIT must be 0 Graph · 0 AI");
  }
  if (hit.cost.ensResolutions < 1) {
    throw new Error("expected ensResolutions >= 1");
  }

  console.log("\n3) Vitalik (purged)…");
  const vitalik = await checkTarget({
    targetChainId: 1,
    address: "0xd8da6BF26964aF9D7eEd9e03E53415D37aA96045",
    registryNetwork: "sepolia",
  });
  if (vitalik.decision !== "ESCALATE") {
    throw new Error(`Vitalik expected ESCALATE, got ${vitalik.decision}`);
  }
  console.log("   OK", vitalik.decision, vitalik.source);

  console.log("\n4) unnamed random…");
  const unknown = await checkTarget({
    targetChainId: 1,
    address: syntheticTarget(),
    registryNetwork: "sepolia",
  });
  if (unknown.decision !== "ESCALATE" || unknown.usedAi !== false) {
    throw new Error(`unnamed expected ESCALATE, got ${JSON.stringify(unknown)}`);
  }
  console.log("   OK", unknown.decision);

  console.log("\nok: check:shield (ENS-first MEMORY HIT live)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
