/**
 * MCP tool implementations — thin wrappers over @saviours/core.
 * Live ENS / Graph / registry only. No static chain payloads.
 */

import {
  checkTarget,
  ensNameForAddress,
  getLatestIncidentByTarget,
  investigateDetailed,
  isRegistryDeployed,
  resolveIncident,
} from "@saviours/core";

function requireAddress(address: string): `0x${string}` {
  const a = address.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(a)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return a as `0x${string}`;
}

/**
 * Shield Tier-1 — ENS-first. Demo beat: BLOCK · source ENS · fresh investigation: NO.
 */
export async function check_target(input: {
  address: string;
  chainId?: number;
  registryNetwork?: "sepolia" | "anvil";
}) {
  const address = requireAddress(input.address);
  const chainId = input.chainId ?? 1;
  const registryNetwork = input.registryNetwork ?? "sepolia";
  const t0 = Date.now();
  const result = await checkTarget({
    targetChainId: chainId,
    address,
    registryNetwork,
  });
  return {
    decision: result.decision,
    reason: result.reason,
    source: result.source,
    usedAi: result.usedAi,
    freshInvestigation: false,
    ensName: result.ensName,
    status: result.records?.["saviours.status"] ?? null,
    latencyMs: result.latencyMs || Date.now() - t0,
    cost: result.cost,
    summary: `${result.decision} · known ${result.records?.["saviours.status"] ?? result.source} · source ${result.source.toUpperCase()} · fresh investigation: NO`,
  };
}

/**
 * Full investigate (Shield pre-check → Graph → signals → explain).
 * Default persist=false for MCP (read-mostly); set persist=true to Remember.
 */
export async function investigate_target(input: {
  address: string;
  chainId?: number;
  persist?: boolean;
  forceFresh?: boolean;
  registryNetwork?: "sepolia" | "anvil";
}) {
  const address = requireAddress(input.address);
  const chainId = input.chainId ?? 1;
  const opts = {
    forceFresh: input.forceFresh,
    registryNetwork: input.registryNetwork ?? ("sepolia" as const),
  };

  if (input.persist) {
    const { investigateAndRemember } = await import("@saviours/core");
    const full = await investigateAndRemember(chainId, address, {
      persist: true,
      ...opts,
    });
    return {
      status: full.assessment.status,
      confidence: full.assessment.confidence,
      memoryHit: full.run.memoryHit,
      signals: full.run.signals.map((s) => s.id),
      banner: full.run.banner,
      explanation: full.run.explanation,
      cost: full.run.cost,
      remember: full.remember,
      shield: {
        decision: full.run.shield.decision,
        source: full.run.shield.source,
      },
    };
  }

  const run = await investigateDetailed(chainId, address, {
    persist: false,
    ...opts,
  });

  return {
    status: run.assessment.status,
    confidence: run.assessment.confidence,
    memoryHit: run.memoryHit,
    signals: run.signals.map((s) => s.id),
    banner: run.banner,
    explanation: run.explanation,
    cost: run.cost,
    remember: null,
    shield: {
      decision: run.shield.decision,
      source: run.shield.source,
    },
  };
}

/**
 * Resolve ENS incident texts + optional registry row.
 */
export async function get_incident(input: {
  address: string;
  chainId?: number;
  registryNetwork?: "sepolia" | "anvil";
}) {
  const address = requireAddress(input.address);
  const chainId = input.chainId ?? 1;
  const network = input.registryNetwork ?? "sepolia";
  const ensName = ensNameForAddress(address);
  const resolved = await resolveIncident(address);

  let registry = null;
  if (isRegistryDeployed(network)) {
    registry = await getLatestIncidentByTarget(chainId, address, network);
  }

  return {
    ensName,
    hit: resolved.hit,
    source: resolved.source,
    records: resolved.records,
    registry: registry
      ? {
          incidentId: registry.incidentId,
          status: registry.status,
          evidenceHash: registry.evidenceHash,
          confidenceBucket: registry.confidenceBucket,
          expiresAt: registry.expiresAt,
        }
      : null,
  };
}
