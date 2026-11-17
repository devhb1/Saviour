export { check } from "./check.js";
export { guard, SavioursBlockedError } from "./guard.js";
export { castCommand } from "./castCommand.js";
export { checkEns } from "./ens.js";
export {
  checkShield,
  checkFull,
  BAZANTIC_GATEWAY,
  BAZANTIC_MCP,
  SAVIOURS_APP_URL,
} from "./gateway.js";
export { resolveBase, toDecision } from "./baseResolve.js";
export { assessTransaction, assessAndExplain } from "./assessTransaction.js";
export type { AssessOptions, AssessWithExplanation } from "./assessTransaction.js";
export { readCurrentControls } from "./readControls.js";
export type { CurrentControls } from "./readControls.js";
export { discoverDelayAddress } from "./discoverDelay.js";
export type { DelayDiscovery } from "./discoverDelay.js";
export { auditSafe } from "./authority/index.js";
export type {
  AuthorityAuditReport,
  AuthorityFinding,
  CapabilityGraph,
  CoverageReport,
  CoverageComponent,
} from "./authority/index.js";
export {
  REACH_ENGINE_VERSION,
  ROLES_MODEL_VERSION,
} from "./authority/verdict.js";
export type {
  ReachReport,
  PrincipalReach,
  ReachVerdictKind,
  TokenBound,
} from "./authority/verdict.js";
export {
  toGoldenReport,
  goldenReportJson,
  verifyGoldenDigest,
  digestGoldenPayload,
  canonicalGoldenPayload,
} from "./report/golden.js";
export type { GoldenReport } from "./report/golden.js";
export {
  explainAudit,
  answerFromReport,
  acceptModelParaphrase,
} from "./report/explain.js";
export type { PlainExplanation } from "./report/explain.js";
export { pilotReceiptMarkdown } from "./report/pilotReceipt.js";
export type { PilotReceiptInput } from "./report/pilotReceipt.js";
export {
  reconstructRolesPolicy,
  ROLES_V211_MASTERCOPY,
  diffRoleKeys,
} from "./authority/rolesTree.js";
export { checkIntent, parseIntentJson } from "./intent/checkIntent.js";
export type {
  IntentFile,
  IntentCheckResult,
  IntentBreak,
} from "./intent/schema.js";
export { explainPrivilege, decodeExecutionTree } from "@saviours/queuewatch";
export type { PrivilegeExplanation } from "@saviours/queuewatch";
export {
  /** Safe 1.3+ domain: chainId + verifyingContract */
  computeSafeTxHash,
  /** @deprecated Not Safe contract domain — do not use for integrity MATCH */
  computeSafeTxHashWithDomainName,
  extractSelectorHints,
  selectorLabel,
} from "./safeTxHash.js";
export {
  simulateAuthorizationList,
  parseEofDelegationCode,
} from "./eip7702.js";
export type {
  CheckCost,
  CheckMode,
  CheckOptions,
  CheckResult,
  Decision,
} from "./types.js";
export type { BaseResolveOptions, BaseResolveResult, ResolveAction } from "./baseResolve.js";
export type { Authorization, DelegationResult } from "./eip7702.js";
export type {
  TransactionAssessmentInput,
  SafeTransactionInput,
  RawCallInput,
  TransactionAssessment,
  AssessmentDecision,
  AssessmentCoverage,
  AssessmentIntegrity,
} from "./assessTypes.js";
