import type { ReachReport } from "../authority/verdict.js";
import type { IntentCheckResult, IntentFile } from "./schema.js";

/**
 * Check Reach ⊆ intent (v1 heuristic).
 * Full permission-id matching lands with Roles tree reconstruction.
 */
export function checkIntent(
  intent: IntentFile,
  reach: ReachReport | null,
): IntentCheckResult {
  const breaks: IntentCheckResult["breaks"] = [];
  const coverageNotes: string[] = [];

  if (!reach || reach.principals.length === 0) {
    coverageNotes.push(
      "No Reach principals — intent check inconclusive (UNKNOWN coverage)",
    );
    return { ok: false, breaks: [{
      id: "no-reach",
      rule: "REQUIRES_REACH",
      detail: "Run audit/reach before intent check",
    }], coverageNotes };
  }

  const mustNot = new Set(intent.must_not.map(String));

  for (const p of reach.principals) {
    if (p.kind === "owner_set") continue;

    if (p.verdict === "UNBOUNDED") {
      if (mustNot.has("delegatecall") || mustNot.has("call_to_self") || intent.may_call.every((c) => c.recipient === "must_equal_safe")) {
        breaks.push({
          id: `unbounded:${p.principalId}`,
          rule: "EXCEEDS_INTENT",
          detail: `${p.principalId} verdict UNBOUNDED — exceeds declared keeper-style intent for role ${intent.role}`,
        });
      }
    }

    for (const pat of p.patterns) {
      if (pat.includes("delegatecall") && mustNot.has("delegatecall")) {
        breaks.push({
          id: `delegatecall:${p.principalId}`,
          rule: "MUST_NOT_DELEGATECALL",
          detail: `${p.principalId} hits ${pat}`,
        });
      }
      if (pat.includes("call-safe") && mustNot.has("call_to_self")) {
        breaks.push({
          id: `call-self:${p.principalId}`,
          rule: "MUST_NOT_CALL_SELF",
          detail: `${p.principalId} hits ${pat}`,
        });
      }
      if (pat.includes("free-recipient") && intent.may_call.some((c) => c.recipient === "must_equal_safe")) {
        breaks.push({
          id: `free-recipient:${p.principalId}`,
          rule: "RECIPIENT_MUST_EQUAL_SAFE",
          detail: `${p.principalId} suspected free recipient while intent requires must_equal_safe`,
        });
      }
    }

    if (p.verdict === "UNKNOWN") {
      coverageNotes.push(
        `${p.principalId}: UNKNOWN — cannot prove ⊆ intent; treat as fail-closed for CI if requireKnown=true`,
      );
    }
  }

  return {
    ok: breaks.length === 0,
    breaks,
    coverageNotes,
  };
}

export function parseIntentJson(raw: unknown): IntentFile {
  const o = raw as IntentFile;
  if (!o?.safe || !o?.role || !Array.isArray(o.may_call)) {
    throw new Error("Invalid intent: need safe, role, may_call[]");
  }
  if (typeof o.chain !== "number") throw new Error("Invalid intent: chain number required");
  // Reject USD fields if present
  const blob = JSON.stringify(o);
  if (/max_value_usd|usd_per/i.test(blob)) {
    throw new Error("Intent v1 forbids USD fields — use token max_amount only");
  }
  return o;
}
