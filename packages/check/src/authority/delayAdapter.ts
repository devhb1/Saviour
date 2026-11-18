import type { Address, Hex, PublicClient } from "viem";
import { getAddress } from "viem";
import { DELAY_MASTERCOPIES, ROLES_MASTERCOPIES, delayAbi } from "./abis.js";
import { readModulesPaginated } from "./chainSnapshot.js";
import type { DelayIdentity, DelayInventory, ModuleProbe } from "./types.js";

/**
 * txCooldown() alone is never enough.
 * verified = known Delay mastercopy + avatar + target present.
 * suspected = cooldown (and optionally avatar/target) without known impl.
 * Only verified enters Delay topology; suspected stays a direct UNKNOWN module.
 */
export function classifyDelayIdentity(opts: {
  cooldownReadable: boolean;
  implementation: Hex | null;
  avatar: Hex | null;
  target: Hex | null;
}): DelayIdentity {
  if (!opts.cooldownReadable) return "unsupported";
  const impl = opts.implementation?.toLowerCase() ?? null;
  const knownImpl = impl != null && DELAY_MASTERCOPIES.has(impl);
  if (knownImpl && opts.avatar != null && opts.target != null) {
    return "verified";
  }
  return "suspected";
}

/**
 * Demote a verified Delay when avatar/target are not wired to the audited Safe.
 */
export function delayWiredToSafe(
  avatar: Hex | null,
  target: Hex | null,
  safeAddress: Hex,
): boolean {
  const safe = safeAddress.toLowerCase();
  return (
    (avatar != null && avatar.toLowerCase() === safe) ||
    (target != null && target.toLowerCase() === safe)
  );
}

/**
 * Full EIP-1167 minimal proxy: runtime bytecode is exactly
 * 363d3d373d3d3d363d73<impl20>5af43d82803e903d91602b57fd5bf3 (45 bytes).
 * Reject substring matches inside larger contracts.
 */
export function eip1167Impl(code: Hex): Hex | null {
  const c = code.toLowerCase().replace(/^0x/, "");
  if (c.length !== 90) return null;
  if (!c.startsWith("363d3d373d3d3d363d73")) return null;
  if (!c.endsWith("5af43d82803e903d91602b57fd5bf3")) return null;
  const impl = c.slice(20, 60);
  if (!/^[a-f0-9]{40}$/.test(impl)) return null;
  return `0x${impl}` as Hex;
}

export async function probeModule(
  client: PublicClient,
  moduleAddress: Hex,
  blockNumber: bigint,
  opts?: { safeAddress?: Hex },
): Promise<ModuleProbe> {
  const address = getAddress(moduleAddress) as Hex;
  let avatar: Hex | null = null;
  let target: Hex | null = null;
  let implementation: Hex | null = null;

  try {
    const code = await client.getBytecode({
      address: address as Address,
      blockNumber,
    });
    if (code) implementation = eip1167Impl(code as Hex);
  } catch {
    /* */
  }

  try {
    const a = await client.readContract({
      address: address as Address,
      abi: delayAbi,
      functionName: "avatar",
      blockNumber,
    });
    avatar = a.toLowerCase() as Hex;
  } catch {
    /* */
  }

  try {
    const t = await client.readContract({
      address: address as Address,
      abi: delayAbi,
      functionName: "target",
      blockNumber,
    });
    target = t.toLowerCase() as Hex;
  } catch {
    /* */
  }

  let cooldownReadable = false;
  try {
    await client.readContract({
      address: address as Address,
      abi: delayAbi,
      functionName: "txCooldown",
      blockNumber,
    });
    cooldownReadable = true;
  } catch {
    cooldownReadable = false;
  }

  let delayIdentity = classifyDelayIdentity({
    cooldownReadable,
    implementation,
    avatar,
    target,
  });

  // Verified only when wired to the audited Safe (when known).
  if (
    delayIdentity === "verified" &&
    opts?.safeAddress &&
    !delayWiredToSafe(avatar, target, opts.safeAddress)
  ) {
    delayIdentity = "suspected";
  }

  // Only verified Delay enters Delay topology / bypass exclusion.
  const looksLikeDelay = delayIdentity === "verified";

  const implLower = implementation?.toLowerCase();
  const looksLikeRolesProxy = Boolean(
    (implLower && ROLES_MASTERCOPIES.has(implLower)) ||
      (implLower &&
        !DELAY_MASTERCOPIES.has(implLower) &&
        !looksLikeDelay &&
        avatar != null),
  );

  return {
    address: address.toLowerCase() as Hex,
    avatar,
    target,
    looksLikeDelay,
    looksLikeRolesProxy,
    implementation,
    delayIdentity,
  };
}

export async function readDelayInventory(
  client: PublicClient,
  delayAddress: Hex,
  blockNumber: bigint,
  opts?: { safeAddress?: Hex },
): Promise<DelayInventory> {
  const address = getAddress(delayAddress) as Hex;
  const probe = await probeModule(client, address, blockNumber, opts);
  let txCooldown: string | null = null;
  let txExpiration: string | null = null;
  let modules: Hex[] = [];
  let modulesTruncated = false;
  let modulesRead: DelayInventory["modulesRead"];

  if (probe.looksLikeDelay) {
    try {
      const c = await client.readContract({
        address: address as Address,
        abi: delayAbi,
        functionName: "txCooldown",
        blockNumber,
      });
      txCooldown = c.toString();
    } catch {
      /* */
    }
    try {
      const e = await client.readContract({
        address: address as Address,
        abi: delayAbi,
        functionName: "txExpiration",
        blockNumber,
      });
      txExpiration = e.toString();
    } catch {
      /* */
    }
    try {
      const page = await readModulesPaginated(
        client,
        address as Address,
        blockNumber,
      );
      modules = page.modules;
      modulesTruncated = page.truncated;
      modulesRead = page.truncated ? "truncated" : "ok";
    } catch {
      modules = [];
      modulesTruncated = false;
      modulesRead = "failed";
    }
  }

  return {
    address: address.toLowerCase() as Hex,
    txCooldown,
    txExpiration,
    avatar: probe.avatar,
    target: probe.target,
    modules,
    modulesTruncated,
    modulesRead,
    looksLikeDelay: probe.looksLikeDelay,
    delayIdentity: probe.delayIdentity,
  };
}
