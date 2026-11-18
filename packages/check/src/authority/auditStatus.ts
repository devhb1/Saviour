import type { AuthorityAuditReport, AuditCompletionStatus } from "./types.js";

/**
 * Derive top-level audit completion from a finished report.
 * COMPLETE = usable full assessment. PARTIAL = usable evidence with gaps.
 * INCONCLUSIVE = snapshot or essential evidence missing. INVALID_INPUT = bad chain/input.
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
  const hasIdentityGap = report.coverage.gaps.some(
    (g) => g.area === "safe.identity" || g.area === "snapshot",
  );
  if (hasIdentityGap && report.graph == null) {
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
