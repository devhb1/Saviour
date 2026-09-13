/**
 * Live incident index — appended on successful Remember (S4.5).
 *
 * Seeded catalog: evals/seed-incidents.json
 * Live append-only: deployments/live-incidents.json
 * API merges both + live ENS/registry status.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Hex } from "viem";
import { ensNameForAddress } from "../ens/label";
import { resolveIncident } from "../ens/resolve";
import { repoRoot } from "../paths";
import { getLatestIncidentByTarget } from "../registry/client";
import { isRegistryDeployed } from "../registry/remember";
import type { AssessmentStatus } from "../types";
import {
  loadSeedIncidents,
  loadSeedManifest,
  proofLabelFor,
  type GovernIncidentView,
  type SeedProofKind,
} from "./seed";

/**
 * LIVE Remember pollution — never surface as Graph-verified detections.
 * HopeLend victim pool + vitalik.eth were named by mistake during demos.
 */
const LIVE_GOVERN_DENYLIST = new Set([
  "0xd8da6bf26964af9d7eed9e03e53415d37aa96045", // vitalik.eth
  "0xc74b72bbf904bac9fac880303922fc76a69f0bb4", // HopeLend victim pool
]);

export type LiveIncidentRecord = {
  id: string;
  address: `0x${string}`;
  status: "WATCH" | "TAINTED";
  label: string;
  source: "remember" | "seed" | "gate";
  source_url?: string;
  /**
   * Honesty badge. Default for Remember rows is "live".
   * Promote to "graph" only after audit proves threat-class signals fired on live fan-out.
   */
  proof?: "graph" | "provenance" | "live";
  proofAudit?: string;
  incidentId: Hex | null;
  ensName: string | null;
  recordedAt: string;
};

export type LiveIncidentIndex = {
  updatedAt: string;
  network: "sepolia";
  incidents: LiveIncidentRecord[];
};

export function liveIncidentsPath(): string {
  return resolve(repoRoot(), "deployments/live-incidents.json");
}

export function loadLiveIncidentIndex(): LiveIncidentIndex {
  const path = liveIncidentsPath();
  if (!existsSync(path)) {
    return {
      updatedAt: new Date(0).toISOString(),
      network: "sepolia",
      incidents: [],
    };
  }
  return JSON.parse(readFileSync(path, "utf8")) as LiveIncidentIndex;
}

function saveLiveIncidentIndex(index: LiveIncidentIndex): void {
  try {
    writeFileSync(
      liveIncidentsPath(),
      `${JSON.stringify(index, null, 2)}\n`,
      "utf8",
    );
  } catch (e) {
    console.warn(
      "[live-incidents] write skipped (read-only FS?):",
      e instanceof Error ? e.message : e,
    );
  }
}

/**
 * Append/update a live Remember into the JSON index (idempotent by address).
 */
export function recordLiveIncident(input: {
  address: string;
  status: "WATCH" | "TAINTED";
  label: string;
  incidentId: Hex | null;
  ensName: string | null;
  source?: LiveIncidentRecord["source"];
  source_url?: string;
}): LiveIncidentRecord {
  const address = input.address.toLowerCase() as `0x${string}`;
  const index = loadLiveIncidentIndex();
  const id = `LIVE-${address.slice(2, 10)}`;
  const row: LiveIncidentRecord = {
    id,
    address,
    status: input.status,
    label: input.label,
    source: input.source ?? "remember",
    source_url: input.source_url,
    incidentId: input.incidentId,
    ensName: input.ensName ?? ensNameForAddress(address),
    recordedAt: new Date().toISOString(),
  };

  const i = index.incidents.findIndex((r) => r.address === address);
  if (i >= 0) index.incidents[i] = { ...index.incidents[i]!, ...row };
  else index.incidents.push(row);

  index.updatedAt = row.recordedAt;
  saveLiveIncidentIndex(index);
  return row;
}

async function enrichAddress(input: {
  id: string;
  address: `0x${string}`;
  label: string;
  source_url: string;
  expectedStatus: "WATCH" | "TAINTED";
  origin: "seed" | "live";
  proof: SeedProofKind;
}): Promise<GovernIncidentView & { origin: "seed" | "live" }> {
  const ensName = ensNameForAddress(input.address);
  const fallback = (): GovernIncidentView & { origin: "seed" | "live" } => ({
    id: input.id,
    address: input.address,
    label: input.label,
    source_url: input.source_url,
    expectedStatus: input.expectedStatus,
    ensName,
    ensStatus: "",
    registryStatus: null,
    expiryHint: input.expectedStatus === "WATCH" ? "7d" : "10y",
    registered: false,
    origin: input.origin,
    proof: input.proof,
    proofLabel: proofLabelFor(input.proof),
  });

  try {
    let ensStatus = "";
    let registered = false;
    try {
      const r = await resolveIncident(input.address, {
        keys: ["saviours.status"],
      });
      ensStatus = r.records["saviours.status"] ?? "";
      registered = r.hit;
    } catch {
      ensStatus = "";
    }

    let registryStatus: AssessmentStatus | null = null;
    if (isRegistryDeployed("sepolia")) {
      try {
        const row = await getLatestIncidentByTarget(1, input.address, "sepolia");
        registryStatus = row?.status ?? null;
      } catch {
        registryStatus = null;
      }
    }

    return {
      id: input.id,
      address: input.address,
      label: input.label,
      source_url: input.source_url,
      expectedStatus: input.expectedStatus,
      ensName,
      ensStatus,
      registryStatus,
      expiryHint: input.expectedStatus === "WATCH" ? "7d" : "10y",
      registered,
      origin: input.origin,
      proof: input.proof,
      proofLabel: proofLabelFor(input.proof),
    };
  } catch {
    // Never fail the whole Registry list on a single RPC blip / 429.
    return fallback();
  }
}

/** Bound parallel Sepolia reads — unbounded Promise.all trips public RPC 429s. */
async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), Math.max(1, items.length)) },
    async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]!);
      }
    },
  );
  await Promise.all(workers);
  return out;
}

export type IncidentListItem = GovernIncidentView & {
  origin: "seed" | "live";
};

type IncidentListResult = {
  incidents: IncidentListItem[];
  seededCount: number;
  liveCount: number;
  named: number;
  seededAt: string | null;
  liveUpdatedAt: string | null;
};

let listCache: { at: number; value: IncidentListResult } | null = null;
const LIST_CACHE_MS = 45_000;
const ENRICH_CONCURRENCY = 3;

/** Call after dispute / revoke / remember so Registry doesn't serve stale ENS. */
export function invalidateIncidentListCache(): void {
  listCache = null;
}

/**
 * Instant chrome / nav counts — seed ∪ live index, no Sepolia enrichment.
 * Named = catalog WATCH|TAINTED rows (expected / remembered status).
 * Graph-verified = proof:"graph" only.
 */
export type IncidentHeadline = {
  memories: number;
  named: number;
  graphVerified: number;
  seededCount: number;
  liveCount: number;
};

export function getIncidentHeadline(): IncidentHeadline {
  const seedFile = loadSeedIncidents();
  const live = loadLiveIncidentIndex();
  const seedAddrs = new Set(
    seedFile.incidents.map((s) => s.address.toLowerCase()),
  );

  let named = 0;
  let graphVerified = 0;
  for (const s of seedFile.incidents) {
    if (s.status === "WATCH" || s.status === "TAINTED") named += 1;
    if (s.proof === "graph") graphVerified += 1;
  }

  let liveCount = 0;
  for (const row of live.incidents) {
    const addr = row.address.toLowerCase();
    if (seedAddrs.has(addr)) continue;
    if (LIVE_GOVERN_DENYLIST.has(addr)) continue;
    liveCount += 1;
    if (row.status === "WATCH" || row.status === "TAINTED") named += 1;
    if (row.proof === "graph") graphVerified += 1;
  }

  return {
    memories: seedFile.incidents.length + liveCount,
    named,
    graphVerified,
    seededCount: seedFile.incidents.length,
    liveCount,
  };
}

/**
 * Seeded catalog ∪ live Remember index, deduped by address (seed wins label/url).
 * Cached briefly so chrome + Registry don't double-hammer Sepolia.
 */
export async function listAllIncidents(): Promise<IncidentListResult> {
  if (listCache && Date.now() - listCache.at < LIST_CACHE_MS) {
    return listCache.value;
  }
  const value = await listAllIncidentsUncached();
  listCache = { at: Date.now(), value };
  return value;
}

async function listAllIncidentsUncached(): Promise<IncidentListResult> {
  const seedFile = loadSeedIncidents();
  const live = loadLiveIncidentIndex();
  const seedAddrs = new Set(
    seedFile.incidents.map((s) => s.address.toLowerCase()),
  );

  const specs: Array<{
    id: string;
    address: `0x${string}`;
    label: string;
    source_url: string;
    expectedStatus: "WATCH" | "TAINTED";
    origin: "seed" | "live";
    proof: SeedProofKind;
  }> = seedFile.incidents.map((s) => ({
    id: s.id,
    address: s.address.toLowerCase() as `0x${string}`,
    label: s.label,
    source_url: s.source_url,
    expectedStatus: s.status,
    origin: "seed" as const,
    proof: (s.proof === "graph"
      ? "graph"
      : s.proof === "live"
        ? "live"
        : "provenance") as SeedProofKind,
  }));

  for (const row of live.incidents) {
    const addr = row.address.toLowerCase();
    if (seedAddrs.has(addr)) continue;
    if (LIVE_GOVERN_DENYLIST.has(addr)) continue;
    specs.push({
      id: row.id,
      address: row.address,
      label: row.label,
      source_url: row.source_url ?? "saviours:remember",
      expectedStatus: row.status,
      origin: "live",
      /**
       * Live Remember ≠ Graph-verified by default.
       * Only rows with audited proof:"graph" (+ proofAudit) may claim it.
       */
      proof: row.proof === "graph" || row.proof === "provenance" ? row.proof : "live",
    });
  }

  const incidents = await mapPool(specs, ENRICH_CONCURRENCY, enrichAddress);
  const named = incidents.filter(
    (i) => i.ensStatus === "TAINTED" || i.ensStatus === "WATCH",
  ).length;
  const manifest = loadSeedManifest();

  return {
    incidents,
    seededCount: seedFile.incidents.length,
    liveCount: live.incidents.filter((r) => !seedAddrs.has(r.address)).length,
    named,
    seededAt: manifest?.seededAt ?? null,
    liveUpdatedAt: live.incidents.length ? live.updatedAt : null,
  };
}
