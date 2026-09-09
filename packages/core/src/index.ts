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
export { askAboutCase } from "./investigator/askCase";
export type {
  AskPacket,
  AskToolTrace,
  AskCaseResult,
} from "./investigator/askCase";
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
export { loadRootEnv, requireEnv, hasIpfsPinningToken, requireIpfsPinningToken } from "./config/env";
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
  registerIncidentName,
  writeIncidentStoryTexts,
  ensLabelFromIncidentId,
  expiryUnixForStatus,
  INCIDENT_ROLE_BITMAP,
} from "./ens/client";
export type {
  RegisterIncidentSubnameInput,
  RegisterIncidentSubnameResult,
  RegisterIncidentNameInput,
  RegisterIncidentNameResult,
} from "./ens/client";
export { buildStoryTextRecords, plainVerdictText } from "./ens/story";
export {
  labelForAddress,
  ensNameForAddress,
  isAddressLabel,
  asHexAddress,
} from "./ens/label";
export {
  setupEacRoles,
  registerInvestigatorNamespace,
  trySetTextAs,
  investigatorAccount,
  disputerAccount,
  INVESTIGATOR_TEXT_KEYS,
  DISPUTER_TEXT_KEYS,
  ANY_NAME_DNS,
} from "./ens/roles";
export { probeInvestigatorDispute } from "./ens/eacProbe";
export {
  resolveIncident,
  resolveIncidentName,
  resolveStatus,
  isIncidentNameRegistered,
  SAVIOURS_TEXT_KEYS,
} from "./ens/resolve";
export type {
  ResolveIncidentResult,
  IncidentRecords,
  SavioursTextKey,
} from "./ens/resolve";
export {
  disputeIncident,
  revokeIncidentName,
  governSnapshot,
} from "./ens/dispute";
export type {
  DisputeInput,
  DisputeResult,
  RevokeInput,
  RevokeResult,
} from "./ens/dispute";
export {
  listTaintedPeers,
  loadDemoAttackSeeds,
} from "./memory/taintedPeers";
export type { TaintedPeer } from "./memory/taintedPeers";
export { enrichCooccurrenceEvidence } from "./evidence/cooccurrence";
export {
  loadSeedIncidents,
  loadSeedManifest,
  seedHistoricalIncidents,
  listGovernIncidents,
  seedIncidentsPath,
  seedManifestPath,
  proofLabelFor,
} from "./incidents/seed";
export type {
  SeedIncidentSpec,
  SeedFile,
  SeededIncidentRow,
  SeedManifest,
  GovernIncidentView,
  SeedProofKind,
} from "./incidents/seed";
export {
  listAllIncidents,
  recordLiveIncident,
  loadLiveIncidentIndex,
  liveIncidentsPath,
} from "./incidents/index";
export type {
  LiveIncidentRecord,
  LiveIncidentIndex,
  IncidentListItem,
} from "./incidents/index";
export {
  buildDossier,
  pinDossier,
  pinAssessmentDossier,
  fetchDossier,
  canonicalize,
  contentHashOf,
  dossiersDir,
} from "./dossier/pin";
export type { DossierPayload, PinDossierResult } from "./dossier/pin";
export {
  incidentIdBytes,
  fingerprintBytes,
  evidenceHashFrom,
  confidenceBucket,
  keccakUtf8,
} from "./registry/ids";
export {
  confidenceToUnit,
  confidenceToPct,
  formatConfidencePct,
} from "./confidence";
export { checkTarget, checkTargetTier1 } from "./shield/check";
export type {
  ShieldCheckInput,
  ShieldCheckResult,
  ShieldDecision,
} from "./shield/check";
