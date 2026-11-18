/**
 * Public package for the Safe permission auditor.
 * The published `@saviours/check` package is a different product.
 */
export { auditSafe } from "../../check/src/authority/auditSafe.js";
export type { AuditSafeOptions } from "../../check/src/authority/auditSafe.js";
export type {
  AuthorityAuditReport,
  AuthorityFinding,
  CapabilityGraph,
  CoverageComponent,
  CoverageReport,
} from "../../check/src/authority/types.js";
export {
  REACH_ENGINE_VERSION,
  ROLES_MODEL_VERSION,
} from "../../check/src/authority/verdict.js";
export type {
  ReachReport,
  PrincipalReach,
  ReachVerdictKind,
} from "../../check/src/authority/verdict.js";
export {
  toGoldenReport,
  goldenReportJson,
  verifyGoldenDigest,
  digestGoldenPayload,
  canonicalGoldenPayload,
} from "../../check/src/report/golden.js";
export type { GoldenReport } from "../../check/src/report/golden.js";
export {
  explainAudit,
  answerFromReport,
  acceptModelParaphrase,
} from "../../check/src/report/explain.js";
export type { PlainExplanation } from "../../check/src/report/explain.js";
export { pilotReceiptMarkdown } from "../../check/src/report/pilotReceipt.js";
export type { PilotReceiptInput } from "../../check/src/report/pilotReceipt.js";
export type { Hex } from "../../check/src/assessTypes.js";
