#!/usr/bin/env node
/**
 * Integrator smoke — after `npm i @saviours/check` in a fresh project:
 *   node node_modules/@saviours/check/scripts/smoke.mjs
 * From this monorepo:
 *   pnpm --filter @saviours/check smoke
 */
let check;
try {
  ({ check } = await import("@saviours/check"));
} catch {
  ({ check } = await import("../dist/index.js"));
}

const ATTACK_1 = "0x935bfb495e33f74d2e9735df1da66ace442ede48";

const r = await check(ATTACK_1);
const named =
  r.decision === "BLOCK" ||
  r.decision === "WARN" ||
  r.status === "TAINTED" ||
  r.status === "WATCH";

console.log(
  JSON.stringify(
    {
      address: ATTACK_1,
      decision: r.decision,
      status: r.status,
      source: r.source,
      ensName: r.ensName ?? null,
    },
    null,
    2,
  ),
);

if (!named) {
  console.error(
    "Expected ATTACK-1 to be named (BLOCK/WARN · TAINTED/WATCH). Got",
    r.decision,
    r.status,
  );
  process.exit(1);
}

console.log("smoke ok · named threat · ENS resolve path");
