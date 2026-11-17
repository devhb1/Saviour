import type { AuthorityAuditReport } from "../authority/types.js";

/** Stable golden report envelope for CLI / shareable URLs / CI. */
export type GoldenReport = {
  schemaVersion: "1.0.0";
  product: "saviour";
  feature: "blast-radius-reach-preview" | "authority-audit";
  generatedAt: string;
  engineVersion: string;
  rolesModelVersion: string | null;
  safeAddress: string;
  freshness: AuthorityAuditReport["freshness"];
  coverage: AuthorityAuditReport["coverage"];
  findings: AuthorityAuditReport["findings"];
  reach: AuthorityAuditReport["reach"];
  errors: string[];
  honesty: string[];
};

export function toGoldenReport(audit: AuthorityAuditReport): GoldenReport {
  return {
    schemaVersion: "1.0.0",
    product: "saviour",
    feature: audit.reach?.principals.length
      ? "blast-radius-reach-preview"
      : "authority-audit",
    generatedAt: new Date().toISOString(),
    engineVersion: audit.version,
    rolesModelVersion: audit.reach?.rolesModelVersion ?? null,
    safeAddress: audit.safeAddress,
    freshness: audit.freshness,
    coverage: audit.coverage,
    findings: audit.findings,
    reach: audit.reach,
    errors: audit.errors,
    honesty: [
      "Never SAFE.",
      "BOUNDED requires modeled policy — unmodeled dangerous paths → UNKNOWN or UNBOUNDED.",
      "Token quantities only in v1 bounds; USD is not part of the checked intent spec.",
      "Cannot detect compromised keys.",
      "Static reconstruction ≠ fork simulation of every path.",
    ],
  };
}

export function goldenReportJson(audit: AuthorityAuditReport): string {
  return `${JSON.stringify(toGoldenReport(audit), null, 2)}\n`;
}
