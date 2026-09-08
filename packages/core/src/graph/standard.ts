/**
 * Standardized Messari fan-out — The Graph Network only.
 *
 * One schema-family query × N live subgraph ids (Promise.allSettled).
 * Failures are recorded per protocol (never fatal). Timing is per-protocol.
 * No mocks / static chain rows in this path.
 */

import { normalizeEvidence } from "../evidence/normalize";
import type { Evidence, EvidenceKind, HexAddress } from "../types";
import { querySubgraph } from "./client";
import {
  EXCLUDED_PROTOCOLS,
  STANDARD_PROTOCOLS,
  type StandardProtocol,
} from "./protocols";
import {
  DEX_AMM_QUERY,
  DEX_EXT_QUERY,
  LENDING_LEGACY_QUERY,
  LENDING_QUERY,
  YIELD_QUERY,
} from "./standardQueries";

export { EXCLUDED_PROTOCOLS, STANDARD_PROTOCOLS, protocolBySlug } from "./protocols";
export type { StandardProtocol, StandardSchemaFamily } from "./protocols";

export type FanOutOptions = {
  /** Max events per entity list (default 25) */
  first?: number;
};

export type ProtocolFanOutResult = {
  protocol: string;
  displayName: string;
  subgraphId: string;
  schema: string;
  family: StandardProtocol["family"];
  status: "ok" | "empty" | "error";
  ms: number;
  rowCount: number;
  evidence: Evidence[];
  error?: string;
};

export type FanOutResult = {
  address: HexAddress;
  /** Banner: how many schema templates vs protocols */
  queryTemplates: number;
  protocolsQueried: number;
  protocolsOk: number;
  protocolsEmpty: number;
  protocolsError: number;
  rowCount: number;
  totalMs: number;
  results: ProtocolFanOutResult[];
  evidence: Evidence[];
  excluded: typeof EXCLUDED_PROTOCOLS;
};

function asAddress(address: string): HexAddress {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return address.toLowerCase() as HexAddress;
}

function num(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function sourceOf(p: StandardProtocol): string {
  return `thegraph:messari:${p.slug}`;
}

function baseMeta(p: StandardProtocol) {
  return {
    source: sourceOf(p),
    subgraphId: p.subgraphId,
    protocol: p.slug,
    schema: p.schema,
  };
}

type ProtocolRow = {
  id: string;
  name: string;
  slug?: string;
  schemaVersion?: string;
  network?: string;
  type?: string;
  totalValueLockedUSD?: string;
};

function mapProtocolContext(
  p: StandardProtocol,
  rows: ProtocolRow[] | undefined,
): Evidence[] {
  const protocol = rows?.[0];
  if (!protocol) return [];
  const tvl = num(protocol.totalValueLockedUSD);
  const tvlBit =
    tvl !== undefined ? `; TVL ≈ $${tvl.toExponential(2)}` : "";
  return [
    normalizeEvidence({
      ...baseMeta(p),
      id: `std-protocol-${p.slug}`,
      reference: `subgraph:${p.subgraphId}#protocol`,
      kind: "protocol",
      claim: `${protocol.name} (${protocol.type ?? p.family}) schema ${protocol.schemaVersion ?? p.schema}${tvlBit}`,
      timestamp: Math.floor(Date.now() / 1000),
      raw: protocol,
    }),
  ];
}

function mapAccountLending(
  p: StandardProtocol,
  account: Record<string, unknown> | null | undefined,
  address: HexAddress,
): Evidence[] {
  if (!account) return [];
  const fl = num(account.flashloanCount);
  const parts = [
    fl !== undefined ? `flashloans=${fl}` : null,
    `borrows=${account.borrowCount ?? "?"}`,
    `deposits=${account.depositCount ?? "?"}`,
    `withdraws=${account.withdrawCount ?? "?"}`,
  ].filter(Boolean);
  return [
    normalizeEvidence({
      ...baseMeta(p),
      id: `std-account-${p.slug}-${address}`,
      reference: `account:${address}`,
      kind: "account",
      claim: `${p.displayName} account ${address}: ${parts.join(", ")}`,
      timestamp: Math.floor(Date.now() / 1000),
      raw: account,
    }),
  ];
}

function mapFlashloan(
  p: StandardProtocol,
  row: {
    id: string;
    hash: string;
    amountUSD: string;
    timestamp: string;
    blockNumber: string;
    asset?: { symbol?: string };
  },
): Evidence {
  const amountUSD = num(row.amountUSD) ?? 0;
  const block = num(row.blockNumber);
  const ts = num(row.timestamp) ?? Math.floor(Date.now() / 1000);
  const asset = row.asset?.symbol ?? "?";
  return normalizeEvidence({
    ...baseMeta(p),
    id: `std-fl-${p.slug}-${row.id}`,
    reference: `flashloan:${row.hash}`,
    kind: "flashloan",
    txHash: row.hash.toLowerCase(),
    block,
    amountUSD,
    claim: `${p.displayName} flashloan ${asset} ≈$${amountUSD.toFixed(0)} (tx ${row.hash.slice(0, 10)}…)`,
    timestamp: ts,
    blockRange: block !== undefined ? { from: block, to: block } : undefined,
    raw: row,
  });
}

function mapLiquidate(
  p: StandardProtocol,
  row: {
    id: string;
    hash: string;
    amountUSD: string;
    timestamp: string;
    blockNumber: string;
    liquidator?: { id: string };
    liquidatee?: { id: string };
  },
  role: "liquidator" | "liquidatee",
): Evidence {
  const amountUSD = num(row.amountUSD) ?? 0;
  const block = num(row.blockNumber);
  const ts = num(row.timestamp) ?? Math.floor(Date.now() / 1000);
  const counterparty = (
    role === "liquidator" ? row.liquidatee?.id : row.liquidator?.id
  ) as HexAddress | undefined;
  return normalizeEvidence({
    ...baseMeta(p),
    id: `std-liq-${p.slug}-${row.id}`,
    reference: `liquidate:${row.hash}`,
    kind: "liquidate",
    txHash: row.hash.toLowerCase(),
    block,
    amountUSD,
    counterparty,
    claim: `${p.displayName} liquidate as ${role} ≈$${amountUSD.toFixed(0)} (tx ${row.hash.slice(0, 10)}…)`,
    timestamp: ts,
    blockRange: block !== undefined ? { from: block, to: block } : undefined,
    raw: { ...row, role },
  });
}

function mapSwap(
  p: StandardProtocol,
  row: {
    id: string;
    hash: string;
    timestamp: string;
    blockNumber: string;
    amountInUSD?: string;
    amountOutUSD?: string;
    from?: string;
    to?: string;
    tokenIn?: { symbol?: string };
    tokenOut?: { symbol?: string };
    account?: { id: string };
  },
  address: HexAddress,
): Evidence {
  const amountIn = num(row.amountInUSD) ?? 0;
  const amountOut = num(row.amountOutUSD) ?? 0;
  const amountUSD = Math.max(amountIn, amountOut);
  const block = num(row.blockNumber);
  const ts = num(row.timestamp) ?? Math.floor(Date.now() / 1000);
  const tin = row.tokenIn?.symbol ?? "?";
  const tout = row.tokenOut?.symbol ?? "?";
  let counterparty: HexAddress | undefined;
  if (row.from && row.to) {
    const other = row.from.toLowerCase() === address ? row.to : row.from;
    if (/^0x[a-fA-F0-9]{40}$/.test(other)) {
      counterparty = other.toLowerCase() as HexAddress;
    }
  }
  return normalizeEvidence({
    ...baseMeta(p),
    id: `std-swap-${p.slug}-${row.id}`,
    reference: `swap:${row.hash}`,
    kind: "swap",
    txHash: row.hash.toLowerCase(),
    block,
    amountUSD,
    counterparty,
    claim: `${p.displayName} swap ${tin}→${tout} ≈$${amountUSD.toFixed(2)} (tx ${row.hash.slice(0, 10)}…)`,
    timestamp: ts,
    blockRange: block !== undefined ? { from: block, to: block } : undefined,
    raw: row,
  });
}

function mapYieldEvent(
  p: StandardProtocol,
  kind: Extract<EvidenceKind, "deposit" | "withdraw">,
  row: {
    id: string;
    hash: string;
    timestamp: string;
    blockNumber: string;
    amountUSD: string;
    from?: string;
    to?: string;
  },
): Evidence {
  const amountUSD = num(row.amountUSD) ?? 0;
  const block = num(row.blockNumber);
  const ts = num(row.timestamp) ?? Math.floor(Date.now() / 1000);
  return normalizeEvidence({
    ...baseMeta(p),
    id: `std-${kind}-${p.slug}-${row.id}`,
    reference: `${kind}:${row.hash}`,
    kind,
    txHash: row.hash.toLowerCase(),
    block,
    amountUSD,
    claim: `${p.displayName} ${kind} ≈$${amountUSD.toFixed(2)} (tx ${row.hash.slice(0, 10)}…)`,
    timestamp: ts,
    blockRange: block !== undefined ? { from: block, to: block } : undefined,
    raw: row,
  });
}

function mapDexAccount(
  p: StandardProtocol,
  account: Record<string, unknown> | null | undefined,
  address: HexAddress,
): Evidence[] {
  if (!account) return [];
  return [
    normalizeEvidence({
      ...baseMeta(p),
      id: `std-account-${p.slug}-${address}`,
      reference: `account:${address}`,
      kind: "account",
      claim: `${p.displayName} account ${address}: swaps=${account.swapCount ?? "?"}, deposits=${account.depositCount ?? "?"}, withdraws=${account.withdrawCount ?? "?"}`,
      timestamp: Math.floor(Date.now() / 1000),
      raw: account,
    }),
  ];
}

async function queryLending(
  p: StandardProtocol,
  address: HexAddress,
  first: number,
): Promise<Evidence[]> {
  type Data = {
    protocol?: ProtocolRow[];
    account: Record<string, unknown> | null;
    flashloans: Array<{
      id: string;
      hash: string;
      amountUSD: string;
      timestamp: string;
      blockNumber: string;
      asset?: { symbol?: string };
    }>;
    liquidatesAsLiquidator: Array<{
      id: string;
      hash: string;
      amountUSD: string;
      timestamp: string;
      blockNumber: string;
      liquidator?: { id: string };
      liquidatee?: { id: string };
    }>;
    liquidatesAsLiquidatee: Array<{
      id: string;
      hash: string;
      amountUSD: string;
      timestamp: string;
      blockNumber: string;
      liquidator?: { id: string };
      liquidatee?: { id: string };
    }>;
  };

  const data = await querySubgraph<Data>(p.subgraphId, LENDING_QUERY, {
    id: address,
    account: address,
    first,
  });

  const out: Evidence[] = [
    ...mapProtocolContext(p, data.protocol),
    ...mapAccountLending(p, data.account, address),
    ...(data.flashloans ?? []).map((r) => mapFlashloan(p, r)),
    ...(data.liquidatesAsLiquidator ?? []).map((r) =>
      mapLiquidate(p, r, "liquidator"),
    ),
    ...(data.liquidatesAsLiquidatee ?? []).map((r) =>
      mapLiquidate(p, r, "liquidatee"),
    ),
  ];
  return out;
}

async function queryLendingLegacy(
  p: StandardProtocol,
  address: HexAddress,
): Promise<Evidence[]> {
  type Data = {
    protocol?: ProtocolRow[];
    account: Record<string, unknown> | null;
  };
  const data = await querySubgraph<Data>(p.subgraphId, LENDING_LEGACY_QUERY, {
    id: address,
  });
  return [
    ...mapProtocolContext(p, data.protocol),
    ...mapAccountLending(p, data.account, address),
  ];
}

async function queryDexExt(
  p: StandardProtocol,
  address: HexAddress,
  first: number,
): Promise<Evidence[]> {
  type Swap = {
    id: string;
    hash: string;
    timestamp: string;
    blockNumber: string;
    amountInUSD?: string;
    amountOutUSD?: string;
    tokenIn?: { symbol?: string };
    tokenOut?: { symbol?: string };
    account?: { id: string };
  };
  type Data = {
    protocol?: ProtocolRow[];
    account: Record<string, unknown> | null;
    swaps: Swap[];
  };
  const data = await querySubgraph<Data>(p.subgraphId, DEX_EXT_QUERY, {
    id: address,
    account: address,
    first,
  });
  return [
    ...mapProtocolContext(p, data.protocol),
    ...mapDexAccount(p, data.account, address),
    ...(data.swaps ?? []).map((r) => mapSwap(p, r, address)),
  ];
}

async function queryDexAmm(
  p: StandardProtocol,
  address: HexAddress,
  first: number,
): Promise<Evidence[]> {
  type Swap = {
    id: string;
    hash: string;
    timestamp: string;
    blockNumber: string;
    amountInUSD?: string;
    amountOutUSD?: string;
    from?: string;
    to?: string;
    tokenIn?: { symbol?: string };
    tokenOut?: { symbol?: string };
  };
  type Data = {
    protocol?: ProtocolRow[];
    swapsFrom: Swap[];
    swapsTo: Swap[];
  };
  const data = await querySubgraph<Data>(p.subgraphId, DEX_AMM_QUERY, {
    account: address,
    first,
  });

  const byId = new Map<string, Swap>();
  for (const s of [...(data.swapsFrom ?? []), ...(data.swapsTo ?? [])]) {
    byId.set(s.id, s);
  }

  return [
    ...mapProtocolContext(p, data.protocol),
    ...[...byId.values()].map((r) => mapSwap(p, r, address)),
  ];
}

async function queryYield(
  p: StandardProtocol,
  address: HexAddress,
  first: number,
): Promise<Evidence[]> {
  type Ev = {
    id: string;
    hash: string;
    timestamp: string;
    blockNumber: string;
    amountUSD: string;
    from?: string;
    to?: string;
  };
  type Data = {
    protocol?: ProtocolRow[];
    deposits: Ev[];
    withdraws: Ev[];
  };
  const data = await querySubgraph<Data>(p.subgraphId, YIELD_QUERY, {
    account: address,
    first,
  });
  return [
    ...mapProtocolContext(p, data.protocol),
    ...(data.deposits ?? []).map((r) => mapYieldEvent(p, "deposit", r)),
    ...(data.withdraws ?? []).map((r) => mapYieldEvent(p, "withdraw", r)),
  ];
}

async function queryProtocol(
  p: StandardProtocol,
  address: HexAddress,
  first: number,
): Promise<Evidence[]> {
  switch (p.family) {
    case "lending-cdp-3.1":
      return queryLending(p, address, first);
    case "lending-cdp-2.0":
      return queryLendingLegacy(p, address);
    case "dex-amm-ext-4.0":
      return queryDexExt(p, address, first);
    case "dex-amm-1.3":
      return queryDexAmm(p, address, first);
    case "yield-1.3":
      return queryYield(p, address, first);
    default: {
      const _exhaustive: never = p.family;
      throw new Error(`Unknown schema family: ${_exhaustive}`);
    }
  }
}

/**
 * Fan out one address across all live Messari standardized subgraphs.
 * Live Graph only — failures soft-fail per protocol.
 */
export async function fanOut(
  address: string,
  opts: FanOutOptions = {},
): Promise<FanOutResult> {
  const addr = asAddress(address);
  const first = opts.first ?? 25;
  const t0 = Date.now();

  const settled = await Promise.allSettled(
    STANDARD_PROTOCOLS.map(async (p) => {
      const started = Date.now();
      try {
        const evidence = await queryProtocol(p, addr, first);
        const ms = Date.now() - started;
        // protocol context alone does not count as "activity rows" for empty check
        const activity = evidence.filter((e) => e.kind !== "protocol");
        const status: ProtocolFanOutResult["status"] =
          activity.length > 0 ? "ok" : "empty";
        return {
          protocol: p.slug,
          displayName: p.displayName,
          subgraphId: p.subgraphId,
          schema: p.schema,
          family: p.family,
          status,
          ms,
          rowCount: evidence.length,
          evidence,
        } satisfies ProtocolFanOutResult;
      } catch (e) {
        const ms = Date.now() - started;
        const error = e instanceof Error ? e.message : String(e);
        return {
          protocol: p.slug,
          displayName: p.displayName,
          subgraphId: p.subgraphId,
          schema: p.schema,
          family: p.family,
          status: "error" as const,
          ms,
          rowCount: 0,
          evidence: [],
          error: error.slice(0, 300),
        } satisfies ProtocolFanOutResult;
      }
    }),
  );

  const results: ProtocolFanOutResult[] = settled.map((s, i) => {
    if (s.status === "fulfilled") return s.value;
    const p = STANDARD_PROTOCOLS[i]!;
    return {
      protocol: p.slug,
      displayName: p.displayName,
      subgraphId: p.subgraphId,
      schema: p.schema,
      family: p.family,
      status: "error",
      ms: 0,
      rowCount: 0,
      evidence: [],
      error: String(s.reason).slice(0, 300),
    };
  });

  const evidence = results.flatMap((r) => r.evidence);
  const templates = new Set(STANDARD_PROTOCOLS.map((p) => p.family)).size;

  return {
    address: addr,
    queryTemplates: templates,
    protocolsQueried: STANDARD_PROTOCOLS.length,
    protocolsOk: results.filter((r) => r.status === "ok").length,
    protocolsEmpty: results.filter((r) => r.status === "empty").length,
    protocolsError: results.filter((r) => r.status === "error").length,
    rowCount: evidence.length,
    totalMs: Date.now() - t0,
    results,
    evidence,
    excluded: EXCLUDED_PROTOCOLS,
  };
}

/** Human banner line for demos / check:standard */
export function formatFanOutBanner(r: FanOutResult): string {
  return `${r.queryTemplates} query templates · ${r.protocolsQueried} protocols · ${r.rowCount} rows · ${r.totalMs}ms (ok=${r.protocolsOk} empty=${r.protocolsEmpty} err=${r.protocolsError})`;
}
