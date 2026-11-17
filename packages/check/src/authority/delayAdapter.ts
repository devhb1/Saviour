import type { Address, Hex, PublicClient } from "viem";
import { getAddress } from "viem";
import { DELAY_MASTERCOPIES, ROLES_MASTERCOPIES, delayAbi } from "./abis.js";
import { readModulesPaginated } from "./chainSnapshot.js";
import type { DelayInventory, ModuleProbe } from "./types.js";

function eip1167Impl(code: Hex): Hex | null {
  const c = code.toLowerCase().replace(/^0x/, "");
  // minimal proxy: …73 <20-byte impl> 845af43d…
  const marker = "363d3d373d3d3d363d73";
  const i = c.indexOf(marker);
  if (i < 0) return null;
  const start = i + marker.length;
  const impl = c.slice(start, start + 40);
  if (impl.length !== 40) return null;
  return `0x${impl}` as Hex;
}

export async function probeModule(
  client: PublicClient,
  moduleAddress: Hex,
  blockNumber: bigint,
): Promise<ModuleProbe> {
  const address = getAddress(moduleAddress) as Hex;
  let avatar: Hex | null = null;
  let target: Hex | null = null;
  let looksLikeDelay = false;
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

  try {
    await client.readContract({
      address: address as Address,
      abi: delayAbi,
      functionName: "txCooldown",
      blockNumber,
    });
    looksLikeDelay = true;
  } catch {
    looksLikeDelay = false;
  }

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
  };
}

export async function readDelayInventory(
  client: PublicClient,
  delayAddress: Hex,
  blockNumber: bigint,
): Promise<DelayInventory> {
  const address = getAddress(delayAddress) as Hex;
  const probe = await probeModule(client, address, blockNumber);
  let txCooldown: string | null = null;
  let txExpiration: string | null = null;
  let modules: Hex[] = [];

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
      modules = await readModulesPaginated(
        client,
        address as Address,
        blockNumber,
      );
    } catch {
      modules = [];
    }
  }

  return {
    address: address.toLowerCase() as Hex,
    txCooldown,
    txExpiration,
    avatar: probe.avatar,
    target: probe.target,
    modules,
    looksLikeDelay: probe.looksLikeDelay,
  };
}
