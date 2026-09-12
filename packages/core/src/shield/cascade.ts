/**
 * Clone-defense cascade (ENDGAME Phase 4).
 *
 * After address-name MISS:
 *   1. eth_getCode(target) on evidence chain (default mainnet)
 *   2. Resolve code-<hash20>.saviours.eth (only if UserRegistry still has the label)
 *   3. If classSeed === target → exact class seed (never "clone of itself")
 *   4. Else → clone of named threat · first sighting
 *
 * Still 0 Graph · 0 AI. Only fires when a class name is actually registered.
 */

import {
  createPublicClient,
  http,
  type Address,
  type Chain,
  type Hex,
} from "viem";
import { mainnet } from "viem/chains";
import { ensNameForRuntimeCode, labelForRuntimeCode } from "../ens/label";
import {
  isEnsLabelRegistered,
  resolveIncidentName,
  type IncidentRecords,
} from "../ens/resolve";
import { isEnsIdentityReady } from "../ens/identity";

type CascadeDecision = "WARN" | "BLOCK";

export type CascadeHit = {
  decision: CascadeDecision;
  reason: string;
  ensName: string;
  /** "code-seed" = this address *is* the class seed (never call it a clone). */
  layer: "code" | "deployer" | "code-seed";
  runtimeCodeHashPrefix?: string;
  status: string;
  records: IncidentRecords;
  classSeed?: string;
  isClassSeed?: boolean;
};

function evidenceClient(targetChainId: number) {
  if (targetChainId !== 1) return null;
  const url =
    process.env.MAINNET_RPC_URL?.trim() ||
    process.env.ETH_RPC_URL?.trim() ||
    "";
  if (!url) return null;
  return createPublicClient({
    chain: mainnet as Chain,
    transport: http(url),
  });
}

function decisionFromStatus(status: string): CascadeDecision | null {
  const s = status.trim().toUpperCase();
  if (s === "TAINTED") return "BLOCK";
  if (s === "WATCH") return "WARN";
  return null;
}

/** Prefer explicit classSeed; fall back to parsing legacy threat text. */
export function classSeedFromRecords(
  records: IncidentRecords,
): string | null {
  const explicit = (records["saviours.classSeed"] ?? "").trim().toLowerCase();
  if (/^0x[a-f0-9]{40}$/.test(explicit)) return explicit;
  const threat = records["saviours.threat"] ?? "";
  const m = threat.match(/0x[a-fA-F0-9]{40}/);
  return m ? m[0]!.toLowerCase() : null;
}

/**
 * Look up class memory for bytecode. Returns null on EOA, missing RPC,
 * wrong chain, or unregistered class name — never invents a hit.
 */
export async function resolveCodeClassMemory(
  address: string,
  targetChainId = 1,
): Promise<CascadeHit | null> {
  if (!isEnsIdentityReady()) return null;
  const client = evidenceClient(targetChainId);
  if (!client) return null;

  const target = address.toLowerCase();
  let code: Hex;
  try {
    code =
      (await client.getBytecode({
        address: target as Address,
      })) ?? "0x";
  } catch {
    return null;
  }

  if (!code || code === "0x") return null;

  const label = labelForRuntimeCode(code);
  const ensName = ensNameForRuntimeCode(code);
  if (!label || !ensName) return null;

  try {
    const registered = await isEnsLabelRegistered(label);
    if (!registered) return null;

    const resolved = await resolveIncidentName(ensName, {
      keys: [
        "saviours.status",
        "saviours.threat",
        "saviours.plainVerdict",
        "saviours.classSeed",
        "saviours.classKind",
      ],
    });
    const status = resolved.records["saviours.status"] ?? "";
    const fromEns = decisionFromStatus(status);
    if (!fromEns || !resolved.hit) return null;

    const prefix = label.replace(/^code-/, "");
    const seed = classSeedFromRecords(resolved.records);
    const isClassSeed = Boolean(seed && seed === target);

    if (isClassSeed) {
      return {
        decision: fromEns,
        reason: `Named threat (exact) · ${status} via bytecode class seed ${ensName}`,
        ensName,
        layer: "code-seed",
        runtimeCodeHashPrefix: prefix,
        status,
        records: resolved.records,
        classSeed: seed ?? undefined,
        isClassSeed: true,
      };
    }

    return {
      decision: fromEns,
      reason: `Clone of named threat · ${status} via ${ensName} (bytecode class · first sighting of this address)`,
      ensName,
      layer: "code",
      runtimeCodeHashPrefix: prefix,
      status,
      records: resolved.records,
      classSeed: seed ?? undefined,
      isClassSeed: false,
    };
  } catch {
    return null;
  }
}
