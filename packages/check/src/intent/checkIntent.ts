import type { ReachReport } from "../authority/verdict.js";
import type { IntentCheckResult, IntentFile } from "./schema.js";

export type CheckIntentOptions = {
  /**
   * When true (default for CI), any relevant UNKNOWN principal → INCONCLUSIVE (ok=false).
   */
  requireKnown?: boolean;
};

/**
 * Check Reach ⊆ intent (v1).
 * Fail-closed: UNKNOWN on relevant principals → INCONCLUSIVE (never silent pass).
 */
export function checkIntent(
  intent: IntentFile,
  reach: ReachReport | null,
  opts?: CheckIntentOptions,
): IntentCheckResult {
  const requireKnown = opts?.requireKnown !== false;
  const breaks: IntentCheckResult["breaks"] = [];
  const coverageNotes: string[] = [];

  if (!reach || reach.principals.length === 0) {
    coverageNotes.push(
      "No Reach principals — intent check INCONCLUSIVE (UNKNOWN coverage)",
    );
    return {
      ok: false,
      status: "INCONCLUSIVE",
      breaks: [
        {
          id: "no-reach",
          rule: "REQUIRES_REACH",
          detail: "Run audit/reach before intent check",
        },
      ],
      coverageNotes,
    };
  }

  const mustNot = new Set(intent.must_not.map(String));

  for (const p of reach.principals) {
    if (p.kind === "owner_set") continue;

    if (p.verdict === "UNBOUNDED") {
      if (
        mustNot.has("delegatecall") ||
        mustNot.has("call_to_self") ||
        intent.may_call.every((c) => c.recipient === "must_equal_safe")
      ) {
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
      if (
        pat.includes("free-recipient") &&
        intent.may_call.some((c) => c.recipient === "must_equal_safe")
      ) {
        breaks.push({
          id: `free-recipient:${p.principalId}`,
          rule: "RECIPIENT_MUST_EQUAL_SAFE",
          detail: `${p.principalId} free recipient while intent requires must_equal_safe`,
        });
      }
    }

    if (p.verdict === "UNKNOWN") {
      coverageNotes.push(
        `${p.principalId}: UNKNOWN — cannot prove ⊆ intent`,
      );
      if (requireKnown) {
        breaks.push({
          id: `unknown:${p.principalId}`,
          rule: "INCONCLUSIVE_UNKNOWN",
          detail: `${p.principalId} is UNKNOWN — CI fail-closed (INCONCLUSIVE)`,
        });
      }
    }
  }

  const hasInconclusive = breaks.some((b) =>
    b.rule.includes("INCONCLUSIVE") || b.rule === "REQUIRES_REACH",
  );
  const hasExceeds = breaks.some((b) => !b.rule.includes("INCONCLUSIVE") && b.rule !== "REQUIRES_REACH");

  let status: IntentCheckResult["status"] = "PASS";
  if (hasExceeds) status = "FAIL";
  else if (hasInconclusive || breaks.length > 0) status = "INCONCLUSIVE";

  return {
    ok: breaks.length === 0,
    status,
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
  const blob = JSON.stringify(o);
  if (/max_value_usd|usd_per/i.test(blob)) {
    throw new Error("Intent v1 forbids USD fields — use token max_amount only");
  }
  return o;
}
