/**
 * Clone-defense cascade (ENDGAME Phase 4).
 *
 * After address-name MISS:
 *   1. eth_getCode(target) on evidence chain (mainnet)
 *   2. Resolve code-<hash20>.saviours.eth
 *   3. (Optional later) deployer-<addr>.saviours.eth
 *
 * Still 0 Graph · 0 AI. Only fires when a class name is actually registered.
 */

import {
  createPublicClient,
  http,
  type Address,
  type Hex,
} from "viem";
import { mainnet } from "viem/chains";
import { ensNameForRuntimeCode } from "../ens/label";
import {
  resolveIncidentName,
  type IncidentRecords,
} from "../ens/resolve";
import { isEnsIdentityReady } from "../ens/identity";

type CascadeDecision = "WARN" | "BLOCK";

export type CascadeHit = {
  decision: CascadeDecision;
  reason: string;
  ensName: string;
  layer: "code" | "deployer";
  runtimeCodeHashPrefix?: string;
  status: string;
  records: IncidentRecords;
};

function mainnetClient() {
  const url =
    process.env.MAINNET_RPC_URL?.trim() ||
    process.env.ETH_RPC_URL?.trim() ||
    "";
  if (!url) return null;
  return createPublicClient({
    chain: mainnet,
    transport: http(url),
  });
}

function decisionFromStatus(status: string): CascadeDecision | null {
  const s = status.trim().toUpperCase();
  // SAFE is never named under product law — ignore if present.
  if (s === "TAINTED") return "BLOCK";
  if (s === "WATCH") return "WARN";
  return null;
}

/**
 * Look up class memory for bytecode. Returns null on EOA, missing RPC,
 * or unregistered class name — never invents a hit.
 */
export async function resolveCodeClassMemory(
  address: string,
): Promise<CascadeHit | null> {
  if (!isEnsIdentityReady()) return null;
  const client = mainnetClient();
  if (!client) return null;

  let code: Hex;
  try {
    // viem public client: getBytecode (getCode is not present on all versions)
    code =
      (await client.getBytecode({
        address: address.toLowerCase() as Address,
      })) ?? "0x";
  } catch {
    return null;
  }

  if (!code || code === "0x") return null;

  const ensName = ensNameForRuntimeCode(code);
  if (!ensName) return null;

  try {
    const resolved = await resolveIncidentName(ensName, {
      keys: ["saviours.status", "saviours.threat", "saviours.plainVerdict"],
    });
    const status = resolved.records["saviours.status"] ?? "";
    const fromEns = decisionFromStatus(status);
    if (!fromEns || !resolved.hit) return null;

    const prefix = ensName.split(".")[0]?.replace(/^code-/, "") ?? "";
    return {
      decision: fromEns,
      reason: `Clone of named threat · ${status} via ${ensName} (bytecode class · first sighting of this address)`,
      ensName,
      layer: "code",
      runtimeCodeHashPrefix: prefix,
      status,
      records: resolved.records,
    };
  } catch {
    return null;
  }
}
