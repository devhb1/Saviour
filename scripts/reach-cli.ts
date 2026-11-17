#!/usr/bin/env tsx
/**
 * Reach / Blast Radius preview CLI
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
  let knownRoleMembers: Hex[] | undefined;
  let suspectFreeRecipient = false;

  if (fixture === "nov16") {
    const raw = JSON.parse(
      readFileSync(
        join(root, "fixtures/authority/nov16-blast-radius.json"),
        "utf8",
      ),
    );
    safe = raw.safeAddress;
    knownRoleMembers = [raw.roleMemberOperator as Hex];
    suspectFreeRecipient = true;
    console.log("fixture:", raw.id, "blockBeforeTheft:", raw.blockBeforeTheft);
    console.log(
      "expected (pre-engine):",
      raw.expectedVerdictBeforeEngine.verdict,
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
    knownRoleMembers,
    suspectFreeRecipient,
  });

  console.log("=== Saviour Reach CLI (preview) ===");
  console.log("safe:", report.safeAddress);
  console.log(
    "freshness:",
    report.freshness
      ? `block=${report.freshness.blockNumber} host=${report.freshness.rpcUrlHost ?? "?"}`
      : "n/a",
  );
  console.log("findings:", report.findings.length);
  for (const f of report.findings.slice(0, 12)) {
    console.log(`  [${f.severity}] ${f.rule} — ${f.title}`);
  }
  console.log("coverage.complete:", report.coverage.complete);
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

  // Exit 2 if any CRITICAL finding or UNBOUNDED role_member with suspect fixture
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
