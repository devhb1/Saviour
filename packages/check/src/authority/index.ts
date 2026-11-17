export { auditSafe } from "./auditSafe.js";
export type { AuditSafeOptions } from "./auditSafe.js";
export { evaluateAuthorityFindings } from "./findings.js";
export { buildCapabilityGraph } from "./executionPaths.js";
export { evaluateTopologyPatterns, patternsToFindings } from "./patterns.js";
export { readRolesModifierState } from "./rolesState.js";
export {
  reconstructRolesPolicy,
  ROLES_V211_MASTERCOPY,
  diffRoleKeys,
} from "./rolesTree.js";
export {
  sdkPermissionsFromPolicy,
  comparePolicyToSdkFlat,
} from "./rolesSdkDiff.js";
export {
  REACH_ENGINE_VERSION,
  ROLES_MODEL_VERSION,
  mergeVerdict,
} from "./verdict.js";
export type {
  AuthorityAuditReport,
  AuthorityFinding,
  CapabilityGraph,
  CoverageGap,
  CoverageComponent,
  CoverageReport,
  Freshness,
} from "./types.js";
export type {
  ReachReport,
  PrincipalReach,
  ReachVerdictKind,
  TokenBound,
} from "./verdict.js";
