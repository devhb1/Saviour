import type { AuthorityAuditReport, AuditCompletionStatus } from "./types.js";

/**
 * Derive top-level audit completion from a finished report.
 * COMPLETE = usable full assessment. PARTIAL = usable evidence with gaps.
 * INCONCLUSIVE = not a Safe / snapshot / essential evidence missing.
 * INVALID_INPUT = bad chain/input.
 */
export function deriveAuditStatus(
  report: Pick<
    AuthorityAuditReport,
    "errors" | "freshness" | "graph" | "findings" | "reach" | "coverage"
  >,
): AuditCompletionStatus {
  if (report.errors.some((e) => /chainId must be 1/i.test(e))) {
    return "INVALID_INPUT";
  }
  if (report.freshness == null) {
    return "INCONCLUSIVE";
  }
  if (
    report.errors.some((e) =>
      /block hash (changed|inconsistent)|snapshot inconsistent/i.test(e),
    )
  ) {
    return "INCONCLUSIVE";
  }
  // Identity / essential inventory gaps always inconclusive — even if a graph
  // object was built. An EOA must never look like a successful treasury audit.
  if (
    report.coverage.gaps.some(
      (g) =>
        g.area === "safe.identity" ||
        g.area === "snapshot" ||
        g.area === "safe.essential",
    )
  ) {
    return "INCONCLUSIVE";
  }
  if (
    report.coverage.complete &&
    report.errors.length === 0 &&
    report.coverage.gaps.length === 0
  ) {
    return "COMPLETE";
  }
  return "PARTIAL";
}

/** HTTP-facing: only COMPLETE and PARTIAL are successful audits. */
export function auditOk(status: AuditCompletionStatus): boolean {
  return status === "COMPLETE" || status === "PARTIAL";
}

/**
 * VERSION() is the primary Safe identity signal.
 * Without it, the address is not a supported Safe at this block.
 */
export function isSupportedSafeIdentity(safe: {
  version: string | null;
  ownersRead?: string;
  thresholdRead?: string;
  modulesRead?: string;
}): boolean {
  return safe.version != null && safe.version.length > 0;
}
