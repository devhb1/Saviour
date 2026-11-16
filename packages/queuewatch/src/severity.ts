import type { DecodedAction, DecoderSeverity, RegistryWriteHint } from "./types.js";

const RANK: Record<DecoderSeverity, number> = {
  INFO: 0,
  WATCH: 1,
  HIGH: 2,
  CRITICAL: 3,
  // UNSUPPORTED is coverage, not privilege rank — ignored in maxSeverity
  UNSUPPORTED: -1,
};

/** CRITICAL/HIGH privileged patterns → vault WATCH only (never auto-TAINTED). */
export function registryWriteForSeverity(sev: DecoderSeverity): RegistryWriteHint {
  if (sev === "CRITICAL" || sev === "HIGH") return "WATCH";
  if (sev === "WATCH") return "WATCH";
  return "NONE";
}

export function maxSeverity(actions: DecodedAction[]): DecoderSeverity {
  let best: DecoderSeverity = "INFO";
  let sawUnsupported = false;
  for (const a of actions) {
    if (a.severity === "UNSUPPORTED") {
      sawUnsupported = true;
      continue;
    }
    if (RANK[a.severity] > RANK[best]) best = a.severity;
  }
  if (best === "INFO" && sawUnsupported && actions.every((a) => a.severity === "UNSUPPORTED")) {
    return "UNSUPPORTED";
  }
  return best;
}

/**
 * Classify a known admin selector. DELEGATECALL alone is NOT auto-CRITICAL —
 * caller must pass operation + assessed target context.
 */
export function classifySelector(
  selectorHint: string,
  opts?: { operation?: 0 | 1; targetKnownProxy?: boolean },
): { severity: DecoderSeverity; note?: string } {
  const h = selectorHint.toLowerCase();
  if (
    h.includes("settxcooldown") ||
    h.includes("settxexpiration") ||
    h.includes("updatedelay") ||
    h.includes("enablemodule")
  ) {
    return { severity: "CRITICAL" };
  }
  if (h.includes("upgradeto") || h.includes("setimplementation")) {
    return { severity: "HIGH", note: "Escalate to CRITICAL if unverified impl or delay↓" };
  }
  if (opts?.operation === 1) {
    if (opts.targetKnownProxy) {
      return { severity: "WATCH", note: "DELEGATECALL to known proxy/module — contextual" };
    }
    return {
      severity: "HIGH",
      note: "DELEGATECALL not auto-CRITICAL; assess target/context",
    };
  }
  // Unknown selectors are NOT privilege changes — never invent WATCH here.
  return {
    severity: "UNSUPPORTED",
    note: "Unrecognized selector — not classified as a privilege change",
  };
}
