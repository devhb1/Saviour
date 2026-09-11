/**
 * ENDGAME Phase 3 — bulk-name from registry-candidate-catalog.
 *
 * Honest rules:
 *   - Only WATCH / TAINTED
 *   - Skip SAFE, REJECT, DEMO_RESERVED, missing source_url
 *   - proof stays graph | provenance | live (never launder)
 *   - Two-tier texts handled inside rememberValidatedAssessment / ENS write path
 *
 * Usage:
 *   # dry run (print what would name)
 *   pnpm exec tsx scripts/bulk-name-catalog.ts --dry-run
 *
 *   # name up to N rows (default 40), resume from progress file
 *   pnpm exec tsx scripts/bulk-name-catalog.ts --limit 40
 *
 *   # continue after interrupt
 *   pnpm exec tsx scripts/bulk-name-catalog.ts --limit 100
 *
 * Requires: SEPOLIA_RPC_URL, RELAYER_PRIVATE_KEY / investigator keys as for seed:incidents.
 * Fund faucet FIRST — this burns Sepolia gas.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import type { Hex } from "viem";
import { loadRootEnv } from "../packages/core/src/config/env";
import { repoRoot } from "../packages/core/src/paths";
import { RULES_VERSION } from "../packages/core/src/classifier/validate";
import { ensNameForAddress } from "../packages/core/src/ens/label";
import { isEnsIdentityReady } from "../packages/core/src/ens/identity";
import {
  isRegistryDeployed,
  rememberValidatedAssessment,
} from "../packages/core/src/registry/remember";
import type { ThreatAssessment } from "../packages/core/src/types";

loadRootEnv();

type CatalogRow = {
  n: number;
  id: string;
  address: string;
  status: string;
  class?: string;
  label: string;
  proof?: string;
  source_url?: string;
  tier?: string;
};

type Progress = {
  updatedAt: string;
  completedIds: string[];
  failed: Array<{ id: string; error: string }>;
  named: number;
};

const CATALOG = resolve(
  repoRoot(),
  "apps/web/evals/registry-candidate-catalog-100.json",
);
const PROGRESS = resolve(repoRoot(), "deployments/bulk-name-progress.json");

function fingerprintFor(id: string): Hex {
  const h = createHash("sha256").update(`saviours-bulk:${id}`).digest("hex");
  return `0x${h}` as Hex;
}

function assessmentFromRow(row: CatalogRow): ThreatAssessment {
  const address = row.address.toLowerCase() as `0x${string}`;
  const fp = fingerprintFor(row.id);
  const raw = fp.slice(2);
  const status = row.status === "WATCH" ? "WATCH" : "TAINTED";
  return {
    status,
    confidence: status === "TAINTED" ? 0.9 : 0.68,
    entity: { chainId: 1, address, entityType: "EOA" },
    threatTypes: status === "TAINTED" ? ["DRAINER"] : ["SUSPICIOUS_BEHAVIOR"],
    evidence: [
      {
        id: `${row.id}-e1`,
        source: "saviours:catalog",
        reference: row.source_url || row.id,
        claim: `${row.label} — proof=${row.proof ?? "provenance"}`,
        timestamp: 1,
        rawHash: raw.slice(0, 64),
      },
      {
        id: `${row.id}-e2`,
        source: "saviours:catalog",
        reference: row.id,
        claim: `catalog ${row.id} · ${row.class ?? "unclassified"}`,
        timestamp: 2,
        rawHash: raw.slice(0, 32).padEnd(64, "0"),
      },
    ],
    counterEvidence: [],
    fingerprint: { behaviorHash: fp },
    modelVersion: "bulk-catalog",
    rulesVersion: RULES_VERSION,
    createdAt: Math.floor(Date.now() / 1000),
  };
}

function loadProgress(): Progress {
  if (!existsSync(PROGRESS)) {
    return { updatedAt: new Date().toISOString(), completedIds: [], failed: [], named: 0 };
  }
  return JSON.parse(readFileSync(PROGRESS, "utf8")) as Progress;
}

function saveProgress(p: Progress) {
  p.updatedAt = new Date().toISOString();
  writeFileSync(PROGRESS, JSON.stringify(p, null, 2) + "\n");
}

function nameable(row: CatalogRow): boolean {
  if (row.status !== "TAINTED" && row.status !== "WATCH") return false;
  if (row.tier === "DEMO_RESERVED") return false;
  if (row.tier === "PURGE" || row.tier === "REJECT_IF_THREAT") return false;
  if (row.proof === "reject") return false;
  if (!row.source_url?.trim()) return false;
  if (!/^0x[a-fA-F0-9]{40}$/.test(row.address)) return false;
  return true;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : 40;

  const catalog = JSON.parse(readFileSync(CATALOG, "utf8")) as {
    candidates: CatalogRow[];
  };
  const rows = catalog.candidates.filter(nameable);
  const progress = loadProgress();
  const done = new Set(progress.completedIds);

  console.log(`catalog nameable: ${rows.length}`);
  console.log(`already completed: ${done.size}`);
  console.log(`limit this run: ${limit}${dryRun ? " (dry-run)" : ""}`);

  if (!dryRun) {
    if (!isRegistryDeployed("sepolia")) throw new Error("Need deployments/sepolia.json");
    if (!isEnsIdentityReady()) throw new Error("Need deployments/sepolia-ens-identity.json");
  }

  let namedThisRun = 0;
  for (const row of rows) {
    if (namedThisRun >= limit) break;
    if (done.has(row.id)) continue;

    const proof = row.proof === "graph" || row.proof === "live" ? row.proof : "provenance";
    console.log(
      `\n→ ${row.id} ${row.status} proof=${proof} ${row.address.slice(0, 10)}… ${ensNameForAddress(row.address.toLowerCase() as `0x${string}`)}`,
    );

    if (dryRun) {
      namedThisRun++;
      continue;
    }

    try {
      const remembered = await rememberValidatedAssessment(assessmentFromRow(row), {
        network: "sepolia",
        ens: true,
        incidentLabel: row.id,
        threatSignals: row.class ? [row.class] : undefined,
        dossierUrl: row.source_url?.startsWith("http") ? row.source_url : undefined,
      });
      if (!remembered.persisted) {
        throw new Error(JSON.stringify(remembered));
      }
      progress.completedIds.push(row.id);
      progress.named += 1;
      namedThisRun++;
      saveProgress(progress);
      console.log(`  ok named=${progress.named}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      progress.failed.push({ id: row.id, error: msg.slice(0, 240) });
      saveProgress(progress);
      console.error(`  FAIL ${msg.slice(0, 160)}`);
      // continue — resumable
    }
  }

  console.log(`\ndone this run: ${namedThisRun}`);
  console.log(`progress file: ${PROGRESS}`);
  console.log(
    `headline suggestion: ${progress.named + done.size} named · print Graph-verified count separately from catalog proof=graph`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
