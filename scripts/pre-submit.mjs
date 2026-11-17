#!/usr/bin/env node
/**
 * Finalist pre-submit gate — demo truth + form reminders.
 *
 *   pnpm pre-submit
 *
 * Exit 1 if ATTACK-1 is not TAINTED/BLOCK or Vitalik is not denylisted.
 * Does not submit the ETHGlobal form or record video (human).
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

console.log("=== 1 · Demo truth (ATTACK-1 TAINTED · Vitalik ESCALATE) ===\n");
const gate = spawnSync("node", [join(root, "scripts/check-demo-ready.mjs")], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
if (gate.status !== 0) {
  process.exit(gate.status ?? 1);
}

console.log(`
=== 2 · Human: film (DEMO_CUE) ===
  • Cold-open https://www.saviours.xyz — wait for Hook BLOCK paint
  • Never dispute ATTACK-1 · EAC probe BOT-1 only
  • Film: Hook → cast → Loop → Registry (N named · 2 Graph-verified) → Build → second agent $0
  • Extra clip: investigate-once-explain (~70–90s)

=== 3 · Human: ETHGlobal form ===
  • Category: Finalist and Partner Prizes
  • Slots only: The Graph · ENS · Bazantic
  • Paste: Hackathon/ZA ENDGAME FILES/SUBMISSION.md
  • Bazantic username (required) · npm 0.1.3 · commits 147+
  • Links: saviours.xyz · github.com/devhb1/Saviour · docs/AI-USAGE.md · docs/FEEDBACK.md
  • Submit ≥2 hours early

=== 4 · If film names break ===
  ATTACK-1 not TAINTED:  pnpm restore:attack1
  BOT-1 not WATCH:       pnpm restore:bot1
  Then:                  pnpm check:demo-ready / pnpm pre-submit

PRE-SUBMIT GATE GREEN — record film, then submit form.
`);
