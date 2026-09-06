/**
 * Local functional gate: register → read on Anvil.
 *
 * Prerequisites (scripted by `pnpm check:registry-local`):
 * - Anvil running
 * - SavioursRegistry deployed with Anvil account #0 as admin/registrar
 * - deployments/anvil.json written via deploy:record
 * - RELAYER_PRIVATE_KEY = Anvil account #0
 *
 * This proves the Remember path works end-to-end without Sepolia.
 */

import {
  getIncident,
  registerIncidentFromAssessment,
} from "./client";
import { RULES_VERSION } from "../classifier/validate";
import type { ThreatAssessment } from "../types";

const ANVIL_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

async function main() {
  process.env.RELAYER_PRIVATE_KEY ??= ANVIL_KEY;

  const assessment: ThreatAssessment = {
    status: "TAINTED",
    confidence: 0.92,
    entity: {
      chainId: 1,
      address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
      entityType: "EOA",
    },
    threatTypes: ["DRAINER"],
    evidence: [
      {
        id: "e1",
        source: "local-gate",
        reference: "ref:1",
        claim: "Synthetic evidence for local registry gate only",
        timestamp: 1_700_000_000,
        rawHash: "11".repeat(32),
      },
      {
        id: "e2",
        source: "local-gate",
        reference: "ref:2",
        claim: "Second signal so TAINTED stays TAINTED under rules",
        timestamp: 1_700_000_001,
        rawHash: "22".repeat(32),
      },
    ],
    counterEvidence: [],
    modelVersion: "local-gate",
    rulesVersion: RULES_VERSION,
    createdAt: Math.floor(Date.now() / 1000),
  };

  const first = await registerIncidentFromAssessment({
    assessment,
    incidentLabel: "SAV-LOCAL-0001",
    network: "anvil",
  });
  if (!first.txHash && !first.reused) {
    throw new Error("Expected txHash on first register");
  }
  console.log("register:", first);

  const row = await getIncident(first.incidentId, "anvil");
  if (!row) throw new Error("getIncident returned null after register");
  if (row.status !== "TAINTED") throw new Error(`Expected TAINTED, got ${row.status}`);
  if (row.target.toLowerCase() !== assessment.entity.address) {
    throw new Error("target mismatch");
  }
  console.log("readback ok:", {
    status: row.status,
    chainId: row.chainId,
    confidenceBucket: row.confidenceBucket,
  });

  const second = await registerIncidentFromAssessment({
    assessment,
    incidentLabel: "SAV-LOCAL-0002",
    network: "anvil",
  });
  if (!second.reused) throw new Error("Expected idempotent reuse on second register");
  if (second.incidentId !== first.incidentId) {
    throw new Error("Idempotent path returned different incidentId");
  }
  console.log("idempotent ok");

  console.log("ok: registry local gate (anvil)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
