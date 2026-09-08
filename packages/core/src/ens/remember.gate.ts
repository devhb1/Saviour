/**
 * Live Sepolia gate: Remember writes address-label ENS → verdict texts → registry.
 *
 * Requires:
 * - deployments/sepolia.json (SavioursRegistry)
 * - deployments/sepolia-ens-identity.json (from pnpm spike:ens)
 * - RELAYER_PRIVATE_KEY (+ optional INVESTIGATOR_PRIVATE_KEY) + SEPOLIA_RPC_URL
 *
 * Uses a fresh random target each run so registry idempotency does not skip.
 * Does NOT invent prize-demo malicious addresses — synthetic gate target only.
 *
 * Run: pnpm check:remember-ens
 */

import { randomBytes } from "node:crypto";
import { RULES_VERSION } from "../classifier/validate";
import { ensNameForAddress, labelForAddress } from "../ens/label";
import { isEnsIdentityReady } from "../ens/identity";
import { resolveIncident } from "../ens/resolve";
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
  const expectedName = ensNameForAddress(target);
  console.log("check:remember-ens target", target);
  console.log("expected ENS name", expectedName);

  const remembered = await rememberValidatedAssessment(assessment, {
    network: "sepolia",
    ens: true,
    threatSignals: ["FLASHLOAN_ONE_SHOT", "ATOMIC_MULTI_PROTOCOL"],
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
  if (remembered.ensName.toLowerCase() !== expectedName.toLowerCase()) {
    throw new Error(
      `ENS name must be address-label, got ${remembered.ensName} want ${expectedName}`,
    );
  }
  if (remembered.ensReused) {
    throw new Error("Unexpected ENS reuse on fresh address label");
  }
  if (labelForAddress(target) !== remembered.ensName.split(".")[0]) {
    throw new Error("ENS label is not lowercase address");
  }

  console.log("remembered", {
    incidentLabel: remembered.incidentLabel,
    ensName: remembered.ensName,
    ensNode: remembered.ensNode,
    expiryUnix: remembered.expiryUnix?.toString(),
    registryTx: remembered.txHash,
    ensTx: remembered.ensTxHash,
  });

  const resolved = await resolveIncident(target);
  console.log("resolveIncident", {
    hit: resolved.hit,
    source: resolved.source,
    status: resolved.records["saviours.status"],
    threat: resolved.records["saviours.threat"],
    registry: resolved.records["saviours.registry"],
    evidenceHash: resolved.records["saviours.evidenceHash"]?.slice(0, 18) + "…",
  });

  if (!resolved.hit) {
    throw new Error("resolveIncident miss after remember");
  }
  if (resolved.records["saviours.status"] !== "TAINTED") {
    throw new Error(
      `saviours.status want TAINTED got ${resolved.records["saviours.status"]}`,
    );
  }
  if (!resolved.records["saviours.evidenceHash"]?.startsWith("0x")) {
    throw new Error("missing saviours.evidenceHash");
  }
  if (!resolved.records["saviours.registry"]?.startsWith("0x")) {
    throw new Error("missing saviours.registry");
  }

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

  console.log("ok: remember-ens —", remembered.ensName, "verdicts read back");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
