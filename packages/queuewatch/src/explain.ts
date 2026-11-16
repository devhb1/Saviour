import type { DecodedAction, DecodeResult, DecoderSeverity } from "./types.js";

export type PrivilegeExplanation = {
  summary: string;
  bullets: string[];
  privilegeClasses: string[];
};

function labelOf(a: DecodedAction): string {
  return (a.selectorHint ?? a.selector ?? "").toLowerCase();
}

function classifyPrivilege(a: DecodedAction): string | null {
  const h = labelOf(a);
  if (h.includes("settxcooldown") || h.includes("ebb2b4a2")) return "delay_collapse";
  if (h.includes("settxexpiration") || h.includes("9b56d5be")) return "delay_collapse";
  if (h.includes("updatedelay") || h.includes("e177246e")) return "delay_collapse";
  if (h.includes("enablemodule") || h.includes("610b5925")) return "module_surface";
  if (h.includes("upgradeto") || h.includes("setimplementation")) return "upgrade";
  if (h.includes("disablemodule")) return "module_surface";
  if (a.severity === "CRITICAL" || a.severity === "HIGH") return "privileged_other";
  return null;
}

function englishLine(a: DecodedAction): string | null {
  const h = labelOf(a);
  if (h.includes("settxcooldown") || h.includes("ebb2b4a2")) {
    return "Transaction cooldown / delay is being set to zero — the waiting period before execution can disappear.";
  }
  if (h.includes("settxexpiration") || h.includes("9b56d5be")) {
    return "Transaction expiration on the delay module is being zeroed — queued ops may execute without the usual expiry window.";
  }
  if (h.includes("updatedelay") || h.includes("e177246e")) {
    return "Timelock delay update toward zero — privilege execution can become immediate after queue.";
  }
  if (h.includes("enablemodule") || h.includes("610b5925")) {
    const target = a.to ? ` (${a.to.slice(0, 10)}…)` : "";
    return `A module is being enabled${target} — a new path may execute through the Safe without the normal owner threshold alone.`;
  }
  if (h.includes("upgradeto") || h.includes("setimplementation")) {
    return "Implementation / upgrade path touched — control-plane change; treat as high privilege.";
  }
  if (a.severity === "CRITICAL") {
    return `Critical privileged action (${a.selectorHint ?? "unknown"}) — review before authorize.`;
  }
  if (a.severity === "HIGH") {
    return `High-privilege action (${a.selectorHint ?? "unknown"}) — confirm intent and target.`;
  }
  return null;
}

const RANK: Record<DecoderSeverity, number> = {
  INFO: 0,
  WATCH: 1,
  HIGH: 2,
  CRITICAL: 3,
  UNSUPPORTED: 4,
};

/**
 * Plain-English privilege narrative for Review UI and Telegram alerts.
 * Prefer this over raw selector dumps for signers.
 */
export function explainPrivilege(decoded: DecodeResult): PrivilegeExplanation {
  const bullets: string[] = [];
  const classes = new Set<string>();

  const sorted = [...decoded.actions].sort(
    (a, b) => RANK[b.severity] - RANK[a.severity],
  );

  for (const a of sorted) {
    const cls = classifyPrivilege(a);
    if (cls) classes.add(cls);
    const line = englishLine(a);
    if (line && !bullets.includes(line)) bullets.push(line);
  }

  if (decoded.vaultWrite === "WATCH" && bullets.length === 0) {
    bullets.push(
      "Privileged governance pattern detected — vault should be treated as WATCH until cancel, expiry, or quarantine ends.",
    );
  }

  if (!decoded.supported) {
    bullets.push(
      "Part of this payload is unsupported — coverage is partial; do not treat silence as SAFE.",
    );
  }

  let summary: string;
  if (classes.has("delay_collapse") && classes.has("module_surface")) {
    summary =
      "This action collapses a security delay and expands module execution surface — classic privilege capture pattern.";
  } else if (classes.has("delay_collapse")) {
    summary = "This action weakens or removes a time delay that protects the treasury.";
  } else if (classes.has("module_surface")) {
    summary = "This action changes which modules can execute through the Safe / vault.";
  } else if (classes.has("upgrade")) {
    summary = "This action touches upgrade / implementation control.";
  } else if (decoded.vaultWrite === "WATCH") {
    summary = "Privileged operations detected that can affect treasury control.";
  } else {
    summary = "No clear privilege-mutation pattern in supported decode paths.";
  }

  return {
    summary,
    bullets: bullets.slice(0, 6),
    privilegeClasses: [...classes],
  };
}
