/**
 * Gate: confidence helpers never double-scale ENS percent values.
 *   pnpm --filter @saviours/core exec tsx src/confidence.check.ts
 */
import {
  confidenceToPct,
  confidenceToUnit,
  formatConfidencePct,
} from "./confidence";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(confidenceToUnit(0.92) === 0.92, "unit stays unit");
assert(confidenceToUnit(92) === 0.92, "ENS percent → unit");
assert(confidenceToPct(0.92) === 92, "unit → pct");
assert(confidenceToPct(92) === 92, "percent stays pct");
assert(formatConfidencePct(92) === "92%", "format ENS-style");
assert(formatConfidencePct(0.92) === "92%", "format unit-style");
assert(formatConfidencePct(null) === "—", "null");

// The bug: UI did Math.round(92 * 100) → 9200
assert(formatConfidencePct(92) !== "9200%", "never 9200");

console.log("ok: confidence normalize (no 9200%)");
