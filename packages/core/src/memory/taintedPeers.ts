/**
 * Resolve currently TAINTED security-memory peers for REGISTRY_COOCCURRENCE.
 *
 * Seeds = locked demo ATTACK-* addresses (from evals/demo-targets.json) plus
 * any extra addresses passed in. Each seed is checked live via ENS status
 * then SavioursRegistry — never assumed TAINTED from the JSON alone.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isEnsIdentityReady } from "../ens/identity";
import { resolveIncident } from "../ens/resolve";
import { repoRoot } from "../paths";
import {
  getLatestIncidentByTarget,
  type RegistryNetwork,
} from "../registry/client";
import { isRegistryDeployed } from "../registry/remember";
export type TaintedPeer = {
  address: `0x${string}`;
  source: "ens" | "registry";
  status: "TAINTED";
};

/** Locked demo ATTACK-* addresses — candidates only until ENS/registry confirms. */
export function loadDemoAttackSeeds(): `0x${string}`[] {
  const path = resolve(repoRoot(), "evals/demo-targets.json");
  if (!existsSync(path)) return [];
  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    targets?: { id: string; address: string }[];
  };
  const out: `0x${string}`[] = [];
  for (const t of raw.targets ?? []) {
    if (!t.id.startsWith("ATTACK-")) continue;
    if (!/^0x[a-fA-F0-9]{40}$/.test(t.address)) continue;
    out.push(t.address.toLowerCase() as `0x${string}`);
  }
  return out;
}

async function statusViaEns(address: string): Promise<"TAINTED" | null> {
  if (!isEnsIdentityReady()) return null;
  try {
    const r = await resolveIncident(address, { keys: ["saviours.status"] });
    const s = (r.records["saviours.status"] ?? "").toUpperCase();
    return s === "TAINTED" ? "TAINTED" : null;
  } catch {
    return null;
  }
}

async function statusViaRegistry(
  chainId: number,
  address: `0x${string}`,
  network: RegistryNetwork,
): Promise<"TAINTED" | null> {
  if (!isRegistryDeployed(network)) return null;
  try {
    const row = await getLatestIncidentByTarget(chainId, address, network);
    if (row?.status === "TAINTED") return "TAINTED";
    return null;
  } catch {
    return null;
  }
}

/**
 * Live TAINTED peer set for co-occurrence probes.
 */
export async function listTaintedPeers(opts: {
  chainId?: number;
  registryNetwork?: RegistryNetwork;
  /** Extra candidate addresses (still verified live) */
  seeds?: Iterable<string>;
  /** Include demo ATTACK-* seeds (default true) */
  includeDemoAttacks?: boolean;
} = {}): Promise<TaintedPeer[]> {
  const chainId = opts.chainId ?? 1;
  const network = opts.registryNetwork ?? "sepolia";
  const candidates = new Set<string>();

  if (opts.includeDemoAttacks !== false) {
    for (const a of loadDemoAttackSeeds()) candidates.add(a);
  }
  for (const a of opts.seeds ?? []) {
    if (/^0x[a-fA-F0-9]{40}$/.test(a)) candidates.add(a.toLowerCase());
  }

  const peers: TaintedPeer[] = [];
  for (const addr of candidates) {
    const hex = addr as `0x${string}`;
    const ens = await statusViaEns(hex);
    if (ens === "TAINTED") {
      peers.push({ address: hex, source: "ens", status: "TAINTED" });
      continue;
    }
    const reg = await statusViaRegistry(chainId, hex, network);
    if (reg === "TAINTED") {
      peers.push({ address: hex, source: "registry", status: "TAINTED" });
    }
  }
  return peers;
}
