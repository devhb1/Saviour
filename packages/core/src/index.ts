/**
 * SAVIOURS domain library (`@saviours/core`)
 *
 * ## Live-data rule
 * Product paths (evidence API, investigate API) MUST use live The Graph data.
 * Never serve mocked/static chain activity outside explicit unit tests of the
 * deterministic classifier (`evals/run-rules.ts`).
 *
 * ## Layout
 * - `graph/`     — The Graph gateway client + Adapter A/B
 * - `evidence/`  — normalize, cache, combine adapters
 * - `investigator/` — OpenAI classification over live evidence
 * - `classifier/` — deterministic validateAssessment (final authority)
 * - `registry/`  — Sepolia SavioursRegistry client (reads deployments/*.json)
 * - `llm/`       — provider client (OpenAI)
 * - `types.ts`   — shared ThreatAssessment / Evidence contracts
 *
 * ## Trust boundary
 * AI proposes status/threatTypes. `validateAssessment` decides what we accept.
 * AI never writes registry / never sends transactions.
 */
export type {
  AssessmentStatus,
  Entity,
  EntityType,
  Evidence,
  Fingerprint,
  HexAddress,
  ThreatAssessment,
  ThreatType,
} from "./types";

export { normalizeEvidence } from "./evidence/normalize";
export type { NormalizeEvidenceInput } from "./evidence/normalize";
export { withCache, cacheKey, clearEvidenceCache } from "./evidence/cache";
export { getEvidenceForAddress } from "./evidence/getEvidence";
export {
  collectAdapterAEvidence,
  getTransferFlows,
  getConcentrationSignals,
  getAffectedAddresses,
  UNISWAP_V3_ETH_SUBGRAPH_ID,
} from "./graph/adapterA";
export {
  collectAdapterBEvidence,
  getProtocolContext,
  getProtocolInteractions,
  MESSARI_UNISWAP_V3_ETH_SUBGRAPH_ID,
} from "./graph/adapterB";
export { investigate, investigateAndRemember } from "./investigator/investigate";
export type { InvestigateOptions, InvestigateResult } from "./investigator/investigate";
export { validateAssessment, RULES_VERSION } from "./classifier/validate";
export { chat, aiModel } from "./llm/client";
export {
  loadDeployment,
  registryAddress,
  getIncident,
  getIncidentIdByTargetFingerprint,
  getLatestIncidentByTarget,
  registerIncidentFromAssessment,
} from "./registry/client";
export type {
  DeploymentRecord,
  OnChainIncident,
  RegisterFromAssessmentInput,
  RegistryNetwork,
} from "./registry/client";
export {
  rememberValidatedAssessment,
  isRegistryDeployed,
} from "./registry/remember";
export type { RememberResult, RememberOptions } from "./registry/remember";
export {
  incidentIdBytes,
  fingerprintBytes,
  evidenceHashFrom,
  confidenceBucket,
} from "./registry/ids";
