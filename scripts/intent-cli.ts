#!/usr/bin/env tsx
/**
 *   pnpm intent:cli --intent fixtures/intent/reference-keeper.json --safe 0x…
 */
import { readFileSync } from "node:fs";
import { auditSafe, checkIntent, parseIntentJson } from "@saviours/check";
import type { Hex } from "viem";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return undefined;
}

async function main() {
  const intentPath = arg("--intent");
  if (!intentPath) {
    console.error("Usage: pnpm intent:cli --intent path.json [--safe 0x…]");
    process.exit(1);
  }
  const intent = parseIntentJson(
    JSON.parse(readFileSync(intentPath, "utf8")),
  );
  const safe = (arg("--safe") ?? intent.safe) as Hex;
  const report = await auditSafe({ safeAddress: safe });
  const result = checkIntent(intent, report.reach);
  console.log("=== Saviour Intent Check ===");
  console.log("safe:", safe);
  console.log("role:", intent.role);
  console.log("ok:", result.ok);
  for (const b of result.breaks) {
    console.log(`  BREAK ${b.id}: ${b.detail}`);
  }
  for (const n of result.coverageNotes) {
    console.log(`  note: ${n}`);
  }
  process.exit(result.ok ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
