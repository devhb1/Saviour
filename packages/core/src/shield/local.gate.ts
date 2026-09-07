/**
 * Local gate: after a TAINTED remember on Anvil, Shield Tier-1 must BLOCK
 * with usedAi=false (hero loop — no second AI call).
 *
 * Run via pnpm check:registry-local (after deploy+register) or alone when
 * deployments/anvil.json already exists.
 */

import { checkTarget } from "./check";
import { isRegistryDeployed } from "../registry/remember";

const TARGET = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";

async function main() {
  if (!isRegistryDeployed("anvil")) {
    throw new Error(
      "Need deployments/anvil.json — run pnpm check:registry-local first",
    );
  }

  const unknown = await checkTarget({
    targetChainId: 1,
    address: "0x0000000000000000000000000000000000000001",
    registryNetwork: "anvil",
  });
  if (unknown.decision !== "ESCALATE" || unknown.usedAi !== false) {
    throw new Error(`Expected ESCALATE for unknown target, got ${JSON.stringify(unknown)}`);
  }
  console.log("unknown → ESCALATE ok (usedAi=false)");

  const hit = await checkTarget({
    targetChainId: 1,
    address: TARGET,
    registryNetwork: "anvil",
  });
  if (hit.decision !== "BLOCK") {
    throw new Error(
      `Expected BLOCK for remembered TAINTED target, got ${JSON.stringify(hit)}`,
    );
  }
  if (hit.usedAi !== false) {
    throw new Error("Tier-1 must set usedAi=false");
  }
  if (hit.source !== "registry") {
    throw new Error("Expected source=registry");
  }
  console.log("remembered TAINTED → BLOCK ok (usedAi=false, source=registry)");
  console.log("ok: shield tier-1 local gate");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
