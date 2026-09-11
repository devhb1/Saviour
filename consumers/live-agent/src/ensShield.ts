/**
 * NOTE FOR JUDGES:
 * ensShield.ts imports nothing from SAVIOURS. It talks to Sepolia and the
 * PermissionedResolver directly. If www.saviours.xyz were deleted
 * right now, this agent would still get BLOCK on tainted addresses.
 * That is the entire point of putting the memory in ENS.
 */

import { createPublicClient, http, type Hex } from "viem";
import { namehash } from "viem/ens";
import { sepolia } from "viem/chains";

const RESOLVER = (process.env.SAVIOURS_RESOLVER ??
  "0xF479306621F718F7d76875f67506ceD33717751c") as Hex;

const PARENT = process.env.SAVIOURS_PARENT ?? "saviours.eth";

const textAbi = [
  {
    name: "text",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

export type EnsMemory = {
  status: string;
  threat?: string;
  evidenceHash?: string;
  atomicTx?: string;
  ensName: string;
};

function client() {
  const url = process.env.SEPOLIA_RPC_URL;
  if (!url) throw new Error("SEPOLIA_RPC_URL required");
  return createPublicClient({
    chain: sepolia,
    transport: http(url),
  });
}

async function readText(node: Hex, key: string): Promise<string> {
  return client().readContract({
    address: RESOLVER,
    abi: textAbi,
    functionName: "text",
    args: [node, key],
  });
}

export async function checkENS(address: string): Promise<EnsMemory> {
  const ensName = `${address.toLowerCase()}.${PARENT}`;
  const node = namehash(ensName) as Hex;
  const status = await readText(node, "saviours.status");
  if (!status) return { status: "UNKNOWN", ensName };

  const [threat, evidenceHash, atomicTx] = await Promise.all([
    readText(node, "saviours.threat"),
    readText(node, "saviours.evidenceHash"),
    readText(node, "saviours.atomicTx"),
  ]);

  return { status, threat, evidenceHash, atomicTx, ensName };
}
