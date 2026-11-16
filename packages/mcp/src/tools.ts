/**
 * MCP tool implementations — thin wrappers over @saviours/core.
 * Live ENS / Graph / registry only. No static chain payloads.
 */

import {
  checkTarget,
  ensNameForAddress,
  EXCLUDED_PROTOCOLS,
  getEvidenceBundle,
  getLatestIncidentByTarget,
  investigateDetailed,
  isRegistryDeployed,
  resolveIncident,
  STANDARD_PROTOCOLS,
} from "@saviours/core";

function requireAddress(address: string): `0x${string}` {
  const a = address.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(a)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return a as `0x${string}`;
}

/**
 * Base registry V2 resolve when SAVIOURS_BASE_REGISTRY is set.
 * Staging: Sepolia ENS remains default for check_target.
 */
export async function resolve_base_target(input: {
  address: string;
  subjectChainId?: number;
  txChainId?: number;
  registryNetwork?: "base" | "base-sepolia" | "anvil";
}) {
  const address = requireAddress(input.address);
  const registry = (process.env.SAVIOURS_BASE_REGISTRY ?? "").trim() as `0x${string}`;
  if (!/^0x[a-f0-9]{40}$/i.test(registry)) {
    return {
      action: "RPC_ERROR" as const,
      verifiedSafe: false as const,
      reason: "Set SAVIOURS_BASE_REGISTRY to SavioursRegistryV2 address",
      decision: "ESCALATE" as const,
    };
  }
  const { resolveBase, toDecision } = await import("@saviours/check");
  const result = await resolveBase(address, {
    registryAddress: registry,
    subjectChainId: input.subjectChainId ?? 8453,
    txChainId: input.txChainId ?? input.subjectChainId ?? 8453,
    registryNetwork: input.registryNetwork ?? "base-sepolia",
  });
  return { ...result, decision: toDecision(result.action) };
}

/**
 * Shield Tier-1 — ENS-first. Demo beat: BLOCK · source ENS · fresh investigation: NO.
 * Product home is Base V2 — see resolve_base_target + docs/PRODUCT_LAW.md.
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

/** Static Messari standards registry + excluded pins (no network). */
export function list_standard_protocols() {
  return {
    templateCount: new Set(STANDARD_PROTOCOLS.map((p) => p.family)).size,
    protocols: STANDARD_PROTOCOLS.map((p) => ({
      slug: p.slug,
      displayName: p.displayName,
      subgraphId: p.subgraphId,
      schema: p.schema,
      family: p.family,
    })),
    excluded: EXCLUDED_PROTOCOLS.map((p) => ({
      slug: p.slug,
      subgraphId: p.subgraphId,
      reason: p.reason,
    })),
    adapterA: {
      slug: "uniswap-v3-community",
      subgraphId: "5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV",
      note: "Community uni-v3 — not Messari-standardized",
    },
  };
}

/**
 * Read-only Graph fan-out for an address. No persist, no ENS write.
 */
export async function fanout_target(input: {
  address: string;
  chainId?: number;
}) {
  const address = requireAddress(input.address);
  const chainId = input.chainId ?? 1;
  const bundle = await getEvidenceBundle(chainId, address);
  return {
    banner: bundle.banner,
    adapterACount: bundle.adapterACount,
    signals: bundle.signals.map((s) => ({
      id: s.id,
      class: s.class,
      detail: s.detail,
    })),
    signalStatus: bundle.signalStatus,
    protocols: bundle.fanOut.results.map((r) => ({
      slug: r.protocol,
      subgraphId: r.subgraphId,
      status: r.status,
      ms: r.ms,
      rowCount: r.rowCount,
      schema: r.schema,
      family: r.family,
      error: r.error,
    })),
    excluded: bundle.fanOut.excluded,
    queryTemplates: bundle.fanOut.queryTemplates,
    protocolsQueried: bundle.fanOut.protocolsQueried,
    totalMs: bundle.fanOut.totalMs,
  };
}
