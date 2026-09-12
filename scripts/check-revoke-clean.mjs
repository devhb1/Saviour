#!/usr/bin/env node
/**
 * Static gate: revokeIncidentName must clear every SAVIOURS_TEXT_KEYS entry.
 * Does not write chain — source invariant only.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const resolveSrc = readFileSync(
  resolve(root, "packages/core/src/ens/resolve.ts"),
  "utf8",
);
const disputeSrc = readFileSync(
  resolve(root, "packages/core/src/ens/dispute.ts"),
  "utf8",
);

const keysMatch = resolveSrc.match(
  /export const SAVIOURS_TEXT_KEYS = \[([\s\S]*?)\] as const/,
);
if (!keysMatch) {
  console.error("FAIL  could not parse SAVIOURS_TEXT_KEYS");
  process.exit(1);
}
const keys = [...keysMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
if (keys.length < 10) {
  console.error(`FAIL  expected ≥10 text keys, got ${keys.length}`);
  process.exit(1);
}

const hasLoop =
  /for\s*\(\s*const\s+key\s+of\s+SAVIOURS_TEXT_KEYS\s*\)/.test(disputeSrc);
if (!hasLoop) {
  console.error(
    "FAIL  revokeIncidentName must iterate SAVIOURS_TEXT_KEYS to clear all keys",
  );
  process.exit(1);
}

console.log(`PASS  revoke sweeps ${keys.length} SAVIOURS_TEXT_KEYS`);
for (const k of keys) console.log(`  · ${k}`);
console.log("All revoke-clean assertions PASS.");
