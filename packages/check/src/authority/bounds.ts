import type { Address, Hex, PublicClient } from "viem";
import type { TokenBound } from "./verdict.js";

const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const;

const erc4626Abi = [
  {
    type: "function",
    name: "convertToAssets",
    stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "asset",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

/**
 * Token-quantity snapshot at pinned block. USD is never computed here.
 */
export async function readTokenBalances(
  client: PublicClient,
  holder: Hex,
  tokens: Hex[],
  blockNumber: bigint,
): Promise<TokenBound[]> {
  const out: TokenBound[] = [];
  for (const token of tokens) {
    try {
      const raw = await client.readContract({
        address: token as Address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [holder as Address],
        blockNumber,
      });
      let decimals: number | undefined;
      let symbol: string | undefined;
      try {
        decimals = Number(
          await client.readContract({
            address: token as Address,
            abi: erc20Abi,
            functionName: "decimals",
            blockNumber,
          }),
        );
      } catch {
        /* ignore */
      }
      try {
        symbol = await client.readContract({
          address: token as Address,
          abi: erc20Abi,
          functionName: "symbol",
          blockNumber,
        });
      } catch {
        /* ignore */
      }
      out.push({
        token: token.toLowerCase() as Hex,
        amount: raw.toString(),
        decimals,
        symbol,
        period: "once",
      });
    } catch {
      /* soft-fail single token */
    }
  }
  return out;
}

/** Optional ERC-4626 share → underlying assets (same block). */
export async function read4626Underlying(
  client: PublicClient,
  vault: Hex,
  holder: Hex,
  blockNumber: bigint,
): Promise<TokenBound | null> {
  try {
    const shares = await client.readContract({
      address: vault as Address,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [holder as Address],
      blockNumber,
    });
    const assets = await client.readContract({
      address: vault as Address,
      abi: erc4626Abi,
      functionName: "convertToAssets",
      args: [shares],
      blockNumber,
    });
    const asset = (await client.readContract({
      address: vault as Address,
      abi: erc4626Abi,
      functionName: "asset",
      blockNumber,
    })) as Address;
    return {
      token: asset.toLowerCase() as Hex,
      amount: assets.toString(),
      period: "once",
      symbol: "underlying",
    };
  } catch {
    return null;
  }
}
