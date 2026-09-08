/**
 * Live Sepolia gate — dispute ⇒ Shield WARN; revoke drops ENS memory.
 *
 *   pnpm check:govern
 */

import { randomBytes } from "node:crypto";
import { RULES_VERSION } from "../classifier/validate";
import { disputeIncident, revokeIncidentName } from "./dispute";
import { isEnsIdentityReady } from "./identity";
import { isIncidentNameRegistered, resolveIncident } from "./resolve";
import type { ThreatAssessment } from "../types";
import { isRegistryDeployed, rememberValidatedAssessment } from "../registry/remember";
import { checkTarget } from "../shield/check";

function syntheticTarget(): `0x${string}` {
  return `0x${randomBytes(20).toString("hex")}`;
}

function sample(target: `0x${string}`): ThreatAssessment {
  const nonce = randomBytes(4).toString("hex");
  return {
    status: "TAINTED",
    confidence: 0.94,
    entity: { chainId: 1, address: target, entityType: "EOA" },
    threatTypes: ["DRAINER"],
    evidence: [
      {
        id: "g1",
        source: "govern-gate",
        reference: `r-${nonce}`,
        claim: "govern gate",
        timestamp: 1,
        rawHash: "cc".repeat(32),
      },
      {
        id: "g2",
        source: "govern-gate",
        reference: `r2-${nonce}`,
        claim: "govern gate 2",
        timestamp: 2,
        rawHash: "dd".repeat(32),
      },
    ],
    counterEvidence: [],
    fingerprint: { behaviorHash: `0x${randomBytes(32).toString("hex")}` },
    modelVersion: "govern-gate",
    rulesVersion: RULES_VERSION,
    createdAt: Math.floor(Date.now() / 1000),
  };
}

async function main() {
  if (!isRegistryDeployed("sepolia") || !isEnsIdentityReady()) {
    throw new Error("Need sepolia registry + ens identity deployments");
  }

  console.log("check:govern — dispute + revoke (live Sepolia)\n");

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

  const before = await checkTarget({
    targetChainId: 1,
    address: target,
    registryNetwork: "sepolia",
  });
  console.log("2) Shield before dispute", {
    decision: before.decision,
    source: before.source,
  });
  if (before.decision !== "BLOCK" || before.source !== "ens") {
    throw new Error(`expected ENS BLOCK, got ${JSON.stringify(before)}`);
  }

  console.log("\n3) dispute → WATCH…");
  const disputed = await disputeIncident({
    address: target,
    reason: "false positive — gate test",
  });
  console.log("   ", {
    status: disputed.status,
    renewSkipped: disputed.renewSkipped,
    dispute: disputed.disputeRecord.slice(0, 80),
  });

  const afterDispute = await checkTarget({
    targetChainId: 1,
    address: target,
    registryNetwork: "sepolia",
  });
  console.log("4) Shield after dispute", {
    decision: afterDispute.decision,
    source: afterDispute.source,
    status: afterDispute.records?.["saviours.status"],
  });
  if (afterDispute.decision !== "WARN" || afterDispute.source !== "ens") {
    throw new Error(
      `expected ENS WARN after dispute, got ${JSON.stringify(afterDispute)}`,
    );
  }

  console.log("\n5) revoke (unregister)…");
  const revoked = await revokeIncidentName({
    address: target,
    note: "gate revoke",
  });
  console.log("   tx", revoked.unregisterTxHash);
  console.log("   ", revoked.registryNote);

  if (await isIncidentNameRegistered(target)) {
    throw new Error("still registered after revoke");
  }
  const resolved = await resolveIncident(target);
  if (resolved.hit || resolved.records["saviours.status"]) {
    throw new Error(`ENS still hit after revoke: ${JSON.stringify(resolved.records)}`);
  }

  const afterRevoke = await checkTarget({
    targetChainId: 1,
    address: target,
    registryNetwork: "sepolia",
  });
  console.log("6) Shield after revoke", {
    decision: afterRevoke.decision,
    source: afterRevoke.source,
  });
  if (afterRevoke.source === "ens") {
    throw new Error("Shield must not use ENS after unregister");
  }
  // Registry append-only may still BLOCK — that is documented, not a failure
  console.log("\nok: check:govern (dispute→WARN, revoke drops ENS)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
