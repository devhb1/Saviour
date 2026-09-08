/**
 * Public evidence entry point used by HTTP `/api/evidence` and by investigate().
 *
 * Live Graph only:
 * - Messari standardized fan-out (8 protocols, schema-family templates)
 * - Adapter A community Uniswap V3 (second Graph product — Composable)
 *
 * Signals are derived deterministically over the merged Evidence (PIVOT §3.3).
 * Adapter B (single-protocol Messari Uni) remains exportable but is superseded
 * here by fan-out, which already includes uniswap-v3.
 */

import { cacheKey, withCache } from "../evidence/cache";
import { deriveSignals, statusFromSignals } from "../evidence/signals";
import type { Signal } from "../evidence/signals";
import { collectAdapterAEvidence } from "../graph/adapterA";
import {
  fanOut,
  formatFanOutBanner,
  type FanOutResult,
} from "../graph/standard";
import type { Evidence, HexAddress } from "../types";

export type EvidenceBundleOptions = {
  /** Skip in-memory cache (checks / debugging) */
  bypassCache?: boolean;
  /**
   * Counterparties already TAINTED (ENS/registry) for REGISTRY_COOCCURRENCE.
   * Empty until Shield/ENS pre-check wires this in P2/P3.
   */
  taintedCounterparties?: Iterable<string>;
  /** Max events per Messari entity list */
  first?: number;
};

export type EvidenceBundle = {
  chainId: number;
  address: HexAddress;
  evidence: Evidence[];
  signals: Signal[];
  signalStatus: ReturnType<typeof statusFromSignals>;
  /** Standards banner fields for UI */
  banner: string;
  fanOut: {
    queryTemplates: number;
    protocolsQueried: number;
    protocolsOk: number;
    protocolsEmpty: number;
    protocolsError: number;
    rowCount: number;
    totalMs: number;
    results: FanOutResult["results"];
    excluded: FanOutResult["excluded"];
  };
  adapterACount: number;
};

function asAddress(address: string): HexAddress {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return address.toLowerCase() as HexAddress;
}

function dedupeById(rows: Evidence[]): Evidence[] {
  const seen = new Set<string>();
  const out: Evidence[] = [];
  for (const e of rows) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
  }
  return out;
}

async function loadBundle(
  chainId: number,
  address: HexAddress,
  opts: EvidenceBundleOptions,
): Promise<EvidenceBundle> {
  if (chainId !== 1) {
    throw new Error(
      `Evidence fan-out currently supports Ethereum mainnet only (got chainId=${chainId})`,
    );
  }

  const [fan, adapterA] = await Promise.all([
    fanOut(address, { first: opts.first ?? 25 }),
    collectAdapterAEvidence(chainId, address),
  ]);

  const evidence = dedupeById([...fan.evidence, ...adapterA]);
  const signals = deriveSignals(evidence, {
    address,
    taintedCounterparties: opts.taintedCounterparties,
  });

  return {
    chainId,
    address,
    evidence,
    signals,
    signalStatus: statusFromSignals(signals),
    banner: formatFanOutBanner(fan),
    fanOut: {
      queryTemplates: fan.queryTemplates,
      protocolsQueried: fan.protocolsQueried,
      protocolsOk: fan.protocolsOk,
      protocolsEmpty: fan.protocolsEmpty,
      protocolsError: fan.protocolsError,
      rowCount: fan.rowCount,
      totalMs: fan.totalMs,
      results: fan.results,
      excluded: fan.excluded,
    },
    adapterACount: adapterA.length,
  };
}

/**
 * Full live evidence + signals + standards banner.
 * Prefer this over the flat array helper when UI/API needs provenance.
 */
export async function getEvidenceBundle(
  chainId: number,
  address: string,
  opts: EvidenceBundleOptions = {},
): Promise<EvidenceBundle> {
  const addr = asAddress(address);
  const key = cacheKey({
    chainId,
    address: addr,
    adapterName: "fanOut+adapterA",
  });

  if (opts.bypassCache) {
    return loadBundle(chainId, addr, opts);
  }

  return withCache(key, () => loadBundle(chainId, addr, opts));
}

/**
 * Flat Evidence[] for investigate() and legacy callers.
 * Always live Graph via fan-out + Adapter A.
 */
export async function getEvidenceForAddress(
  chainId: number,
  address: string,
  opts: EvidenceBundleOptions = {},
): Promise<Evidence[]> {
  const bundle = await getEvidenceBundle(chainId, address, opts);
  return bundle.evidence;
}
