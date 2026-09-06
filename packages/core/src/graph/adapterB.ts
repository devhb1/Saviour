import { normalizeEvidence } from "../evidence/normalize";
import type { Evidence, HexAddress } from "../types";
import { querySubgraph } from "./client";

/**
 * Messari Standardized Subgraph — Uniswap V3 Ethereum
 * Schema: DEX AMM (Extended) 4.0.0
 * Source: messari/subgraphs deployment.json → decentralized-network query-id
 * Docs: https://thegraph.com/docs/en/subgraphs/existing-subgraphs/standard-subgraphs/
 */
export const MESSARI_UNISWAP_V3_ETH_SUBGRAPH_ID =
  "4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6";

const SOURCE = "thegraph:messari-uniswap-v3-ethereum";

type ProtocolRow = {
  id: string;
  name: string;
  slug: string;
  schemaVersion: string;
  subgraphVersion: string;
  methodologyVersion: string;
  network: string;
  type: string;
  totalValueLockedUSD: string;
};

type AccountRow = {
  id: string;
  swapCount: string | number;
  depositCount: string | number;
  withdrawCount: string | number;
};

type SwapRow = {
  id: string;
  timestamp: string;
  amountInUSD: string;
  amountOutUSD: string;
  blockNumber: string;
  tokenIn: { symbol: string };
  tokenOut: { symbol: string };
  pool: { id: string };
};

function asAddress(address: string): HexAddress {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return address.toLowerCase() as HexAddress;
}

/** Protocol-level context from the standardized Protocol entity. */
export async function getProtocolContext(chainId: number): Promise<Evidence[]> {
  if (chainId !== 1) {
    throw new Error(`Adapter B currently supports Ethereum mainnet only (got chainId=${chainId})`);
  }

  const data = await querySubgraph<{ protocols: ProtocolRow[] }>(
    MESSARI_UNISWAP_V3_ETH_SUBGRAPH_ID,
    `{
      protocols(first: 1) {
        id
        name
        slug
        schemaVersion
        subgraphVersion
        methodologyVersion
        network
        type
        totalValueLockedUSD
      }
    }`,
  );

  const protocol = data.protocols?.[0];
  if (!protocol) return [];

  const tvl = Number(protocol.totalValueLockedUSD);
  return [
    normalizeEvidence({
      id: `messari-protocol-${protocol.slug}`,
      source: SOURCE,
      reference: `subgraph:${MESSARI_UNISWAP_V3_ETH_SUBGRAPH_ID}#protocol`,
      claim: `${protocol.name} (${protocol.type}) on ${protocol.network}: TVL ≈ $${tvl.toExponential(2)}; Messari schema ${protocol.schemaVersion} / subgraph ${protocol.subgraphVersion}`,
      timestamp: Math.floor(Date.now() / 1000),
      raw: protocol,
    }),
  ];
}

/** Account + standardized swap activity for a target address. */
export async function getProtocolInteractions(
  chainId: number,
  address: string,
  opts: { first?: number } = {},
): Promise<Evidence[]> {
  if (chainId !== 1) {
    throw new Error(`Adapter B currently supports Ethereum mainnet only (got chainId=${chainId})`);
  }
  const accountId = asAddress(address);
  const first = opts.first ?? 15;

  const data = await querySubgraph<{
    account: AccountRow | null;
    swaps: SwapRow[];
  }>(
    MESSARI_UNISWAP_V3_ETH_SUBGRAPH_ID,
    `query($id: ID!, $account: String!, $first: Int!) {
      account(id: $id) {
        id
        swapCount
        depositCount
        withdrawCount
      }
      swaps(
        first: $first
        orderBy: timestamp
        orderDirection: desc
        where: { account: $account }
      ) {
        id
        timestamp
        amountInUSD
        amountOutUSD
        blockNumber
        tokenIn { symbol }
        tokenOut { symbol }
        pool { id }
      }
    }`,
    { id: accountId, account: accountId, first },
  );

  const out: Evidence[] = [];
  const account = data.account;
  if (account) {
    out.push(
      normalizeEvidence({
        id: `messari-account-${accountId}`,
        source: SOURCE,
        reference: `account:${accountId}`,
        claim: `Messari DEX account ${accountId}: swaps=${account.swapCount}, deposits=${account.depositCount}, withdraws=${account.withdrawCount}`,
        timestamp: Math.floor(Date.now() / 1000),
        raw: account,
      }),
    );
  }

  for (const swap of data.swaps ?? []) {
    const block = Number(swap.blockNumber);
    const ts = Number(swap.timestamp);
    out.push(
      normalizeEvidence({
        id: `messari-swap-${swap.id}`,
        source: SOURCE,
        reference: `swap:${swap.id}`,
        claim: `Messari-standardized swap ${swap.tokenIn.symbol}→${swap.tokenOut.symbol} in≈$${Number(swap.amountInUSD).toFixed(2)} out≈$${Number(swap.amountOutUSD).toFixed(2)} (pool ${swap.pool.id.slice(0, 10)}…)`,
        timestamp: ts,
        blockRange: Number.isFinite(block) ? { from: block, to: block } : undefined,
        raw: swap,
      }),
    );
  }

  return out;
}

/** Combined Adapter B evidence (protocol context + address interactions). */
export async function collectAdapterBEvidence(
  chainId: number,
  address: string,
): Promise<Evidence[]> {
  const [protocol, interactions] = await Promise.all([
    getProtocolContext(chainId),
    getProtocolInteractions(chainId, address),
  ]);
  return [...protocol, ...interactions];
}
