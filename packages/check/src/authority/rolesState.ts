import type { Address, Hex, PublicClient } from "viem";
import { ROLES_MASTERCOPIES } from "./abis.js";
import { ROLES_V1_MASTERCOPY, rolesModifierAbi } from "./rolesAbi.js";
import type { CoverageGap, ModuleProbe } from "./types.js";

export type RolesVersionHint = "v1" | "v2" | "unknown";

export type RolesModifierState = {
  address: Hex;
  avatar: Hex | null;
  target: Hex | null;
  owner: Hex | null;
  multisend: Hex | null;
  mastercopy: Hex | null;
  versionHint: RolesVersionHint;
  /** Probe addresses only — not a complete membership set */
  probeMembers: Hex[];
  gaps: CoverageGap[];
  reconstructed: string[];
};

const EIP1167_PREFIX = "363d3d373d3d3d363d73";
const MINIMAL_PROXY_SUFFIX = "5af43d82803e903d91602b57fd5bf3";

function extractMinimalProxyTarget(code: string): Hex | null {
  const c = code.toLowerCase().replace(/^0x/, "");
  const idx = c.indexOf(EIP1167_PREFIX);
  if (idx < 0) return null;
  const start = idx + EIP1167_PREFIX.length;
  const impl = c.slice(start, start + 40);
  const suffix = c.slice(start + 40, start + 40 + MINIMAL_PROXY_SUFFIX.length);
  if (impl.length !== 40 || suffix !== MINIMAL_PROXY_SUFFIX) return null;
  return `0x${impl}` as Hex;
}

/**
 * Read Roles modifier identity + wiring at a pinned block.
 * Permission trees / allowances → Coverage gaps until differential enumeration lands.
 */
export async function readRolesModifierState(
  client: PublicClient,
  address: Hex,
  blockNumber: bigint,
  opts?: { probeMembers?: Hex[]; /** @deprecated use probeMembers */ knownMembers?: Hex[] },
): Promise<RolesModifierState> {
  const gaps: CoverageGap[] = [];
  const reconstructed: string[] = [];
  const addr = address.toLowerCase() as Hex;

  let avatar: Hex | null = null;
  let target: Hex | null = null;
  let owner: Hex | null = null;
  let multisend: Hex | null = null;
  let mastercopy: Hex | null = null;
  let versionHint: RolesVersionHint = "unknown";

  try {
    const code = await client.getCode({ address: addr as Address, blockNumber });
    if (code && code !== "0x") {
      mastercopy = extractMinimalProxyTarget(code);
      if (mastercopy) {
        reconstructed.push(`mastercopy:${mastercopy}`);
        const mc = mastercopy.toLowerCase();
        if (mc === ROLES_V1_MASTERCOPY.toLowerCase()) versionHint = "v1";
        else if (ROLES_MASTERCOPIES.has(mc)) versionHint = "v2";
      }
    }
  } catch (e) {
    gaps.push({
      area: `roles:${addr}:code`,
      reason: `getCode failed: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  async function view<T>(
    name: "avatar" | "target" | "owner" | "multisend",
  ): Promise<T | null> {
    try {
      return (await client.readContract({
        address: addr as Address,
        abi: rolesModifierAbi,
        functionName: name,
        blockNumber,
      })) as T;
    } catch {
      return null;
    }
  }

  avatar = ((await view<Address>("avatar"))?.toLowerCase() as Hex) ?? null;
  target = ((await view<Address>("target"))?.toLowerCase() as Hex) ?? null;
  owner = ((await view<Address>("owner"))?.toLowerCase() as Hex) ?? null;
  multisend = ((await view<Address>("multisend"))?.toLowerCase() as Hex) ?? null;

  if (avatar) reconstructed.push(`avatar:${avatar}`);
  if (target) reconstructed.push(`target:${target}`);
  if (owner) reconstructed.push(`owner:${owner}`);
  if (multisend) reconstructed.push(`multisend:${multisend}`);

  const probeMembers = (opts?.probeMembers ?? opts?.knownMembers ?? []).map(
    (m) => m.toLowerCase() as Hex,
  );

  // Permission trees handled by rolesTree for v2.1.1; identity path still notes gap for non-tree reads
  if (versionHint !== "v2") {
    gaps.push({
      area: `roles:${addr}:permissions`,
      reason:
        "Full permission trees require version-specific adapter (v2.1.1) or fixture-scoped v1 reader",
    });
  }

  for (const m of probeMembers) {
    try {
      const role = await client.readContract({
        address: addr as Address,
        abi: rolesModifierAbi,
        functionName: "defaultRoles",
        args: [m as Address],
        blockNumber,
      });
      reconstructed.push(`defaultRoles:${m}=${role}`);
    } catch {
      gaps.push({
        area: `roles:${addr}:defaultRoles:${m}`,
        reason: "defaultRoles(member) unread",
      });
    }
  }

  return {
    address: addr,
    avatar,
    target,
    owner,
    multisend,
    mastercopy,
    versionHint,
    probeMembers,
    gaps,
    reconstructed,
  };
}

export function rolesStatesFromProbes(
  probes: ModuleProbe[],
): ModuleProbe[] {
  return probes.filter(
    (p) =>
      p.looksLikeRolesProxy ||
      (p.implementation != null &&
        ROLES_MASTERCOPIES.has(p.implementation.toLowerCase())) ||
      (p.implementation != null &&
        p.implementation.toLowerCase() === ROLES_V1_MASTERCOPY.toLowerCase()),
  );
}
