/**
 * Shield Tier-1 — ENS-first protection (no AI, no Graph).
 *
 * Product thesis (PIVOT §3.2): second encounter resolves memory via ENS text
 * `saviours.status`, then falls back to SavioursRegistry. Never silent SAFE.
 *
 * ## Chain boundary
 * - `targetChainId` = threat chain (almost always mainnet = 1)
 * - ENS + registry memory live on Sepolia
 * - Anvil: ENS skipped → registry-only (local gates)
 */

import type { Address } from "viem";
import { isEnsIdentityReady } from "../ens/identity";
import {
  resolveIncident,
  type IncidentRecords,
} from "../ens/resolve";
import {
  getLatestIncidentByTarget,
  type OnChainIncident,
  type RegistryNetwork,
} from "../registry/client";
import { isRegistryDeployed } from "../registry/remember";
import { resolveCodeClassMemory } from "./cascade";

/**
 * Addresses that must never produce Shield memory hits.
 * Registry is append-only — demo pollution / celebrities / victim pools
 * stay on-chain, but Shield treats them as NO MEMORY (ESCALATE).
 */
const SHIELD_NEVER_PIN = new Set([
  "0xd8da6bf26964af9d7eed9e03e53415d37aa96045", // vitalik.eth
  "0xc74b72bbf904bac9fac880303922fc76a69f0bb4", // HopeLend victim pool
]);

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
  source: "ens" | "registry" | "none";
  targetChainId: number;
  registryNetwork: RegistryNetwork;
  incident: OnChainIncident | null;
  /** Wall-clock for the check (MEMORY HIT card). */
  latencyMs: number;
  /** ENS name resolved (address-label under parent), if attempted */
  ensName: string | null;
  /** ENS text records when source=ens (or partial probe) */
  records: IncidentRecords | null;
  /** Clone-defense layer when hit via bytecode class name */
  cascadeLayer?: "code" | "deployer";
  /**
   * Always-on class probe (even when address ENS already hit).
   * Lets UI show "this bytecode is named" without needing an unnamed clone.
   */
  codeClass?: {
    ensName: string;
    hit: boolean;
    status?: string;
    layer: "code";
  };
  /** Graph / AI counters for hero card — always zero on Tier-1 */
  cost: {
    graphQueries: 0;
    aiCalls: 0;
    ensResolutions: number;
    shieldChecks: 1;
  };
};

function decisionFromStatus(status: string): ShieldDecision | null {
  const s = status.trim().toUpperCase();
  if (s === "TAINTED") return "BLOCK";
  if (s === "WATCH") return "WARN";
  if (s === "SAFE") return "ALLOW";
  return null;
}

/**
 * Tier-1: ENS text(saviours.status) first → registry fallback → ESCALATE.
 */
export async function checkTargetTier1(
  input: ShieldCheckInput,
): Promise<ShieldCheckResult> {
  const t0 = Date.now();
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

  if (SHIELD_NEVER_PIN.has(address)) {
    return {
      ...base,
      decision: "ESCALATE",
      reason:
        "Denylisted address (celebrity / victim pool / purged false positive) — never treat as threat memory",
      source: "none",
      incident: null,
      latencyMs: Date.now() - t0,
      ensName: null,
      records: null,
      cost: {
        graphQueries: 0,
        aiCalls: 0,
        ensResolutions: 0,
        shieldChecks: 1,
      },
    };
  }

  let ensResolutions = 0;
  let ensName: string | null = null;
  let records: IncidentRecords | null = null;

  // --- 1) ENS-first (Sepolia product only) — status only on hot path ---
  if (registryNetwork === "sepolia" && isEnsIdentityReady()) {
    try {
      const resolved = await resolveIncident(address, {
        keys: ["saviours.status"],
      });
      // One name resolve for the decision key (not a 9-key fan-out).
      ensResolutions = resolved.hit ? 1 : 0;
      ensName = resolved.ensName;
      records = resolved.records;

      const status = resolved.records["saviours.status"] ?? "";
      const fromEns = decisionFromStatus(status);
      if (fromEns) {
        // Address hit — still probe bytecode class so UI can show clone memory is armed
        let codeClass: ShieldCheckResult["codeClass"];
        let extraEns = 0;
        try {
          const classHit = await resolveCodeClassMemory(address, targetChainId);
          if (classHit) {
            extraEns = 1;
            codeClass = {
              ensName: classHit.ensName,
              hit: true,
              status: classHit.status,
              layer: "code",
            };
          }
        } catch {
          // soft
        }
        return {
          ...base,
          decision: fromEns,
          reason: `ENS ${status} via ${resolved.ensName} (${resolved.source})`,
          source: "ens",
          incident: null,
          latencyMs: Date.now() - t0,
          ensName,
          records,
          codeClass,
          cost: {
            graphQueries: 0,
            aiCalls: 0,
            ensResolutions: ensResolutions + extraEns,
            shieldChecks: 1,
          },
        };
      }
    } catch (e) {
      // Soft-fail ENS → registry fallback (never invent a verdict)
      ensName = null;
      records = null;
      void e;
    }
  }

  // --- 1b) Clone cascade: bytecode class name (still 0 Graph · 0 AI) ---
  if (registryNetwork === "sepolia" && isEnsIdentityReady()) {
    try {
      const classHit = await resolveCodeClassMemory(address, targetChainId);
      if (classHit) {
        ensResolutions += 1;
        return {
          ...base,
          decision: classHit.decision,
          reason: classHit.reason,
          source: "ens",
          incident: null,
          latencyMs: Date.now() - t0,
          ensName: classHit.ensName,
          records: classHit.records,
          cascadeLayer: classHit.layer,
          codeClass: {
            ensName: classHit.ensName,
            hit: true,
            status: classHit.status,
            layer: "code",
          },
          cost: {
            graphQueries: 0,
            aiCalls: 0,
            ensResolutions,
            shieldChecks: 1,
          },
        };
      }
    } catch {
      // soft-fail — continue to registry
    }
  }

  // --- 2) Registry fallback ---
  if (!isRegistryDeployed(registryNetwork)) {
    return {
      ...base,
      decision: "ESCALATE",
      reason: `No ENS status; registry not deployed on ${registryNetwork}`,
      source: "none",
      incident: null,
      latencyMs: Date.now() - t0,
      ensName,
      records,
      cost: {
        graphQueries: 0,
        aiCalls: 0,
        ensResolutions,
        shieldChecks: 1,
      },
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
      reason: "No ENS status and no registry memory — escalate to investigate",
      source: "none",
      incident: null,
      latencyMs: Date.now() - t0,
      ensName,
      records,
      cost: {
        graphQueries: 0,
        aiCalls: 0,
        ensResolutions,
        shieldChecks: 1,
      },
    };
  }

  if (incident.status === "TAINTED") {
    return {
      ...base,
      decision: "BLOCK",
      reason: `Registry TAINTED (incident ${incident.incidentId})`,
      source: "registry",
      incident,
      latencyMs: Date.now() - t0,
      ensName,
      records,
      cost: {
        graphQueries: 0,
        aiCalls: 0,
        ensResolutions,
        shieldChecks: 1,
      },
    };
  }

  if (incident.status === "WATCH") {
    return {
      ...base,
      decision: "WARN",
      reason: `Registry WATCH (incident ${incident.incidentId})`,
      source: "registry",
      incident,
      latencyMs: Date.now() - t0,
      ensName,
      records,
      cost: {
        graphQueries: 0,
        aiCalls: 0,
        ensResolutions,
        shieldChecks: 1,
      },
    };
  }

  if (incident.status === "SAFE") {
    return {
      ...base,
      decision: "ALLOW",
      reason: `Registry SAFE (incident ${incident.incidentId})`,
      source: "registry",
      incident,
      latencyMs: Date.now() - t0,
      ensName,
      records,
      cost: {
        graphQueries: 0,
        aiCalls: 0,
        ensResolutions,
        shieldChecks: 1,
      },
    };
  }

  return {
    ...base,
    decision: "ESCALATE",
    reason: `Registry status ${incident.status} — escalate`,
    source: "registry",
    incident,
    latencyMs: Date.now() - t0,
    ensName,
    records,
    cost: {
      graphQueries: 0,
      aiCalls: 0,
      ensResolutions,
      shieldChecks: 1,
    },
  };
}
