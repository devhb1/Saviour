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
export { investigate } from "./investigator/investigate";
export { validateAssessment, RULES_VERSION } from "./classifier/validate";
export { chat, aiModel } from "./llm/client";
