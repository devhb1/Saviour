import type {
  AuditCompletionStatus,
  AuthorityAuditReport,
} from "../authority/types.js";
import { sha256Hex } from "./sha256.js";

/** Stable golden report envelope for CLI / shareable URLs / CI. */
export type GoldenReport = {
  /** Bumped when digest-relevant fields change (status envelope). */
  schemaVersion: "1.3.0";
  product: "saviour";
  feature: "permission-auditor" | "blast-radius-reach-preview" | "authority-audit";
  generatedAt: string;
  engineVersion: string;
  rolesModelVersion: string | null;
  safeAddress: string;
  /** Bound into the digest — COMPLETE/PARTIAL pins only for normal share. */
  status: AuditCompletionStatus;
  freshness: AuthorityAuditReport["freshness"];
  coverage: AuthorityAuditReport["coverage"];
  findings: AuthorityAuditReport["findings"];
  reach: AuthorityAuditReport["reach"];
  assumptions?: string[];
  errors: string[];
  honesty: string[];
  /** sha256 of canonical payload (excludes generatedAt for re-verify stability when passed) */
  reportDigest?: string;
};

const HONESTY = [
  "Never SAFE.",
  "BOUNDED requires modeled policy — unmodeled dangerous paths → UNKNOWN or UNBOUNDED.",
  "Token quantities only in v1 bounds; USD is not part of the checked intent spec.",
  "Cannot detect compromised keys.",
  "Static reconstruction ≠ fork simulation of every path.",
  "An audit must never imply the Safe is fully assessed because Roles alone was assessed.",
  "INCONCLUSIVE and INVALID_INPUT are not successful audit pins.",
] as const;

/** Canonical JSON for digest. Host, clock, log index, raw errors, and consistency are omitted. */
export function canonicalGoldenPayload(
  g: Omit<GoldenReport, "reportDigest"> | GoldenReport,
): string {
  return JSON.stringify(stableDigestValue(g));
}

const VOLATILE_RECONSTRUCTED = /^(chain\.logsSource:|chain\.logs:)/;

function stableDigestValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableDigestValue);
  if (!value || typeof value !== "object") return value;
  const src = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(src).sort()) {
    if (
      key === "generatedAt" ||
      key === "reportDigest" ||
      key === "errors" ||
      key === "rpcUrlHost" ||
      // Operational assurance — not part of the semantic audit payload.
      key === "consistency"
    ) {
      continue;
    }
    if (key === "reconstructed" && Array.isArray(src[key])) {
      out[key] = (src[key] as unknown[]).filter(
        (line) =>
          typeof line !== "string" || !VOLATILE_RECONSTRUCTED.test(line),
      );
      continue;
    }
    out[key] = stableDigestValue(src[key]);
  }
  return out;
}

export function digestGoldenPayload(canonicalJson: string): string {
  return sha256Hex(canonicalJson);
}

export function toGoldenReport(audit: AuthorityAuditReport): GoldenReport {
  const base: Omit<GoldenReport, "reportDigest"> = {
    schemaVersion: "1.3.0",
    product: "saviour",
    feature: "permission-auditor",
    generatedAt: new Date().toISOString(),
    engineVersion: audit.version,
    rolesModelVersion: audit.reach?.rolesModelVersion ?? null,
    safeAddress: audit.safeAddress,
    status: audit.status,
    freshness: audit.freshness,
    coverage: audit.coverage,
    findings: audit.findings,
    reach: audit.reach,
    assumptions: audit.assumptions,
    errors: audit.errors,
    honesty: [...HONESTY],
  };
  const reportDigest = digestGoldenPayload(canonicalGoldenPayload(base));
  return { ...base, reportDigest };
}

export function goldenReportJson(audit: AuthorityAuditReport): string {
  return `${JSON.stringify(toGoldenReport(audit), null, 2)}\n`;
}

/** Re-verify: same inputs should match digest when generatedAt is ignored. */
export function verifyGoldenDigest(report: GoldenReport): boolean {
  if (!report.reportDigest) return false;
  return (
    digestGoldenPayload(canonicalGoldenPayload(report)) === report.reportDigest
  );
}

/** Normal share pins are only for successful audits. */
export function isShareableAuditStatus(status: AuditCompletionStatus): boolean {
  return status === "COMPLETE" || status === "PARTIAL";
}
