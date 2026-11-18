import type { Address, Hex, PublicClient } from "viem";
import { getAddress } from "viem";
import { SENTINEL, ZERO, safeAbi } from "./abis.js";
import { readModulesPaginated } from "./chainSnapshot.js";
import type { InventoryReadStatus, SafeInventory } from "./types.js";

const FALLBACK_SLOT =
  "0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5" as Hex;

export async function readSafeInventory(
  client: PublicClient,
  safeAddress: Hex,
  blockNumber: bigint,
): Promise<SafeInventory> {
  const address = getAddress(safeAddress) as Hex;
  let version: string | null = null;
  let owners: Hex[] = [];
  let threshold: number | null = null;
  let guard: Hex | null = null;
  let fallbackHandler: Hex | null = null;
  let modules: Hex[] = [];
  let modulesTruncated = false;
  let ownersRead: InventoryReadStatus = "failed";
  let thresholdRead: InventoryReadStatus = "failed";
  let modulesRead: InventoryReadStatus = "failed";

  try {
    version = await client.readContract({
      address: address as Address,
      abi: safeAbi,
      functionName: "VERSION",
      blockNumber,
    });
  } catch {
    /* unsupported or not a Safe */
  }

  try {
    const o = await client.readContract({
      address: address as Address,
      abi: safeAbi,
      functionName: "getOwners",
      blockNumber,
    });
    owners = o.map((a) => a.toLowerCase() as Hex);
    ownersRead = "ok";
  } catch {
    owners = [];
    ownersRead = "failed";
  }

  try {
    const t = await client.readContract({
      address: address as Address,
      abi: safeAbi,
      functionName: "getThreshold",
      blockNumber,
    });
    threshold = Number(t);
    thresholdRead = "ok";
  } catch {
    threshold = null;
    thresholdRead = "failed";
  }

  try {
    const g = await client.readContract({
      address: address as Address,
      abi: safeAbi,
      functionName: "getGuard",
      blockNumber,
    });
    guard =
      g.toLowerCase() === ZERO ? null : (g.toLowerCase() as Hex);
  } catch {
    /* Safe without getGuard */
  }

  try {
    const slot = await client.getStorageAt({
      address: address as Address,
      slot: FALLBACK_SLOT,
      blockNumber,
    });
    if (slot && slot !== "0x" + "0".repeat(64)) {
      fallbackHandler = (`0x${slot.slice(-40)}`.toLowerCase()) as Hex;
      if (fallbackHandler === ZERO) fallbackHandler = null;
    }
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
    // First page only — never treat this as a complete inventory.
    try {
      const [batch] = await client.readContract({
        address: address as Address,
        abi: safeAbi,
        functionName: "getModulesPaginated",
        args: [SENTINEL as Address, 20n],
        blockNumber,
      });
      modules = batch.map((m) => m.toLowerCase() as Hex);
      modulesTruncated = true;
      modulesRead = "fallback_page";
    } catch {
      modules = [];
      modulesTruncated = false;
      modulesRead = "failed";
    }
  }

  return {
    address: address.toLowerCase() as Hex,
    version,
    owners,
    threshold,
    modules,
    modulesTruncated,
    ownersRead,
    thresholdRead,
    modulesRead,
    guard,
    fallbackHandler,
  };
}
