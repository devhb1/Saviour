import type { Hex } from "../assessTypes.js";
import type { AuthorityFinding } from "./types.js";
import type { PrincipalReach, ReachVerdictKind } from "./verdict.js";
import { mergeVerdict } from "./verdict.js";

export type PatternHit = {
  id: string;
  severity: "CRITICAL" | "WARN";
  title: string;
  detail: string;
  forcesVerdict: ReachVerdictKind;
};

/**
 * Dangerous standing-authority patterns (Vision / Endgame §3.4).
 * Applied when topology or known incident facts imply the pattern —
 * full condition-tree matching comes with Roles enumeration.
 */
export function evaluateTopologyPatterns(input: {
  safeAddress: Hex;
  hasRolesModule: boolean;
  hasDelay: boolean;
  directModulesBypassDelay: boolean;
  rolesCanCallSafe?: boolean;
  rolesDelegatecall?: boolean;
  freeRecipientTransferSuspected?: boolean;
}): PatternHit[] {
  const hits: PatternHit[] = [];

  if (input.directModulesBypassDelay) {
    hits.push({
      id: "pattern:delay-bypass",
      severity: "CRITICAL",
      title: "Module path bypasses Delay",
      detail:
        "A direct Safe module can reach the treasury without the Delay waiting period.",
      forcesVerdict: "UNBOUNDED",
    });
  }

  if (input.hasRolesModule && !input.hasDelay) {
    hits.push({
      id: "pattern:roles-no-delay",
      severity: "WARN",
      title: "Roles module without Delay on path",
      detail:
        "Roles can execute immediately through the Safe unless another control intervenes. Bound depends on policy trees (may be UNKNOWN).",
      forcesVerdict: "UNKNOWN",
    });
  }

  if (input.rolesDelegatecall) {
    hits.push({
      id: "pattern:roles-delegatecall",
      severity: "CRITICAL",
      title: "Roles may delegatecall",
      detail:
        "Delegatecall to unverified/upgradeable targets is treated as total compromise.",
      forcesVerdict: "UNBOUNDED",
    });
  }

  if (input.rolesCanCallSafe) {
    hits.push({
      id: "pattern:roles-call-safe",
      severity: "CRITICAL",
      title: "Roles may call the Safe itself",
      detail:
        "Ability to change owners/modules/guard escalates to full control.",
      forcesVerdict: "UNBOUNDED",
    });
  }

  if (input.freeRecipientTransferSuspected) {
    hits.push({
      id: "pattern:free-recipient",
      severity: "CRITICAL",
      title: "Outbound value to unrestricted recipient suspected",
      detail:
        "Transfer/withdraw/redeem with free recipient → worst-case = balances (UNBOUNDED for practical purposes).",
      forcesVerdict: "UNBOUNDED",
    });
  }

  return hits;
}

export function patternsToFindings(hits: PatternHit[]): AuthorityFinding[] {
  return hits.map((h) => ({
    id: h.id,
    rule: h.id.toUpperCase().replace(/:/g, "_"),
    severity: h.severity === "CRITICAL" ? "CRITICAL" : "WARN",
    title: h.title,
    detail: h.detail,
    evidence: [`forcesVerdict=${h.forcesVerdict}`],
  }));
}

export function applyPatternsToPrincipal(
  base: PrincipalReach,
  hits: PatternHit[],
): PrincipalReach {
  let verdict = base.verdict;
  const patterns = [...base.patterns];
  const reasons = [...base.reasons];
  for (const h of hits) {
    verdict = mergeVerdict(verdict, h.forcesVerdict);
    patterns.push(h.id);
    reasons.push(h.title);
  }
  return { ...base, verdict, patterns, reasons };
}
