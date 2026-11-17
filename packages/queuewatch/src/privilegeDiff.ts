import type { DecodedAction, DecodeResult } from "./types.js";

export type DiffSource = "calldata-arg" | "rpc-read" | "unknown";

export type PrivilegeClaim = {
  id: string;
  control: string;
  before: string;
  after: string;
  source: DiffSource;
  severity: string;
  evidence: string;
};

export type PrivilegeDiff = {
  claims: PrivilegeClaim[];
  unknowns: string[];
  summary: string;
  honesty: string[];
};

/**
 * Build before/after privilege claims from decoded actions.
 * Before-state is UNKNOWN unless supplied via `current` (RPC reads).
 * After-state from calldata args when unambiguous.
 */
export function buildPrivilegeDiff(
  decoded: DecodeResult,
  current?: {
    txCooldown?: string | null;
    txExpiration?: string | null;
    modules?: string[] | null;
    delay?: string | null;
  },
): PrivilegeDiff {
  const claims: PrivilegeClaim[] = [];
  const unknowns: string[] = [];
  let i = 0;

  for (const a of decoded.actions) {
    const claim = claimFromAction(a, current, i++);
    if (claim) claims.push(claim);
  }

  // Use != null so a legitimate on-chain value of "0" is not treated as unread.
  if (current?.txCooldown == null) {
    unknowns.push(
      "Current Delay cooldown unread — before-state marked UNKNOWN without RPC",
    );
  }
  if (current?.modules == null) {
    unknowns.push(
      "Current Safe/Delay module set unread — enableModule before-state UNKNOWN",
    );
  }

  const critical = claims.filter((c) => c.severity === "CRITICAL");
  const summary =
    critical.length > 0
      ? `Proposed execution reduces time protection and/or expands execution authority (${critical.length} high-impact control change${critical.length > 1 ? "s" : ""}).`
      : claims.length > 0
        ? "Privilege-related changes detected — review before/after claims."
        : "No privilege control changes decoded from supported selectors.";

  return {
    claims,
    unknowns,
    summary,
    honesty: [
      "Static decode ≠ fork simulation.",
      "After-values from calldata args when unambiguous; before-values require RPC or stay UNKNOWN.",
      "UNSUPPORTED nested paths are omitted from Privilege Diff.",
      "txCooldown=0 removes wait; txExpiration=0 removes expiry (FIFO liveness risk) — not the same control.",
      "A Delay only protects routes that execute through it — direct Safe modules bypass Delay.",
    ],
  };
}

function claimFromAction(
  a: DecodedAction,
  current:
    | {
        txCooldown?: string | null;
        txExpiration?: string | null;
        modules?: string[] | null;
        delay?: string | null;
      }
    | undefined,
  idx: number,
): PrivilegeClaim | null {
  const hint = (a.selectorHint ?? "").toLowerCase();
  const args = a.args ?? [];

  if (hint.includes("settxcooldown") || hint === "settxcooldown") {
    const after = String(args[0] ?? "?");
    const afterNote =
      after === "0"
        ? "0 (removes waiting period on this Delay path)"
        : after;
    return {
      id: `c${idx}-cooldown`,
      control: "Delay txCooldown (waiting period before execute)",
      before: current?.txCooldown != null ? String(current.txCooldown) : "UNKNOWN",
      after: afterNote,
      source: current?.txCooldown != null ? "rpc-read" : "unknown",
      severity: a.severity,
      evidence: `${a.selectorHint}(${after}) on ${short(a.to)} — distinct from expiration`,
    };
  }

  if (hint.includes("settxexpiration")) {
    const after = String(args[0] ?? "?");
    const afterNote =
      after === "0"
        ? "0 (no automatic expiry; queued item may block FIFO indefinitely)"
        : after;
    return {
      id: `c${idx}-expiration`,
      control: "Delay txExpiration (queued-tx lifetime — not cooldown)",
      before:
        current?.txExpiration != null ? String(current.txExpiration) : "UNKNOWN",
      after: afterNote,
      source: current?.txExpiration != null ? "rpc-read" : "unknown",
      severity: a.severity,
      evidence: `${a.selectorHint}(${after}) on ${short(a.to)} — not the same as cooldown=0`,
    };
  }

  if (hint.includes("updatedelay")) {
    const after = String(args[0] ?? "?");
    return {
      id: `c${idx}-delay`,
      control: "Timelock delay",
      before: current?.delay != null ? String(current.delay) : "UNKNOWN",
      after,
      source: current?.delay != null ? "rpc-read" : "calldata-arg",
      severity: a.severity,
      evidence: `${a.selectorHint}(${after}) on ${short(a.to)}`,
    };
  }

  if (hint.includes("enablemodule")) {
    const module = String(args[0] ?? a.to ?? "?");
    const known = current?.modules?.map((m) => m.toLowerCase()) ?? null;
    const before =
      known == null
        ? "UNKNOWN (module set unread)"
        : known.includes(module.toLowerCase())
          ? "already enabled"
          : "not enabled";
    return {
      id: `c${idx}-module`,
      control: "Execution module authority",
      before,
      after: `enableModule(${short(module)})`,
      source: known == null ? "unknown" : "rpc-read",
      severity: a.severity,
      evidence: `enableModule ${module}`,
    };
  }

  if (a.severity === "CRITICAL" || a.severity === "HIGH") {
    return {
      id: `c${idx}-generic`,
      control: a.selectorHint ?? a.selector ?? "privileged call",
      before: "UNKNOWN",
      after: "changed (see evidence)",
      source: "unknown",
      severity: a.severity,
      evidence: a.note ?? a.path.join(" → "),
    };
  }

  return null;
}

function short(addr?: string) {
  if (!addr) return "?";
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`;
}
