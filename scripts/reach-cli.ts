#!/usr/bin/env tsx
/**
 * Reach / Permission Auditor CLI
 *
 *   pnpm reach:cli --fixture reference
 *   pnpm reach:cli --fixture nov16
 *   pnpm reach:cli --safe 0x…
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { auditSafe, goldenReportJson } from "@saviours/check";
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
  let probeMembers: Hex[] | undefined;
  let fixtureAssumptions:
    | {
        freeRecipientTransferSuspected?: boolean;
        labels?: string[];
      }
    | undefined;

  if (fixture === "nov16") {
    const raw = JSON.parse(
      readFileSync(
        join(root, "fixtures/authority/nov16-blast-radius.json"),
        "utf8",
      ),
    );
    safe = raw.safeAddress;
    probeMembers = [raw.roleMemberOperator as Hex];
    // Fixture-only — loud assumption; not a public API flag
    fixtureAssumptions = {
      freeRecipientTransferSuspected: true,
      labels: [
        "nov16-fixture: free-recipient suspected until v1 tree reconstruction replaces this assumption",
      ],
    };
    console.log("fixture:", raw.id, "blockBeforeTheft:", raw.blockBeforeTheft);
    console.log(
      "expected (pre-engine):",
      raw.expectedVerdictBeforeEngine.verdict,
    );
    console.warn(
      "NOTE: freeRecipientTransferSuspected is a CLI fixture assumption — not public API",
    );
  } else if (fixture === "reference" || (!safe && !fixture)) {
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
    console.error("Usage: pnpm reach:cli --safe 0x… | --fixture reference|nov16");
    process.exit(1);
  }

  const report = await auditSafe({
    safeAddress: safe as Hex,
    probeMembers,
    fixtureAssumptions,
  });

  console.log("=== Saviour Reach CLI ===");
  console.log("safe:", report.safeAddress);
  console.log(
    "freshness:",
    report.freshness
      ? `block=${report.freshness.blockNumber} host=${report.freshness.rpcUrlHost ?? "?"}`
      : "n/a",
  );
  if (report.assumptions?.length) {
    console.log("assumptions:");
    for (const a of report.assumptions) console.log(" ", a);
  }
  console.log("findings:", report.findings.length);
  for (const f of report.findings.slice(0, 12)) {
    console.log(`  [${f.severity}] ${f.rule} — ${f.title}`);
  }
  console.log("coverage.complete:", report.coverage.complete);
  console.log(
    "coverage.components:",
    report.coverage.components
      ?.map((c) => `${c.id}=${c.status}`)
      .join(", ") ?? "(none)",
  );
  console.log("gaps:", report.coverage.gaps.length);
  console.log("reach principals:");
  for (const p of report.reach?.principals ?? []) {
    console.log(
      `  ${p.principalId} → ${p.verdict} :: ${p.reasons[0] ?? ""}`,
    );
  }

  const out = arg("--out");
  if (out) {
    writeFileSync(out, goldenReportJson(report));
    console.log("wrote golden report:", out);
  } else if (process.argv.includes("--json")) {
    process.stdout.write(goldenReportJson(report));
  }

  const critical = report.findings.some((f) => f.severity === "CRITICAL");
  const unboundedMember = (report.reach?.principals ?? []).some(
    (p) => p.kind === "role_member" && p.verdict === "UNBOUNDED",
  );
  if (critical || unboundedMember) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
