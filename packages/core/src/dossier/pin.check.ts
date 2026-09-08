/**
 * Live dossier pin gate (S4.1).
 *
 *   pnpm check:dossier
 *
 * Pins a sample dossier (Pinata if JWT present, else public JSON),
 * writes saviours.dossier on a fresh ENS name, fetches it back.
 */

import { randomBytes } from "node:crypto";
import { RULES_VERSION } from "../classifier/validate";
import {
  buildDossier,
  fetchDossier,
  pinDossier,
} from "./pin";
import { isEnsIdentityReady } from "../ens/identity";
import { resolveIncident } from "../ens/resolve";
import type { ThreatAssessment } from "../types";
import { isRegistryDeployed, rememberValidatedAssessment } from "../registry/remember";
import { hasIpfsPinningToken } from "../config/env";

function syntheticTarget(): `0x${string}` {
  return `0x${randomBytes(20).toString("hex")}`;
}

function sample(target: `0x${string}`): ThreatAssessment {
  const nonce = randomBytes(4).toString("hex");
  return {
    status: "WATCH",
    confidence: 0.71,
    entity: { chainId: 1, address: target, entityType: "EOA" },
    threatTypes: ["SUSPICIOUS_BEHAVIOR"],
    evidence: [
      {
        id: "d1",
        source: "dossier-gate",
        reference: `r-${nonce}`,
        claim: "dossier gate evidence",
        timestamp: 1,
        rawHash: "33".repeat(32),
      },
      {
        id: "d2",
        source: "dossier-gate",
        reference: `r2-${nonce}`,
        claim: "dossier gate evidence 2",
        timestamp: 2,
        rawHash: "44".repeat(32),
      },
    ],
    counterEvidence: [],
    fingerprint: { behaviorHash: `0x${randomBytes(32).toString("hex")}` },
    modelVersion: "dossier-gate",
    rulesVersion: RULES_VERSION,
    createdAt: Math.floor(Date.now() / 1000),
  };
}

async function main() {
  if (!isRegistryDeployed("sepolia") || !isEnsIdentityReady()) {
    throw new Error("Need sepolia registry + ens identity");
  }

  console.log("check:dossier — pin + saviours.dossier fetch\n");
  console.log("Pinata JWT present:", hasIpfsPinningToken());

  const target = syntheticTarget();
  const assessment = sample(target);
  const payload = buildDossier({
    assessment,
    signals: [
      {
        id: "BOT_PROFILE",
        class: "counter",
        detail: "dossier gate",
        evidenceIds: ["d1"],
      },
    ],
    explanation: "Gate dossier for S4.1",
    banner: "gate",
  });

  console.log("1) pinDossier…");
  const pinned = await pinDossier(payload, { name: `saviours-gate-${target.slice(2, 10)}` });
  console.log("  ", {
    method: pinned.method,
    cid: pinned.cid,
    url: pinned.url,
    contentHash: pinned.contentHash.slice(0, 16) + "…",
  });

  if (pinned.method === "pinata" && !pinned.cid) {
    throw new Error("pinata method without cid — forbidden");
  }
  if (pinned.url.startsWith("ipfs://") && !pinned.cid) {
    throw new Error("ipfs URL without verified cid — forbidden");
  }

  console.log("\n2) fetchDossier(pinned.url)…");
  const fetched = await fetchDossier(pinned.url);
  if (fetched.entity.address !== target) {
    throw new Error(`dossier address mismatch: ${fetched.entity.address}`);
  }
  if (fetched.kind !== "saviours.investigation") {
    throw new Error("unexpected dossier kind");
  }
  console.log("   OK fetched status=", fetched.status, "evidence=", fetched.evidence.length);

  console.log("\n3) remember with dossierUrl → ENS…");
  const remembered = await rememberValidatedAssessment(assessment, {
    network: "sepolia",
    ens: true,
    dossierUrl: pinned.url,
    threatSignals: ["BOT_PROFILE"],
  });
  if (!remembered.persisted || !remembered.ensName) {
    throw new Error(`remember failed: ${JSON.stringify(remembered)}`);
  }
  console.log("   ensName", remembered.ensName);

  const resolved = await resolveIncident(target, {
    keys: ["saviours.dossier", "saviours.status"],
  });
  const dossierText = resolved.records["saviours.dossier"] ?? "";
  console.log("   saviours.dossier", dossierText.slice(0, 72));
  if (!dossierText) {
    throw new Error("saviours.dossier empty on ENS");
  }
  if (dossierText !== pinned.url) {
    throw new Error(`ENS dossier mismatch:\n  ens=${dossierText}\n  pin=${pinned.url}`);
  }

  console.log("\n4) fetch via ENS text…");
  const fromEns = await fetchDossier(dossierText);
  if (fromEns.entity.address !== target) {
    throw new Error("ENS-fetched dossier address mismatch");
  }
  console.log("   OK");

  console.log("\nok: check:dossier (saviours.dossier fetches)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
