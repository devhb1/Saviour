/**
 * Prove plain-shield path without the Next server.
 *
 * Public Sepolia RPC + PermissionedResolver.text only (same as consumers/plain-shield.html).
 *
 *   pnpm check:plain-shield
 */

import {
  createPublicClient,
  http,
  namehash,
  parseAbi,
} from "viem";
import { sepolia } from "viem/chains";
import { loadRootEnv } from "../packages/core/src/config/env";

loadRootEnv();

const RESOLVER = "0xF479306621F718F7d76875f67506ceD33717751c" as const;
const PARENT = "saviours.eth";
const ATTACK_1 = "0x935bfb495e33f74d2e9735df1da66ace442ede48";
const VITALIK = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";

const abi = parseAbi([
  "function text(bytes32 node, string key) view returns (string)",
]);

function rpcUrl(): string {
  return (
    process.env.SEPOLIA_RPC_URL?.trim() ||
    "https://ethereum-sepolia-rpc.publicnode.com"
  );
}

function decisionFromStatus(status: string): string {
  const s = status.trim().toUpperCase();
  if (s === "TAINTED") return "BLOCK";
  if (s === "WATCH") return "WARN";
  if (s === "SAFE") return "ALLOW";
  return "ESCALATE";
}

async function readStatus(address: string): Promise<{
  ensName: string;
  status: string;
  decision: string;
  ms: number;
}> {
  const t0 = Date.now();
  const ensName = `${address.toLowerCase()}.${PARENT}`;
  const client = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl()),
  });
  const status = await client.readContract({
    address: RESOLVER,
    abi,
    functionName: "text",
    args: [namehash(ensName), "saviours.status"],
  });
  return {
    ensName,
    status,
    decision: decisionFromStatus(status),
    ms: Date.now() - t0,
  };
}

async function main() {
  console.log("check:plain-shield — public RPC + resolver ABI only (no Next)\n");
  console.log("rpc", rpcUrl().replace(/\/\/.*@/, "//***@"));

  const attack = await readStatus(ATTACK_1);
  console.log("ATTACK-1", {
    decision: attack.decision,
    status: attack.status,
    ms: attack.ms,
    ensName: attack.ensName,
  });
  if (attack.decision !== "BLOCK" || attack.status !== "TAINTED") {
    throw new Error(
      `expected BLOCK/TAINTED for ATTACK-1, got ${attack.decision}/${attack.status}`,
    );
  }

  const vitalik = await readStatus(VITALIK);
  console.log("Vitalik ", {
    decision: vitalik.decision,
    status: vitalik.status || "(empty)",
    ms: vitalik.ms,
  });
  if (vitalik.decision !== "ESCALATE") {
    throw new Error(`Vitalik expected ESCALATE, got ${vitalik.decision}`);
  }

  console.log("\nok: check:plain-shield (BLOCK without SAVIOURS server)");
  console.log("open: consumers/plain-shield.html (static file · any static server)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
