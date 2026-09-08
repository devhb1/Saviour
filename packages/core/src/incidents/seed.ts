/**
 * Govern incident catalog — load curated seed list + live ENS snapshots.
 *
 * Seeds live in evals/seed-incidents.json (P0 research / demo-targets only).
 * Manifest after `pnpm seed:incidents` → deployments/seeded-incidents.json.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import type { Hex } from "viem";
import { ensNameForAddress } from "../ens/label";
import { isEnsIdentityReady } from "../ens/identity";
import { resolveIncident } from "../ens/resolve";
import { RULES_VERSION } from "../classifier/validate";
import {
  isRegistryDeployed,
  rememberValidatedAssessment,
} from "../registry/remember";
import { getLatestIncidentByTarget } from "../registry/client";
import type { AssessmentStatus, ThreatAssessment } from "../types";

export type SeedIncidentSpec = {
  id: string;
  address: string;
  status: "WATCH" | "TAINTED";
  label: string;
  source_url: string;
  threatSignals?: string[];
  notes?: string;
};

export type SeedFile = {
  version: number;
  lockedAt: string;
  notes?: string;
  incidents: SeedIncidentSpec[];
};

export type SeededIncidentRow = {
  id: string;
  address: `0x${string}`;
  status: "WATCH" | "TAINTED";
  label: string;
  source_url: string;
  ensName: string | null;
  ensStatus: string;
  registryStatus: AssessmentStatus | null;
  incidentId: Hex | null;
  reused: boolean;
  seededAt: string;
};

export type SeedManifest = {
  seededAt: string;
  network: "sepolia";
  count: number;
  incidents: SeededIncidentRow[];
};

function repoRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "../../../../");
}

export function seedIncidentsPath(): string {
  return resolve(repoRoot(), "evals/seed-incidents.json");
}

export function seedManifestPath(): string {
  return resolve(repoRoot(), "deployments/seeded-incidents.json");
}

export function loadSeedIncidents(): SeedFile {
  const path = seedIncidentsPath();
  if (!existsSync(path)) {
    throw new Error(`Missing ${path}`);
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as SeedFile;
  if (!raw.incidents?.length) {
    throw new Error("seed-incidents.json has no incidents");
  }
  for (const row of raw.incidents) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(row.address)) {
      throw new Error(`Invalid seed address for ${row.id}`);
    }
    if (!row.source_url?.trim()) {
      throw new Error(`Missing source_url for ${row.id}`);
    }
    if (row.status !== "WATCH" && row.status !== "TAINTED") {
      throw new Error(`Invalid status for ${row.id}`);
    }
  }
  return raw;
}

export function loadSeedManifest(): SeedManifest | null {
  const path = seedManifestPath();
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as SeedManifest;
}

/** Stable fingerprint so re-seeds are idempotent per seed id. */
function fingerprintForSeed(id: string): Hex {
  const h = createHash("sha256").update(`saviours-seed:${id}`).digest("hex");
  return `0x${h}` as Hex;
}

function assessmentFromSeed(spec: SeedIncidentSpec): ThreatAssessment {
  const address = spec.address.toLowerCase() as `0x${string}`;
  const fp = fingerprintForSeed(spec.id);
  const raw = fp.slice(2);
  return {
    status: spec.status,
    confidence: spec.status === "TAINTED" ? 0.92 : 0.7,
    entity: { chainId: 1, address, entityType: "EOA" },
    threatTypes: spec.status === "TAINTED" ? ["DRAINER"] : ["SUSPICIOUS_BEHAVIOR"],
    evidence: [
      {
        id: `${spec.id}-e1`,
        source: "saviours:seed",
        reference: spec.source_url,
        claim: `${spec.label} — ${spec.source_url}`,
        timestamp: 1,
        rawHash: raw.slice(0, 64),
      },
      {
        id: `${spec.id}-e2`,
        source: "saviours:seed",
        reference: spec.id,
        claim: `Seed catalog ${spec.id}`,
        timestamp: 2,
        rawHash: raw.slice(0, 32).padEnd(64, "0"),
      },
    ],
    counterEvidence: [],
    fingerprint: { behaviorHash: fp },
    modelVersion: "seed-incidents",
    rulesVersion: RULES_VERSION,
    createdAt: Math.floor(Date.now() / 1000),
  };
}

/**
 * Remember all curated seeds (ENS + registry). Idempotent via stable fingerprints.
 */
export async function seedHistoricalIncidents(opts: {
  dryRun?: boolean;
} = {}): Promise<SeedManifest> {
  if (!isRegistryDeployed("sepolia")) {
    throw new Error("Need deployments/sepolia.json");
  }
  if (!isEnsIdentityReady()) {
    throw new Error("Need deployments/sepolia-ens-identity.json");
  }

  const file = loadSeedIncidents();
  const rows: SeededIncidentRow[] = [];
  const seededAt = new Date().toISOString();

  for (const spec of file.incidents) {
    const address = spec.address.toLowerCase() as `0x${string}`;
    if (opts.dryRun) {
      rows.push({
        id: spec.id,
        address,
        status: spec.status,
        label: spec.label,
        source_url: spec.source_url,
        ensName: ensNameForAddress(address),
        ensStatus: "",
        registryStatus: null,
        incidentId: null,
        reused: false,
        seededAt,
      });
      continue;
    }

    const remembered = await rememberValidatedAssessment(
      assessmentFromSeed(spec),
      {
        network: "sepolia",
        ens: true,
        incidentLabel: spec.id,
        threatSignals: spec.threatSignals,
        dossierUrl:
          spec.source_url.startsWith("http") ? spec.source_url : undefined,
      },
    );

    if (!remembered.persisted) {
      throw new Error(
        `seed ${spec.id} failed: ${JSON.stringify(remembered)}`,
      );
    }

    const resolved = await resolveIncident(address, {
      keys: ["saviours.status", "saviours.dossier", "saviours.threat"],
    });
    const reg = await getLatestIncidentByTarget(1, address, "sepolia");

    rows.push({
      id: spec.id,
      address,
      status: spec.status,
      label: spec.label,
      source_url: spec.source_url,
      ensName: remembered.ensName ?? ensNameForAddress(address),
      ensStatus: resolved.records["saviours.status"] ?? "",
      registryStatus: reg?.status ?? null,
      incidentId: remembered.incidentId,
      reused: remembered.reused,
      seededAt,
    });

    // Keep live index in sync (S4.5) — seed rows also appear as live memory
    try {
      const { recordLiveIncident } = await import("./index");
      recordLiveIncident({
        address,
        status: spec.status,
        label: spec.label,
        incidentId: remembered.incidentId,
        ensName: remembered.ensName,
        source: "seed",
        source_url: spec.source_url,
      });
    } catch {
      // ignore
    }
  }

  const manifest: SeedManifest = {
    seededAt,
    network: "sepolia",
    count: rows.length,
    incidents: rows,
  };

  if (!opts.dryRun) {
    writeFileSync(seedManifestPath(), `${JSON.stringify(manifest, null, 2)}\n`);
  }

  return manifest;
}

export type GovernIncidentView = {
  id: string;
  address: `0x${string}`;
  label: string;
  source_url: string;
  expectedStatus: "WATCH" | "TAINTED";
  ensName: string;
  ensStatus: string;
  registryStatus: AssessmentStatus | null;
  expiryHint: string;
  registered: boolean;
};

/**
 * Live Govern list: seed catalog + current ENS/registry status.
 */
export async function listGovernIncidents(): Promise<GovernIncidentView[]> {
  const file = loadSeedIncidents();
  const out: GovernIncidentView[] = [];

  for (const spec of file.incidents) {
    const address = spec.address.toLowerCase() as `0x${string}`;
    const ensName = ensNameForAddress(address);
    let ensStatus = "";
    let registered = false;
    try {
      const r = await resolveIncident(address, {
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
        const row = await getLatestIncidentByTarget(1, address, "sepolia");
        registryStatus = row?.status ?? null;
      } catch {
        registryStatus = null;
      }
    }

    out.push({
      id: spec.id,
      address,
      label: spec.label,
      source_url: spec.source_url,
      expectedStatus: spec.status,
      ensName,
      ensStatus,
      registryStatus,
      expiryHint: spec.status === "WATCH" ? "7d" : "10y",
      registered,
    });
  }

  return out;
}
