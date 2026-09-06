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
