/**
 * Gate: rememberValidatedAssessment skips cleanly without deployment,
 * and persists on Anvil when deployments/anvil.json exists.
 *
 * Run via `pnpm check:registry-local` (after deploy+record) or:
 *   pnpm --filter @saviours/core exec tsx src/registry/remember.check.ts
 */

import { RULES_VERSION } from "../classifier/validate";
import type { ThreatAssessment } from "../types";
import { getLatestIncidentByTarget } from "./client";
import { isRegistryDeployed, rememberValidatedAssessment } from "./remember";

const ANVIL_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

function sample(status: ThreatAssessment["status"]): ThreatAssessment {
  return {
    status,
    confidence: 0.88,
    entity: {
      chainId: 1,
      address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
      entityType: "EOA",
    },
    threatTypes: ["DRAINER"],
    evidence: [
      {
        id: "e1",
        source: "remember-gate",
        reference: "r1",
        claim: "gate evidence 1",
        timestamp: 1,
        rawHash: "33".repeat(32),
      },
      {
        id: "e2",
        source: "remember-gate",
        reference: "r2",
        claim: "gate evidence 2",
        timestamp: 2,
        rawHash: "44".repeat(32),
      },
    ],
    counterEvidence: [],
    modelVersion: "remember-gate",
    rulesVersion: RULES_VERSION,
    createdAt: Math.floor(Date.now() / 1000),
  };
}

async function main() {
  // 1) No deployment → skip (use a network name with no file — sepolia when missing)
  if (!isRegistryDeployed("sepolia")) {
    const skipped = await rememberValidatedAssessment(sample("TAINTED"), {
      network: "sepolia",
    });
    if (skipped.persisted || skipped.reason !== "deployment_missing") {
      throw new Error(`Expected deployment_missing skip, got ${JSON.stringify(skipped)}`);
    }
    console.log("skip-without-deploy ok");
  } else {
    console.log("skip-without-deploy skipped (sepolia.json present)");
  }

  // 2) SAFE never persists
  const safe = await rememberValidatedAssessment(sample("SAFE"), {
    network: "anvil",
    enabled: true,
  });
  if (safe.persisted || safe.reason !== "status_not_persistable") {
    throw new Error(`Expected status_not_persistable, got ${JSON.stringify(safe)}`);
  }
  console.log("refuse-SAFE ok");

  // 3) Anvil persist + target lookup (requires check-registry-local deploy first)
  if (!isRegistryDeployed("anvil")) {
    console.log("anvil persist deferred (no deployments/anvil.json)");
    console.log("ok: remember gate (partial)");
    return;
  }

  process.env.RELAYER_PRIVATE_KEY ??= ANVIL_KEY;
  const tainted = sample("TAINTED");
  const remembered = await rememberValidatedAssessment(tainted, {
    network: "anvil",
    incidentLabel: "SAV-REMEMBER-GATE-1",
  });
  if (!remembered.persisted) {
    throw new Error(`Expected persist on anvil, got ${JSON.stringify(remembered)}`);
  }
  console.log("persist ok", remembered.incidentLabel, "reused=", remembered.reused);

  const latest = await getLatestIncidentByTarget(
    1,
    tainted.entity.address,
    "anvil",
  );
  if (!latest || latest.status !== "TAINTED") {
    throw new Error("getLatestIncidentByTarget failed after remember");
  }
  console.log("latest-by-target ok", latest.status);
  console.log("ok: remember gate");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
