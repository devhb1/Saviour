#!/usr/bin/env tsx
/**
 * Control-Path Auditor CLI — Safe address → Findings · Coverage · Freshness
 *
 *   pnpm audit:cli --safe 0x46DA…
 *   pnpm audit:cli --fixture reference
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { auditSafe } from "@saviours/check";
import type { Hex } from "viem";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return undefined;
}

async function main() {
  let safe: string | undefined = arg("--safe");
  const fixture = arg("--fixture");

  if (fixture === "reference" || (!safe && !fixture)) {
    const raw = JSON.parse(
      readFileSync(
        join(root, "fixtures/authority/reference-safe.json"),
        "utf8",
      ),
    );
    safe = raw.safeAddress;
    console.log("fixture:", raw.id);
  }

  if (!safe?.startsWith("0x")) {
    console.error("Usage: pnpm audit:cli --safe 0x… | --fixture reference");
    process.exit(1);
  }

  console.log("=== Saviour Control-Path Audit ===");
  console.log("safe:", safe);

  const report = await auditSafe({ safeAddress: safe as Hex, chainId: 1 });

  console.log("\n--- freshness ---");
  console.log(
    report.freshness
      ? `chain=${report.freshness.chainId} block=${report.freshness.blockNumber} hash=${report.freshness.blockHash.slice(0, 14)}…`
      : "unavailable",
  );

  console.log("\n--- coverage ---");
  console.log(
    JSON.stringify(
      {
        complete: report.coverage.complete,
        reconstructed: report.coverage.reconstructed,
        gaps: report.coverage.gaps,
      },
      null,
      2,
    ),
  );

  console.log("\n--- findings ---");
  if (report.findings.length === 0) {
    console.log("(none — absence of findings ≠ SAFE; check Coverage)");
  } else {
    for (const f of report.findings) {
      console.log(`[${f.severity}] ${f.rule}: ${f.title}`);
      console.log(`  ${f.detail}`);
    }
  }

  if (report.graph) {
    console.log("\n--- graph summary ---");
    console.log(
      JSON.stringify(
        {
          owners: report.graph.safe.owners.length,
          threshold: report.graph.safe.threshold,
          version: report.graph.safe.version,
          modules: report.graph.safe.modules,
          delays: report.graph.delays.map((d) => ({
            address: d.address,
            txCooldown: d.txCooldown,
            txExpiration: d.txExpiration,
          })),
          edges: report.graph.edges.map((e) => ({
            kind: e.kind,
            from: e.from,
            to: e.to,
          })),
        },
        null,
        2,
      ),
    );
  }

  if (report.errors.length) {
    console.log("\n--- errors ---");
    for (const e of report.errors) console.log(e);
  }

  if (arg("--json") === "full" || process.argv.includes("--json-full")) {
    console.log("\n--- full report ---");
    console.log(JSON.stringify(report, null, 2));
  }

  const critical = report.findings.some((f) => f.severity === "CRITICAL");
  process.exitCode = critical ? 2 : report.errors.length ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
