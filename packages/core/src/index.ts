/**
 * SAVIOURS domain library (`@saviours/core`)
 *
 * ## Live-data rule
 * Product paths (evidence API, investigate API) MUST use live The Graph data.
 * Never serve mocked/static chain activity outside explicit unit tests of the
 * deterministic classifier (`evals/run-rules.ts`).
 *
 * ## Chain boundary
 * Hacks / faulty contracts / Graph evidence: **mainnet** (target chainId = 1).
 * Durable security memory + ENS: **Sepolia**.
 * Incident records store the target’s chainId so Shield can BLOCK mainnet
 * addresses using Sepolia memory.
 *
 * ## Layout
 * - `graph/`     — The Graph gateway client + Adapter A/B
 * - `evidence/`  — normalize, cache, combine adapters
 * - `investigator/` — OpenAI classification over live evidence
 * - `classifier/` — deterministic validateAssessment (final authority)
 * - `registry/`  — Sepolia SavioursRegistry client (reads deployments/*.json)
 * - `ens/`       — ENSv2 Sepolia identity + incident subname registration
 * - `shield/`    — Tier-1 registry-first Protect (no AI)
 * - `llm/`       — provider client (OpenAI)
 * - `types.ts`   — shared ThreatAssessment / Evidence contracts
 *
 * ## Trust boundary
 * AI proposes status/threatTypes. `validateAssessment` decides what we accept.
 * AI never writes registry / never sends transactions.
 *
 * ## Remember write order (Sepolia)
 * ENS subname → capture ensNode → SavioursRegistry.register
 */
export type {
  AssessmentStatus,
  Entity,
  EntityType,
  Evidence,
  EvidenceKind,
  Fingerprint,
  HexAddress,
  ThreatAssessment,
  ThreatType,
} from "./types";

export { normalizeEvidence } from "./evidence/normalize";
export type { NormalizeEvidenceInput } from "./evidence/normalize";
export {
  deriveSignals,
  signalIds,
  hasThreatSignal,
  statusFromSignals,
  taintedSet,
  SIGNALS_VERSION,
} from "./evidence/signals";
export type {
  Signal,
  SignalId,
  SignalClass,
  DeriveSignalsOptions,
} from "./evidence/signals";
export { withCache, cacheKey, clearEvidenceCache } from "./evidence/cache";
export { getEvidenceForAddress, getEvidenceBundle } from "./evidence/getEvidence";
export type {
  EvidenceBundle,
  EvidenceBundleOptions,
} from "./evidence/getEvidence";
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
export {
  fanOut,
  formatFanOutBanner,
  STANDARD_PROTOCOLS,
  EXCLUDED_PROTOCOLS,
  protocolBySlug,
} from "./graph/standard";
export type {
  FanOutResult,
  FanOutOptions,
  ProtocolFanOutResult,
  StandardProtocol,
  StandardSchemaFamily,
} from "./graph/standard";
export { investigate, investigateAndRemember, investigateDetailed } from "./investigator/investigate";
export type {
  InvestigateOptions,
  InvestigateResult,
  InvestigateRun,
  InvestigateCost,
  TraceStep,
} from "./investigator/investigate";
export { validateAssessment, RULES_VERSION, applySignalGate } from "./classifier/validate";
export type { ValidateAssessmentOptions } from "./classifier/validate";
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
  isEnsIdentityReady,
  loadEnsIdentity,
  registerIncidentSubname,
  ensLabelFromIncidentId,
} from "./ens/client";
export type {
  RegisterIncidentSubnameInput,
  RegisterIncidentSubnameResult,
} from "./ens/client";
export {
  labelForAddress,
  ensNameForAddress,
  isAddressLabel,
  asHexAddress,
} from "./ens/label";
export {
  resolveIncident,
  resolveIncidentName,
  resolveStatus,
  SAVIOURS_TEXT_KEYS,
} from "./ens/resolve";
export type {
  ResolveIncidentResult,
  IncidentRecords,
  SavioursTextKey,
} from "./ens/resolve";
export {
  incidentIdBytes,
  fingerprintBytes,
  evidenceHashFrom,
  confidenceBucket,
} from "./registry/ids";
export { checkTarget, checkTargetTier1 } from "./shield/check";
export type {
  ShieldCheckInput,
  ShieldCheckResult,
  ShieldDecision,
} from "./shield/check";
