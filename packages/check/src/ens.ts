/**
 * ENS-only check — imports nothing from @saviours/core.
 * Mirror of consumers/live-agent/src/ensShield.ts.
 */

import { createPublicClient, http, type Hex } from "viem";
import { namehash } from "viem/ens";
import { sepolia } from "viem/chains";
import type { CheckOptions, CheckResult, Decision } from "./types.js";

const DEFAULT_RESOLVER =
  "0xF479306621F718F7d76875f67506ceD33717751c" as Hex;

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

function requireAddress(address: string): `0x${string}` {
  const a = address.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(a)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return a as `0x${string}`;
}

function decisionFromStatus(status: string): Decision {
  const s = status.toUpperCase();
  if (s === "TAINTED") return "BLOCK";
  if (s === "WATCH") return "WARN";
  if (s === "SAFE") return "ALLOW";
  return "ESCALATE";
}

export async function checkEns(
  address: string,
  opts: CheckOptions = {},
): Promise<CheckResult> {
  const addr = requireAddress(address);
  const parent = opts.parent ?? "saviours.eth";
  const resolver = (opts.resolver ?? DEFAULT_RESOLVER) as Hex;
  const rpcUrl =
    opts.rpcUrl ??
    process.env.SEPOLIA_RPC_URL ??
    "https://ethereum-sepolia-rpc.publicnode.com";

  const ensName = `${addr}.${parent}`;
  const t0 = Date.now();
  const client = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });
  const node = namehash(ensName) as Hex;

  const readText = (key: string) =>
    client.readContract({
      address: resolver,
      abi: textAbi,
      functionName: "text",
      args: [node, key],
    });

  const status = (await readText("saviours.status")).trim();
  if (!status) {
    return {
      decision: "ESCALATE",
      status: "UNKNOWN",
      ensName,
      source: "none",
      reason: "No saviours.status on ENS",
      latencyMs: Date.now() - t0,
      cost: { graph: 0, ai: 0, usd: 0 },
      mode: "ens",
    };
  }

  const [threat, evidenceHash, atomicTx] = await Promise.all([
    readText("saviours.threat"),
    readText("saviours.evidenceHash"),
    readText("saviours.atomicTx"),
  ]);

  return {
    decision: decisionFromStatus(status),
    status,
    ensName,
    source: "ens",
    threat: threat || undefined,
    evidenceHash: evidenceHash || undefined,
    atomicTx: atomicTx || undefined,
    latencyMs: Date.now() - t0,
    cost: { graph: 0, ai: 0, usd: 0 },
    mode: "ens",
  };
}
