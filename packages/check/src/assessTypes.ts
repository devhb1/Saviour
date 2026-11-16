/**
 * V3 transaction assessment contracts.
 * resolveBase = memory lookup · assessTransaction = decision support.
 * Do not merge these responsibilities.
 */

export type Hex = `0x${string}`;

export type SafeTransactionInput = {
  kind: "SAFE_TRANSACTION";
  chainId: number;
  safeAddress: Hex;
  safeVersion?: string;
  safeTx: {
    to: Hex;
    value: bigint;
    data: Hex;
    operation: 0 | 1;
    safeTxGas: bigint;
    baseGas: bigint;
    gasPrice: bigint;
    gasToken: Hex;
    refundReceiver: Hex;
    nonce: bigint;
  };
  expectedSafeTxHash?: Hex;
};

export type RawCallInput = {
  kind: "RAW_CALL";
  chainId: number;
  from?: Hex;
  to: Hex;
  value: bigint;
  data: Hex;
};

export type TransactionAssessmentInput = SafeTransactionInput | RawCallInput;

export type AssessmentDecision =
  | "NO_VERDICT"
  | "WARN"
  | "BLOCK_RECOMMENDATION";

export type AssessmentCoverage = "COMPLETE" | "PARTIAL" | "STALE" | "ERROR";

export type AssessmentIntegrity =
  | "MATCH"
  | "MISMATCH"
  | "UNCHECKED"
  | "N_A";

export type DecodedActionNode = {
  id: string;
  parentId: string | null;
  to: Hex;
  value: string;
  data: Hex;
  operation: 0 | 1;
  selectorHint?: string;
  severity?: "INFO" | "WATCH" | "HIGH" | "CRITICAL" | "UNSUPPORTED";
  note?: string;
};

export type UnsupportedAction = {
  id: string;
  reason: string;
  parentId: string | null;
};

export type SecurityFindingRef = {
  subject: Hex;
  status: "UNSET" | "WATCH" | "TAINTED";
  findingId?: Hex;
  evidenceHash?: Hex;
};

export type SourceFreshness = {
  source: string;
  lastBlock: number | null;
  stale: boolean;
};

export type EvidenceReference = {
  label: string;
  chainId: number;
  txHash?: Hex;
  blockNumber?: number;
  blockHash?: Hex;
  decoderVersion?: string;
};

export type AssessmentError = {
  code: string;
  message: string;
};

/**
 * Risk, coverage, freshness, and errors are orthogonal.
 * Unsupported must never overwrite TAINTED.
 * NO_VERDICT never means SAFE.
 */
export type TransactionAssessment = {
  decision: AssessmentDecision;
  coverage: AssessmentCoverage;
  integrity: AssessmentIntegrity;
  actions: DecodedActionNode[];
  findings: SecurityFindingRef[];
  unsupportedActions: UnsupportedAction[];
  freshness: SourceFreshness[];
  evidence: EvidenceReference[];
  errors: AssessmentError[];
  assessedAt: {
    chainId: number;
    blockNumber: bigint;
    blockHash: Hex;
  };
};
