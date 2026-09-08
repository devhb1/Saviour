/**
 * Public evidence entry point used by HTTP `/api/evidence` and by investigate().
 *
 * Live Graph only:
 * - Messari standardized fan-out (8 protocols, schema-family templates)
 * - Adapter A community Uniswap V3 (second Graph product — Composable)
 * - REGISTRY_COOCCURRENCE enrichment vs live TAINTED peers (ENS/registry)
 *
 * Signals are derived deterministically over the merged Evidence (PIVOT §3.3).
 */

import { cacheKey, withCache } from "../evidence/cache";
import { enrichCooccurrenceEvidence } from "../evidence/cooccurrence";
import { deriveSignals, statusFromSignals } from "../evidence/signals";
import type { Signal } from "../evidence/signals";
import { collectAdapterAEvidence } from "../graph/adapterA";
import {
  fanOut,
  formatFanOutBanner,
  type FanOutResult,
} from "../graph/standard";
import { listTaintedPeers } from "../memory/taintedPeers";
import type { Evidence, HexAddress } from "../types";

export type EvidenceBundleOptions = {
  /** Skip in-memory cache (checks / debugging) */
  bypassCache?: boolean;
  /**
   * Counterparties already TAINTED (ENS/registry) for REGISTRY_COOCCURRENCE.
   * When omitted, live peers are resolved from demo ATTACK seeds + memory.
   * Pass `[]` to disable co-occurrence probes.
   */
  taintedCounterparties?: Iterable<string>;
  /** Registry network for live TAINTED peer lookup (default sepolia) */
  registryNetwork?: "sepolia" | "anvil";
  /** Max events per Messari entity list */
  first?: number;
  /** Skip live peer resolution + reverse Graph probe (unit tests) */
  skipCooccurrence?: boolean;
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
  /** TAINTED peers used for co-occurrence (addresses) */
  taintedPeers: string[];
  /** Peers with a live Graph edge to the subject */
  cooccurrenceLinked: string[];
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

async function resolveTaintedPeers(opts: EvidenceBundleOptions): Promise<{
  addresses: string[];
  peers: Awaited<ReturnType<typeof listTaintedPeers>>;
}> {
  if (opts.skipCooccurrence) {
    return { addresses: [], peers: [] };
  }
  if (opts.taintedCounterparties !== undefined) {
    const addresses = [...opts.taintedCounterparties].map((a) =>
      a.toLowerCase(),
    );
    return {
      addresses,
      peers: addresses.map((a) => ({
        address: a as `0x${string}`,
        source: "ens" as const,
        status: "TAINTED" as const,
      })),
    };
  }
  const peers = await listTaintedPeers({
    registryNetwork: opts.registryNetwork ?? "sepolia",
  });
  return { addresses: peers.map((p) => p.address), peers };
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

  const [fan, adapterA, tainted] = await Promise.all([
    fanOut(address, { first: opts.first ?? 25 }),
    collectAdapterAEvidence(chainId, address),
    resolveTaintedPeers(opts),
  ]);

  let evidence = dedupeById([...fan.evidence, ...adapterA]);
  const taintedPeers = tainted.addresses;
  let cooccurrenceLinked: string[] = [];

  if (tainted.peers.length && !opts.skipCooccurrence) {
    const enriched = await enrichCooccurrenceEvidence({
      chainId,
      address,
      evidence,
      taintedPeers: tainted.peers,
    });
    evidence = dedupeById(enriched.evidence);
    cooccurrenceLinked = enriched.linkedPeers;
  }

  const signals = deriveSignals(evidence, {
    address,
    taintedCounterparties: taintedPeers.filter((p) => p !== address),
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
    taintedPeers,
    cooccurrenceLinked,
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
    adapterName: "fanOut+adapterA+cooccur",
  });

  if (opts.bypassCache) {
    return loadBundle(chainId, addr, opts);
  }

  return withCache(key, () => loadBundle(chainId, addr, opts));
}

/**
 * Flat Evidence[] for investigate() and legacy callers.
 * Always live Graph via fan-out + Adapter A (+ co-occurrence enrichment).
 */
export async function getEvidenceForAddress(
  chainId: number,
  address: string,
  opts: EvidenceBundleOptions = {},
): Promise<Evidence[]> {
  const bundle = await getEvidenceBundle(chainId, address, opts);
  return bundle.evidence;
}
