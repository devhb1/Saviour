import type { Address, Hex, PublicClient } from "viem";
import type { CoverageGap } from "./types.js";
import { ROLES_V1_MASTERCOPY, rolesModifierV2Abi } from "./rolesAbi.js";
import { rolesPolicyFromChainLogs } from "./rolesLogs.js";

/** Current Zodiac Roles v2 mastercopy (2.1.1). */
export const ROLES_V211_MASTERCOPY =
  "0xf2964ce6161ce0e75964fe7927ce114cb0b283d5" as const;

/** Faulty 2.1.0 — identify only. */
export const ROLES_V210_FAULTY =
  "0x9646fdad06d3e24444381f44362a3b0eb343d337" as const;

export type RolesTargetClearance = {
  address: Hex;
  clearance: string;
  functions: Array<{
    selector: Hex;
    wildcarded: boolean;
    executionOptions: string;
    conditionId?: string | null;
  }>;
};

export type RolesRole = {
  key: Hex;
  members: Hex[];
  targets: RolesTargetClearance[];
};

export type RolesPolicy = {
  rolesAddress: Hex;
  mastercopy: Hex | null;
  version: "v2.1.1" | "v2.1.0-faulty" | "v1" | "unknown";
  status: "reconstructed" | "unsupported" | "partial" | "failed";
  roles: RolesRole[];
  hasAllowanceData: boolean;
  gaps: CoverageGap[];
  reconstructed: string[];
  source: "chain-logs" | "subgraph+chain" | "chain-only" | "none";
};

type SubgraphRole = {
  key: string;
  members?: Array<{ address: string }>;
  targets?: Array<{
    address: string;
    clearance?: string;
    functions?: Array<{
      selector: string;
      wildcarded?: boolean;
      executionOptions?: string;
      condition?: { id?: string } | null;
    }>;
  }>;
};

/**
 * Reconstruct Roles v2.1.1 policy at a pinned block.
 * Subgraph = discovery oracle; mastercopy + sample on-chain reads = trust root.
 * Non-2.1.1 → unsupported (caller should version-gate before calling).
 */
export async function reconstructRolesPolicy(opts: {
  client: PublicClient;
  rolesAddress: Hex;
  blockNumber: bigint;
  mastercopy: Hex | null;
  versionHint: "v1" | "v2" | "unknown";
  probeMembers?: Hex[];
}): Promise<RolesPolicy> {
  const addr = opts.rolesAddress.toLowerCase() as Hex;
  const gaps: CoverageGap[] = [];
  const reconstructed: string[] = [];
  const mc = opts.mastercopy?.toLowerCase() ?? null;

  if (mc === ROLES_V1_MASTERCOPY.toLowerCase()) {
    return {
      rolesAddress: addr,
      mastercopy: mc as Hex,
      version: "v1",
      status: "unsupported",
      roles: [],
      hasAllowanceData: false,
      gaps: [
        {
          area: `roles:${addr}:v1`,
          reason:
            "Roles v1 — use fixture-scoped v1 reader for Nov16; not interpreted with v2.1.1 adapter",
        },
      ],
      reconstructed,
      source: "none",
    };
  }

  if (mc === ROLES_V210_FAULTY) {
    return {
      rolesAddress: addr,
      mastercopy: mc as Hex,
      version: "v2.1.0-faulty",
      status: "unsupported",
      roles: [],
      hasAllowanceData: false,
      gaps: [
        {
          area: `roles:${addr}:faulty`,
          reason: "Roles 2.1.0 is faulty — identify only; do not treat as 2.1.1",
        },
      ],
      reconstructed,
      source: "none",
    };
  }

  if (mc !== ROLES_V211_MASTERCOPY) {
    return {
      rolesAddress: addr,
      mastercopy: mc as Hex | null,
      version: "unknown",
      status: "unsupported",
      roles: [],
      hasAllowanceData: false,
      gaps: [
        {
          area: `roles:${addr}:unknown-impl`,
          reason: `Unknown Roles implementation ${mc ?? "null"} — UNKNOWN`,
        },
      ],
      reconstructed,
      source: "none",
    };
  }

  reconstructed.push(`rolesModel:v2.1.1:${addr}`);

  // On-chain trust: confirm avatar still readable at pinned block
  try {
    const avatar = (await opts.client.readContract({
      address: addr as Address,
      abi: rolesModifierV2Abi,
      functionName: "avatar",
      blockNumber: opts.blockNumber,
    })) as Address;
    reconstructed.push(`chain.avatar:${avatar.toLowerCase()}`);
  } catch (e) {
    gaps.push({
      area: `roles:${addr}:chain`,
      reason: `Pinned-block avatar read failed: ${e instanceof Error ? e.message : String(e)}`,
    });
    return {
      rolesAddress: addr,
      mastercopy: mc as Hex,
      version: "v2.1.1",
      status: "failed",
      roles: [],
      hasAllowanceData: false,
      gaps,
      reconstructed,
      source: "chain-only",
    };
  }

  let roles: RolesRole[] = [];
  let source: RolesPolicy["source"] = "none";
  let hasAllowanceData = false;

  const chain = await rolesPolicyFromChainLogs({
    client: opts.client,
    rolesAddress: addr,
    toBlock: opts.blockNumber,
  });
  gaps.push(...chain.gaps);
  reconstructed.push(...chain.reconstructed);
  if (chain.roles.length > 0) {
    return {
      rolesAddress: addr,
      mastercopy: mc as Hex,
      version: "v2.1.1",
      status: chain.status === "failed" ? "partial" : chain.status,
      roles: chain.roles,
      hasAllowanceData: chain.hasAllowanceData,
      gaps,
      reconstructed,
      source: "chain-logs",
    };
  }

  try {
    const sg = await fetchRolesFromSubgraph(addr);
    if (sg) {
      source = "subgraph+chain";
      roles = sg.roles;
      hasAllowanceData = sg.hasAllowanceData;
      reconstructed.push(`subgraph.roles:${roles.length}`);
      for (const r of roles) {
        reconstructed.push(
          `role:${r.key}:members=${r.members.length}:targets=${r.targets.length}`,
        );
      }
      // Subgraph is tip-indexed — note freshness gap vs pinned block
      gaps.push({
        area: `roles:${addr}:subgraph-freshness`,
        reason:
          "Permission trees discovered via Zodiac Roles subgraph (tip). Differential vs SDK/App at the exact pinned block still required for R1; treat as partial until verified.",
      });
    } else if (!process.env.ZODIAC_API_KEY?.trim()) {
      gaps.push({
        area: `roles:${addr}:permissions`,
        reason:
          "No permission events in the chain log index at this block, and ZODIAC_API_KEY is unset. The public Zodiac squid URL is retired.",
      });
      source = "chain-logs";
    } else {
      gaps.push({
        area: `roles:${addr}:subgraph`,
        reason: "Subgraph returned no rolesModifier — partial / UNKNOWN",
      });
      source = "chain-only";
    }
  } catch (e) {
    gaps.push({
      area: `roles:${addr}:subgraph`,
      reason: `Subgraph fetch failed: ${e instanceof Error ? e.message : String(e)}`,
    });
    source = "chain-only";
  }

  // Probe defaultRoles for optional addresses (not proof of full membership set)
  for (const m of opts.probeMembers ?? []) {
    try {
      const role = await opts.client.readContract({
        address: addr as Address,
        abi: rolesModifierV2Abi,
        functionName: "defaultRoles",
        args: [m as Address],
        blockNumber: opts.blockNumber,
      });
      reconstructed.push(`defaultRoles:${m.toLowerCase()}=${role}`);
    } catch {
      /* ignore */
    }
  }

  const status: RolesPolicy["status"] =
    roles.length > 0 ? "partial" : gaps.length ? "partial" : "failed";

  return {
    rolesAddress: addr,
    mastercopy: mc as Hex,
    version: "v2.1.1",
    status,
    roles,
    hasAllowanceData,
    gaps,
    reconstructed,
    source,
  };
}

async function fetchRolesFromSubgraph(
  rolesAddress: Hex,
): Promise<{ roles: RolesRole[]; hasAllowanceData: boolean } | null> {
  const key = process.env.ZODIAC_API_KEY?.trim();
  if (!key) return null;
  const endpoint = "https://app.zodiac.eco/api/v1/subgraph";
  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${key}`,
  };
  // Try id forms used by Zodiac squids
  const ids = [
    `1:${rolesAddress.toLowerCase()}`,
    rolesAddress.toLowerCase(),
  ];

  const query = `
    query ($id: String!) {
      rolesModifier(id: $id) {
        id
        roles {
          key
          members { address }
          targets {
            address
            clearance
            functions {
              selector
              wildcarded
              executionOptions
              condition { id }
            }
          }
        }
      }
    }`;

  for (const id of ids) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables: { id } }),
    });
    if (!res.ok) continue;
    const json = (await res.json()) as {
      data?: { rolesModifier?: { roles?: SubgraphRole[] } | null };
      errors?: unknown;
    };
    const mod = json.data?.rolesModifier;
    if (!mod?.roles) continue;

    const roles: RolesRole[] = mod.roles.map((r) => ({
      key: (r.key.startsWith("0x") ? r.key : `0x${r.key}`) as Hex,
      members: (r.members ?? []).map(
        (m) => m.address.toLowerCase() as Hex,
      ),
      targets: (r.targets ?? []).map((t) => ({
        address: t.address.toLowerCase() as Hex,
        clearance: String(t.clearance ?? "Unknown"),
        functions: (t.functions ?? []).map((f) => ({
          selector: (f.selector.startsWith("0x")
            ? f.selector
            : `0x${f.selector}`) as Hex,
          wildcarded: Boolean(f.wildcarded),
          executionOptions: String(f.executionOptions ?? "None"),
          conditionId: f.condition?.id ?? null,
        })),
      })),
    }));

    return { roles, hasAllowanceData: false };
  }

  // Fallback: query by address field if schema supports it
  const alt = `
    query ($addr: String!) {
      rolesModifiers(where: { address_containsInsensitive: $addr }, limit: 1) {
        id
        roles {
          key
          members { address }
          targets {
            address
            clearance
            functions {
              selector
              wildcarded
              executionOptions
              condition { id }
            }
          }
        }
      }
    }`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: alt,
        variables: { addr: rolesAddress.toLowerCase() },
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { rolesModifiers?: Array<{ roles?: SubgraphRole[] }> };
    };
    const mod = json.data?.rolesModifiers?.[0];
    if (!mod?.roles) return null;
    const roles: RolesRole[] = mod.roles.map((r) => ({
      key: (r.key.startsWith("0x") ? r.key : `0x${r.key}`) as Hex,
      members: (r.members ?? []).map(
        (m) => m.address.toLowerCase() as Hex,
      ),
      targets: (r.targets ?? []).map((t) => ({
        address: t.address.toLowerCase() as Hex,
        clearance: String(t.clearance ?? "Unknown"),
        functions: (t.functions ?? []).map((f) => ({
          selector: (f.selector.startsWith("0x")
            ? f.selector
            : `0x${f.selector}`) as Hex,
          wildcarded: Boolean(f.wildcarded),
          executionOptions: String(f.executionOptions ?? "None"),
          conditionId: f.condition?.id ?? null,
        })),
      })),
    }));
    return { roles, hasAllowanceData: false };
  } catch {
    return null;
  }
}

/** Differential helper: compare two role-key sets (SDK vs our reconstruction). */
export function diffRoleKeys(
  ours: Hex[],
  theirs: Hex[],
): { missing: Hex[]; extra: Hex[]; match: boolean } {
  const a = new Set(ours.map((k) => k.toLowerCase()));
  const b = new Set(theirs.map((k) => k.toLowerCase()));
  const missing = [...b].filter((k) => !a.has(k)) as Hex[];
  const extra = [...a].filter((k) => !b.has(k)) as Hex[];
  return { missing, extra, match: missing.length === 0 && extra.length === 0 };
}
