import {
  createPublicClient,
  http,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { mainnet } from "viem/chains";
import type { Freshness } from "./types.js";

export type SnapshotClient = {
  client: PublicClient;
  freshness: Freshness;
  blockNumber: bigint;
};

function rpcUrl(): string {
  return (
    process.env.ETH_RPC_URL?.trim() ||
    process.env.MAINNET_RPC_URL?.trim() ||
    "https://ethereum-rpc.publicnode.com"
  );
}

/** Mainnet-only block-pinned client. */
export async function openMainnetSnapshot(
  chainId = 1,
): Promise<SnapshotClient> {
  if (chainId !== 1) {
    throw new Error("Authority audit is mainnet-only (chainId=1)");
  }
  const url = rpcUrl();
  const client = createPublicClient({
    chain: mainnet,
    transport: http(url),
  });
  const block = await client.getBlock();
  let host: string | undefined;
  try {
    host = new URL(url).host;
  } catch {
    host = undefined;
  }
  return {
    client,
    blockNumber: block.number,
    freshness: {
      chainId: 1,
      blockNumber: block.number.toString(),
      blockHash: block.hash as Hex,
      rpcUrlHost: host,
    },
  };
}

export async function readModulesPaginated(
  client: PublicClient,
  address: Address,
  blockNumber: bigint,
): Promise<Hex[]> {
  const { SENTINEL, ZERO, delayAbi } = await import("./abis.js");
  const mods: Hex[] = [];
  let start: Address = SENTINEL as Address;
  for (let page = 0; page < 50; page++) {
    const [batch, next] = await client.readContract({
      address,
      abi: delayAbi,
      functionName: "getModulesPaginated",
      args: [start, 20n],
      blockNumber,
    });
    for (const m of batch) mods.push(m.toLowerCase() as Hex);
    if (
      !next ||
      next.toLowerCase() === SENTINEL.toLowerCase() ||
      next.toLowerCase() === ZERO ||
      batch.length === 0
    ) {
      break;
    }
    start = next;
  }
  return mods;
}
