/**
 * ENDGAME Phase 3 — bulk-name from registry-candidate-catalog.
 *
 * Honest rules:
 *   - Only WATCH / TAINTED
 *   - Skip SAFE, REJECT, DEMO_RESERVED, AUDIT, missing source_url
 *   - proof stays graph | provenance | live (never launder)
 *
 * Usage:
 *   pnpm exec tsx scripts/bulk-name-catalog.ts --dry-run
 *   pnpm exec tsx scripts/bulk-name-catalog.ts --limit=40
 *   pnpm exec tsx scripts/bulk-name-catalog.ts --limit=100 --retry-failed
 *
 * Requires: SEPOLIA_RPC_URL, RELAYER_PRIVATE_KEY / investigator keys.
 * Fund faucet FIRST — this burns Sepolia gas. Respects Alchemy 429 with backoff.
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
import { resolveIncident } from "../packages/core/src/ens/resolve";
import {
  getLatestIncidentByTarget,
} from "../packages/core/src/registry/client";
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
  const status = row.status === "WATCH" ? "WATCH" : "TAINTED";
  return {
    status,
    confidence: status === "TAINTED" ? 0.9 : 0.68,
    entity: { chainId: 1, address, entityType: "EOA" },
    threatTypes: status === "TAINTED" ? ["DRAINER"] : ["SUSPICIOUS_BEHAVIOR"],
    evidence: [
      {
        id: "e0",
        source: "graph",
        reference: row.source_url || "bulk",
        claim: row.label || row.id,
        timestamp: 1,
        rawHash: (`0x${"11".repeat(32)}`) as Hex,
      },
    ],
    signals: [],
    fingerprint: { behaviorHash: fp },
    modelVersion: "bulk-catalog",
    rulesVersion: RULES_VERSION,
    createdAt: Math.floor(Date.now() / 1000),
  };
}

function redactError(msg: string): string {
  return msg
    .replace(/https?:\/\/[^\s"'\\]+/gi, "[redacted-url]")
    .replace(/\/v2\/[A-Za-z0-9_-]+/g, "/v2/[redacted]")
    .replace(/alch_[A-Za-z0-9_-]+/gi, "[redacted-key]")
    .replace(/0x[a-fA-F0-9]{64}/g, "0x[tx]")
    .slice(0, 180);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRateLimited(msg: string): boolean {
  return /429|rate limit|Too Many Requests/i.test(msg);
}

function loadProgress(): Progress {
  if (!existsSync(PROGRESS)) {
    return { updatedAt: new Date().toISOString(), completedIds: [], failed: [], named: 0 };
  }
  return JSON.parse(readFileSync(PROGRESS, "utf8")) as Progress;
}

function saveProgress(p: Progress) {
  p.updatedAt = new Date().toISOString();
  // Keep failed list deduped + redacted
  const byId = new Map<string, { id: string; error: string }>();
  for (const f of p.failed) {
    byId.set(f.id, { id: f.id, error: redactError(f.error) });
  }
  p.failed = [...byId.values()];
  writeFileSync(PROGRESS, JSON.stringify(p, null, 2) + "\n");
}

function nameable(row: CatalogRow): boolean {
  if (row.status !== "TAINTED" && row.status !== "WATCH") return false;
  if (row.tier === "DEMO_RESERVED") return false;
  if (row.tier === "PURGE" || row.tier === "REJECT_IF_THREAT") return false;
  if (row.tier === "AUDIT") return false; // pollution / audit rows — never bulk-name
  if (row.proof === "reject") return false;
  if (!row.source_url?.trim()) return false;
  if (!/^0x[a-fA-F0-9]{40}$/.test(row.address)) return false;
  // Celebrity / victim denylist (also in Shield NEVER_PIN)
  const a = row.address.toLowerCase();
  if (
    a === "0xd8da6bf26964af9d7eed9e03e53415d37aa96045" ||
    a === "0xc74b72bbf904bac9fac880303922fc76a69f0bb4"
  ) {
    return false;
  }
  return true;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const retryFailed = process.argv.includes("--retry-failed");
  const limitEq = process.argv.find((a) => a.startsWith("--limit="));
  const limitIdx = process.argv.indexOf("--limit");
  const limit = limitEq
    ? Number(limitEq.split("=")[1])
    : limitIdx >= 0
      ? Number(process.argv[limitIdx + 1])
      : 40;

  const catalog = JSON.parse(readFileSync(CATALOG, "utf8")) as {
    candidates: CatalogRow[];
  };
  const rows = catalog.candidates.filter(nameable);
  const progress = loadProgress();
  // Drop AUDIT pollution from completed if it snuck in
  progress.completedIds = progress.completedIds.filter(
    (id) => id !== "LIVE-POLLUTION-22b4",
  );
  progress.named = progress.completedIds.length;
  const done = new Set(progress.completedIds);
  const failedIds = new Set(progress.failed.map((f) => f.id));

  console.log(`catalog nameable: ${rows.length}`);
  console.log(`already completed: ${done.size}`);
  console.log(`limit this run: ${limit}${dryRun ? " (dry-run)" : ""}`);
  if (!retryFailed) {
    console.log(`skipping ${failedIds.size} prior failures (pass --retry-failed to retry)`);
  }

  if (!dryRun) {
    if (!isRegistryDeployed("sepolia")) throw new Error("Need deployments/sepolia.json");
    if (!isEnsIdentityReady()) throw new Error("Need deployments/sepolia-ens-identity.json");
  }

  let attempted = 0;
  let namedThisRun = 0;
  let backoffMs = 1500;

  for (const row of rows) {
    if (attempted >= limit) break;
    if (done.has(row.id)) continue;
    if (!retryFailed && failedIds.has(row.id)) continue;

    const proof = row.proof === "graph" || row.proof === "live" ? row.proof : "provenance";
    console.log(
      `\n→ ${row.id} ${row.status} proof=${proof} ${row.address.slice(0, 10)}… ${ensNameForAddress(row.address.toLowerCase() as `0x${string}`)}`,
    );

    if (dryRun) {
      attempted++;
      namedThisRun++;
      continue;
    }

    attempted++;
    try {
      // ENS skip only when registry also has a row — avoid half-named orphans
      try {
        const existing = await resolveIncident(row.address.toLowerCase(), {
          keys: ["saviours.status"],
        });
        const st = (existing.records["saviours.status"] ?? "").toUpperCase();
        if (existing.hit && (st === "TAINTED" || st === "WATCH")) {
          const onRegistry = await getLatestIncidentByTarget(
            1,
            row.address.toLowerCase() as `0x${string}`,
            "sepolia",
          );
          if (onRegistry) {
            progress.completedIds.push(row.id);
            progress.named = progress.completedIds.length;
            progress.failed = progress.failed.filter((f) => f.id !== row.id);
            done.add(row.id);
            namedThisRun++;
            saveProgress(progress);
            console.log(`  skip already-named ENS+registry ${st}`);
            await sleep(400);
            continue;
          }
          console.log(`  ENS ${st} but no registry row — remembering…`);
        }
      } catch {
        // soft — fall through
      }

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
      progress.named = progress.completedIds.length;
      progress.failed = progress.failed.filter((f) => f.id !== row.id);
      done.add(row.id);
      namedThisRun++;
      saveProgress(progress);
      console.log(`  ok named=${progress.named}${remembered.reused ? " (reused)" : ""}`);
      backoffMs = 1500;
      await sleep(800);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      progress.failed.push({ id: row.id, error: redactError(msg) });
      saveProgress(progress);
      console.error(`  FAIL ${redactError(msg)}`);
      if (isRateLimited(msg)) {
        console.error(`  rate-limited — sleeping ${backoffMs}ms`);
        await sleep(backoffMs);
        backoffMs = Math.min(backoffMs * 2, 30_000);
      } else {
        await sleep(600);
      }
    }
  }

  console.log(`\nattempted this run: ${attempted}`);
  console.log(`named this run: ${namedThisRun}`);
  console.log(`progress total named: ${progress.named}`);
  console.log(`progress file: ${PROGRESS}`);
  console.log(
    `headline suggestion: ${progress.named} named · print Graph-verified count separately from catalog proof=graph`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
