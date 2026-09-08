/**
 * Shared product types for SAVIOURS.
 * Evidence always originates from live Graph adapters in the product path.
 * ThreatAssessment is produced by investigate() then validateAssessment().
 */

export type HexAddress = `0x${string}`;

export type AssessmentStatus = "SAFE" | "WATCH" | "TAINTED" | "UNKNOWN";

export type EntityType = "EOA" | "CONTRACT" | "PROXY";

export type ThreatType =
  | "DRAINER"
  | "DANGEROUS_APPROVAL"
  | "MALICIOUS_RECIPIENT"
  | "EXPLOIT_CONTRACT"
  | "MALICIOUS_UPGRADE"
  | "SUSPICIOUS_BEHAVIOR";

export type Entity = {
  chainId: number;
  address: HexAddress;
  entityType: EntityType;
};

export type Fingerprint = {
  runtimeCodeHash?: string;
  implementationAddress?: string;
  implementationCodeHash?: string;
  behaviorHash?: string;
};

/** Kind of Graph / chain row — used by signals and Coverage honesty. */
export type EvidenceKind =
  | "swap"
  | "deposit"
  | "withdraw"
  | "borrow"
  | "repay"
  | "flashloan"
  | "liquidate"
  | "account"
  | "protocol";

export type Evidence = {
  id: string;
  source: string;
  reference: string;
  claim: string;
  blockRange?: {
    from: number;
    to: number;
  };
  timestamp: number;
  rawHash: string;
  /** Messari / Graph Network deployment id when known */
  subgraphId?: string;
  /** Human protocol slug e.g. aave-v3 */
  protocol?: string;
  /** Messari schema id e.g. lending-cdp 3.1.0 */
  schema?: string;
  kind?: EvidenceKind;
  txHash?: string;
  block?: number;
  amountUSD?: number;
  counterparty?: HexAddress;
};

export type ThreatAssessment = {
  status: AssessmentStatus;
  confidence: number;
  entity: Entity;
  fingerprint?: Fingerprint;
  threatTypes: ThreatType[];
  evidence: Evidence[];
  counterEvidence: Evidence[];
  incidentId?: string;
  modelVersion: string;
  rulesVersion: string;
  createdAt: number;
  expiresAt?: number;
};
