/**
 * Shield Tier-1 — registry-first protection (no AI).
 *
 * This is the product thesis: a second encounter with a remembered target
 * returns BLOCK/WARN from on-chain memory alone. Graph + AI are NOT called here.
 *
 * ## Chain boundary (intentional)
 * - `targetChainId` = where the threat lives (almost always Ethereum mainnet = 1)
 * - `registryNetwork` = where we stored the memory (Sepolia product / Anvil local)
 * Looking up mainnet address `0xabc…` reads Sepolia registry for (chainId=1, target=0xabc…).
 */

import type { Address } from "viem";
import {
  getLatestIncidentByTarget,
  type OnChainIncident,
  type RegistryNetwork,
} from "../registry/client";
import { isRegistryDeployed } from "../registry/remember";

export type ShieldDecision = "ALLOW" | "WARN" | "BLOCK" | "ESCALATE";

export type ShieldCheckInput = {
  /** Chain of the *target* being checked (mainnet threats → 1). */
  targetChainId: number;
  address: string;
  /** Where security memory is deployed. Default sepolia. */
  registryNetwork?: RegistryNetwork;
};

export type ShieldCheckResult = {
  decision: ShieldDecision;
  reason: string;
  /** Always false for Tier-1 — proves hero demo (no second AI run). */
  usedAi: false;
  source: "registry" | "none";
  targetChainId: number;
  registryNetwork: RegistryNetwork;
  incident: OnChainIncident | null;
};

/**
 * Tier-1 check: registry lookup only.
 * - TAINTED → BLOCK
 * - WATCH → WARN
 * - SAFE on registry → ALLOW (rare; still subject to later policy)
 * - no hit / no deploy → ESCALATE (caller may investigate — never silent SAFE)
 */
export async function checkTargetTier1(
  input: ShieldCheckInput,
): Promise<ShieldCheckResult> {
  const registryNetwork = input.registryNetwork ?? "sepolia";
  const { targetChainId } = input;
  const address = input.address.toLowerCase();

  if (!Number.isInteger(targetChainId) || targetChainId <= 0) {
    throw new Error(`Invalid targetChainId: ${targetChainId}`);
  }
  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    throw new Error(`Invalid address: ${input.address}`);
  }

  const base = {
    usedAi: false as const,
    targetChainId,
    registryNetwork,
  };

  if (!isRegistryDeployed(registryNetwork)) {
    return {
      ...base,
      decision: "ESCALATE",
      reason: `Registry not deployed on ${registryNetwork} — escalate to investigate`,
      source: "none",
      incident: null,
    };
  }

  const incident = await getLatestIncidentByTarget(
    targetChainId,
    address as Address,
    registryNetwork,
  );

  if (!incident) {
    return {
      ...base,
      decision: "ESCALATE",
      reason: "No registry memory for this target — escalate to investigate",
      source: "none",
      incident: null,
    };
  }

  if (incident.status === "TAINTED") {
    return {
      ...base,
      decision: "BLOCK",
      reason: `Registry TAINTED (incident ${incident.incidentId})`,
      source: "registry",
      incident,
    };
  }

  if (incident.status === "WATCH") {
    return {
      ...base,
      decision: "WARN",
      reason: `Registry WATCH (incident ${incident.incidentId})`,
      source: "registry",
      incident,
    };
  }

  if (incident.status === "SAFE") {
    return {
      ...base,
      decision: "ALLOW",
      reason: `Registry SAFE (incident ${incident.incidentId}) — subject to later policy`,
      source: "registry",
      incident,
    };
  }

  // UNKNOWN on-chain should not happen; treat as escalate
  return {
    ...base,
    decision: "ESCALATE",
    reason: `Registry status ${incident.status} — escalate`,
    source: "registry",
    incident,
  };
}
