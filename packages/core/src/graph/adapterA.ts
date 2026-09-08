import { normalizeEvidence } from "../evidence/normalize";
import type { Evidence, HexAddress } from "../types";
import { querySubgraph } from "./client";

/**
 * Adapter A — activity / transfer-context from a live Uniswap V3 subgraph.
 * This is Graph AI track load-bearing evidence (not a standardized schema).
 * Mainnet only for now (chainId === 1).
 */
export const UNISWAP_V3_ETH_SUBGRAPH_ID =
  "5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV";

const SOURCE = "thegraph:uniswap-v3-ethereum";

type SwapRow = {
  id: string;
  timestamp: string;
  amountUSD: string;
  sender: string;
  recipient: string;
  origin: string;
  transaction: { id: string; blockNumber: string };
  token0: { symbol: string };
  token1: { symbol: string };
};

const SWAPS_QUERY = `
  query AdapterASwaps($origin: String!, $first: Int!) {
    swaps(
      first: $first
      orderBy: timestamp
      orderDirection: desc
      where: { origin: $origin }
    ) {
      id
      timestamp
      amountUSD
      sender
      recipient
      origin
      transaction { id blockNumber }
      token0 { symbol }
      token1 { symbol }
    }
  }
`;

function asAddress(address: string): HexAddress {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return address.toLowerCase() as HexAddress;
}

function swapToEvidence(swap: SwapRow): Evidence {
  const block = Number(swap.transaction.blockNumber);
  const ts = Number(swap.timestamp);
  const amountUSD = Number(swap.amountUSD);
  const recipient = /^0x[a-fA-F0-9]{40}$/.test(swap.recipient)
    ? (swap.recipient.toLowerCase() as HexAddress)
    : undefined;
  return normalizeEvidence({
    id: `uni-v3-${swap.id}`,
    source: SOURCE,
    reference: `tx:${swap.transaction.id}`,
    claim: `Uniswap V3 swap ${swap.token0.symbol}/${swap.token1.symbol} ≈ $${amountUSD.toFixed(2)} (origin ${swap.origin})`,
    timestamp: ts,
    blockRange: Number.isFinite(block) ? { from: block, to: block } : undefined,
    raw: swap,
    subgraphId: UNISWAP_V3_ETH_SUBGRAPH_ID,
    protocol: "uniswap-v3-community",
    schema: "community-uniswap-v3",
    kind: "swap",
    txHash: swap.transaction.id.toLowerCase(),
    block: Number.isFinite(block) ? block : undefined,
    amountUSD: Number.isFinite(amountUSD) ? amountUSD : undefined,
    counterparty: recipient,
  });
}

/** Adapter A — recent swap/activity flows for an address (live Graph). */
export async function getTransferFlows(
  chainId: number,
  address: string,
  opts: { first?: number } = {},
): Promise<Evidence[]> {
  if (chainId !== 1) {
    throw new Error(`Adapter A currently supports Ethereum mainnet only (got chainId=${chainId})`);
  }
  const origin = asAddress(address);
  const data = await querySubgraph<{ swaps: SwapRow[] }>(
    UNISWAP_V3_ETH_SUBGRAPH_ID,
    SWAPS_QUERY,
    { origin, first: opts.first ?? 25 },
  );
  return (data.swaps ?? []).map(swapToEvidence);
}

/** Concentration / counterparties derived from the same live swap set. */
export async function getConcentrationSignals(
  chainId: number,
  address: string,
): Promise<Evidence[]> {
  if (chainId !== 1) {
    throw new Error(`Adapter A currently supports Ethereum mainnet only (got chainId=${chainId})`);
  }
  const origin = asAddress(address);
  const data = await querySubgraph<{ swaps: SwapRow[] }>(
    UNISWAP_V3_ETH_SUBGRAPH_ID,
    SWAPS_QUERY,
    { origin, first: 50 },
  );
  if ((data.swaps ?? []).length === 0) return [];

  const counterparties = new Map<string, number>();
  for (const swap of data.swaps ?? []) {
    for (const party of [swap.sender, swap.recipient]) {
      const p = party.toLowerCase();
      if (p === origin) continue;
      counterparties.set(p, (counterparties.get(p) ?? 0) + 1);
    }
  }

  const ranked = [...counterparties.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (ranked.length === 0) return [];

  const top = ranked
    .map(([addr, count]) => `${addr.slice(0, 10)}…×${count}`)
    .join(", ");

  const blocks = (data.swaps ?? [])
    .map((s) => Number(s.transaction.blockNumber))
    .filter(Number.isFinite);
  const timestamps = (data.swaps ?? []).map((s) => Number(s.timestamp)).filter(Number.isFinite);

  return [
    normalizeEvidence({
      id: `uni-v3-concentration-${origin}`,
      source: SOURCE,
      reference: `subgraph:${UNISWAP_V3_ETH_SUBGRAPH_ID}`,
      claim: `Top Uniswap V3 counterparties for ${origin}: ${top}`,
      timestamp: timestamps.length ? Math.max(...timestamps) : Math.floor(Date.now() / 1000),
      blockRange:
        blocks.length > 0
          ? { from: Math.min(...blocks), to: Math.max(...blocks) }
          : undefined,
      raw: { origin, counterparties: Object.fromEntries(ranked) },
    }),
  ];
}

export async function getAffectedAddresses(
  chainId: number,
  address: string,
): Promise<Evidence[]> {
  const origin = asAddress(address);
  if (chainId !== 1) {
    throw new Error(`Adapter A currently supports Ethereum mainnet only (got chainId=${chainId})`);
  }
  const data = await querySubgraph<{ swaps: SwapRow[] }>(
    UNISWAP_V3_ETH_SUBGRAPH_ID,
    SWAPS_QUERY,
    { origin, first: 50 },
  );
  const set = new Set<string>();
  for (const swap of data.swaps ?? []) {
    set.add(swap.sender.toLowerCase());
    set.add(swap.recipient.toLowerCase());
    set.add(swap.origin.toLowerCase());
  }
  set.delete(origin);
  const list = [...set].slice(0, 20);
  if (list.length === 0) return [];

  const blocks = (data.swaps ?? [])
    .map((s) => Number(s.transaction.blockNumber))
    .filter(Number.isFinite);
  const timestamps = (data.swaps ?? []).map((s) => Number(s.timestamp)).filter(Number.isFinite);

  return [
    normalizeEvidence({
      id: `uni-v3-affected-${origin}`,
      source: SOURCE,
      reference: `subgraph:${UNISWAP_V3_ETH_SUBGRAPH_ID}`,
      claim: `${list.length} related addresses observed in recent Uniswap V3 swaps for ${origin}`,
      timestamp: timestamps.length ? Math.max(...timestamps) : Math.floor(Date.now() / 1000),
      blockRange:
        blocks.length > 0
          ? { from: Math.min(...blocks), to: Math.max(...blocks) }
          : undefined,
      raw: { origin, affected: list },
    }),
  ];
}

/** Combined Adapter A evidence bundle for an address. */
export async function collectAdapterAEvidence(
  chainId: number,
  address: string,
): Promise<Evidence[]> {
  const [flows, concentration, affected] = await Promise.all([
    getTransferFlows(chainId, address),
    getConcentrationSignals(chainId, address),
    getAffectedAddresses(chainId, address),
  ]);
  return [...flows, ...concentration, ...affected];
}
