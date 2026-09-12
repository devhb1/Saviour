/**
 * Name one bytecode class for clone-defense demo (ENDGAME 4.5).
 *
 *   pnpm exec tsx scripts/name-code-class.ts
 *   pnpm exec tsx scripts/name-code-class.ts --dry-run
 *   pnpm exec tsx scripts/name-code-class.ts --address 0x…
 */

import { createPublicClient, http, type Hex } from "viem";
import { mainnet } from "viem/chains";
import { loadRootEnv } from "../packages/core/src/config/env";
import {
  ensNameForRuntimeCode,
  labelForRuntimeCode,
} from "../packages/core/src/ens/label";
import { registerCodeClassName } from "../packages/core/src/ens/client";
import { resolveIncidentName } from "../packages/core/src/ens/resolve";
import { isEnsIdentityReady } from "../packages/core/src/ens/identity";
import { checkTarget } from "../packages/core/src/shield/check";

loadRootEnv();

const ATTACK_1 = "0x935bfb495e33f74d2e9735df1da66ace442ede48";

function arg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  return process.argv[i + 1] ?? null;
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  const address = (arg("--address") || ATTACK_1).trim().toLowerCase();
  const status = (arg("--status") || "TAINTED").toUpperCase() as
    | "TAINTED"
    | "WATCH";
  if (status !== "TAINTED" && status !== "WATCH") {
    throw new Error("status must be TAINTED or WATCH");
  }
  if (!isEnsIdentityReady()) throw new Error("ENS identity not ready");

  const mainnetRpc =
    process.env.MAINNET_RPC_URL?.trim() || process.env.ETH_RPC_URL?.trim();
  if (!mainnetRpc) throw new Error("MAINNET_RPC_URL or ETH_RPC_URL required");

  const client = createPublicClient({
    chain: mainnet,
    transport: http(mainnetRpc),
  });
  const code =
    (await client.getBytecode({
      address: address as `0x${string}`,
    })) ?? "0x";
  if (!code || code === "0x") {
    throw new Error(`${address} has no bytecode (EOA)`);
  }

  const label = labelForRuntimeCode(code)!;
  const ensName = ensNameForRuntimeCode(code)!;
  console.log({ address, bytes: (code.length - 2) / 2, label, ensName, status });

  const before = await resolveIncidentName(ensName, {
    keys: ["saviours.status"],
  });
  console.log("BEFORE", { hit: before.hit, status: before.records["saviours.status"] });

  if (dry) {
    console.log("(dry-run) stop");
    return;
  }

  const registered = await registerCodeClassName({
    bytecode: code,
    status,
    incidentLabel: `SAV-CODE-${label.slice(5, 13)}`,
    confidence: 0.92,
    threat: `CLONE_CLASS · seed ${address}`,
    plainVerdict:
      "Bytecode class of a named threat — clones of this code are blocked on first sighting",
    evidenceHash: (`0x${"11".repeat(32)}`) as Hex,
    classSeed: address,
  });
  console.log("registered", registered.ensName, registered.txHash ?? "(reused)");

  const after = await resolveIncidentName(ensName, {
    keys: ["saviours.status", "saviours.plainVerdict"],
  });
  console.log("AFTER", {
    hit: after.hit,
    status: after.records["saviours.status"],
    plain: after.records["saviours.plainVerdict"],
  });
  if (!after.hit || after.records["saviours.status"] !== status) {
    throw new Error("class name not readable");
  }

  // Address path still hits address ENS first for ATTACK-1 itself.
  const shield = await checkTarget({
    targetChainId: 1,
    address,
    registryNetwork: "sepolia",
  });
  console.log("SHIELD seed address", {
    decision: shield.decision,
    cascadeLayer: shield.cascadeLayer,
    ensName: shield.ensName,
  });

  console.log("\nok: code class named — cascade ready for unnamed clones of this bytecode");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
