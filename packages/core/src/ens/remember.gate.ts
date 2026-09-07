/**
 * Live Sepolia gate: Remember writes ENS → ensNode → registry.
 *
 * Requires:
 * - deployments/sepolia.json (SavioursRegistry)
 * - deployments/sepolia-ens-identity.json (from pnpm spike:ens)
 * - RELAYER_PRIVATE_KEY + SEPOLIA_RPC_URL
 *
 * Uses a fresh random target each run so registry idempotency does not skip.
 * Does NOT invent prize-demo malicious addresses — synthetic gate target only.
 *
 * Run: pnpm check:remember-ens
 */

import { randomBytes } from "node:crypto";
import { RULES_VERSION } from "../classifier/validate";
import { isEnsIdentityReady } from "../ens/identity";
import type { ThreatAssessment } from "../types";
import { getIncident, getLatestIncidentByTarget } from "../registry/client";
import { isRegistryDeployed, rememberValidatedAssessment } from "../registry/remember";

const ZERO =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

function syntheticTarget(): `0x${string}` {
  return `0x${randomBytes(20).toString("hex")}`;
}

function sample(target: `0x${string}`): ThreatAssessment {
  const nonce = randomBytes(4).toString("hex");
  return {
    status: "TAINTED",
    confidence: 0.91,
    entity: {
      chainId: 1,
      address: target,
      entityType: "EOA",
    },
    threatTypes: ["DRAINER"],
    evidence: [
      {
        id: "e1",
        source: "remember-ens-gate",
        reference: `r1-${nonce}`,
        claim: "ens gate evidence 1",
        timestamp: 1,
        rawHash: "55".repeat(32),
      },
      {
        id: "e2",
        source: "remember-ens-gate",
        reference: `r2-${nonce}`,
        claim: "ens gate evidence 2",
        timestamp: 2,
        rawHash: "66".repeat(32),
      },
    ],
    counterEvidence: [],
    fingerprint: {
      behaviorHash: `0x${randomBytes(32).toString("hex")}`,
    },
    modelVersion: "remember-ens-gate",
    rulesVersion: RULES_VERSION,
    createdAt: Math.floor(Date.now() / 1000),
  };
}

async function main() {
  if (!isRegistryDeployed("sepolia")) {
    throw new Error("Need deployments/sepolia.json");
  }
  if (!isEnsIdentityReady()) {
    throw new Error("Need deployments/sepolia-ens-identity.json (pnpm spike:ens)");
  }

  const target = syntheticTarget();
  const assessment = sample(target);
  console.log("check:remember-ens target", target);

  const remembered = await rememberValidatedAssessment(assessment, {
    network: "sepolia",
    ens: true,
  });

  if (!remembered.persisted) {
    throw new Error(`Expected persist, got ${JSON.stringify(remembered)}`);
  }
  if (remembered.reused) {
    throw new Error("Unexpected registry reuse on fresh synthetic target");
  }
  if (!remembered.ensName || remembered.ensNode === ZERO) {
    throw new Error(`ENS missing: ${JSON.stringify(remembered)}`);
  }
  if (remembered.ensReused) {
    throw new Error("Unexpected ENS reuse on fresh incident id");
  }

  console.log("remembered", {
    incidentLabel: remembered.incidentLabel,
    ensName: remembered.ensName,
    ensNode: remembered.ensNode,
    registryTx: remembered.txHash,
    ensTx: remembered.ensTxHash,
  });

  const onChain = await getIncident(remembered.incidentId, "sepolia");
  if (!onChain) throw new Error("getIncident returned null");
  if (onChain.ensNode.toLowerCase() !== remembered.ensNode.toLowerCase()) {
    throw new Error(
      `ensNode mismatch on-chain=${onChain.ensNode} result=${remembered.ensNode}`,
    );
  }

  const latest = await getLatestIncidentByTarget(1, target, "sepolia");
  if (!latest || latest.incidentId !== remembered.incidentId) {
    throw new Error("getLatestIncidentByTarget mismatch after remember");
  }
  if (latest.ensNode === ZERO) {
    throw new Error("latest incident has zero ensNode");
  }

  console.log("ok: remember-ens —", remembered.ensName, "→ registry ensNode set");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
