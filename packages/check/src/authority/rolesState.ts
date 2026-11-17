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
  /** Known members from fixtures / probes — not a complete set until enumeration works */
  knownMembers: Hex[];
  gaps: CoverageGap[];
  reconstructed: string[];
};

const MINIMAL_PROXY_SUFFIX = "5af43d82803e903d91602b57fd5bf3";

function extractMinimalProxyTarget(code: string): Hex | null {
  const c = code.toLowerCase().replace(/^0x/, "");
  if (!c.includes(MINIMAL_PROXY_SUFFIX)) return null;
  // EIP-1167: …73 <20-byte impl> 5af43d…
  const idx = c.indexOf("73");
  if (idx < 0) return null;
  const impl = `0x${c.slice(idx + 2, idx + 42)}` as Hex;
  if (impl.length !== 42) return null;
  return impl;
}

/**
 * Read Roles modifier identity + wiring at a pinned block.
 * Permission trees / allowances → Coverage gaps until differential enumeration lands.
 */
export async function readRolesModifierState(
  client: PublicClient,
  address: Hex,
  blockNumber: bigint,
  opts?: { knownMembers?: Hex[] },
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

  gaps.push({
    area: `roles:${addr}:permissions`,
    reason:
      "Role members, target clearances, condition trees, execution options, and allowances are not fully enumerated yet — mark UNKNOWN for 'what can this role spend?' until differential tests vs Zodiac SDK pass",
  });

  const knownMembers = (opts?.knownMembers ?? []).map(
    (m) => m.toLowerCase() as Hex,
  );

  for (const m of knownMembers) {
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
    knownMembers,
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
