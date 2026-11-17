export type DecoderSeverity = "INFO" | "WATCH" | "HIGH" | "CRITICAL" | "UNSUPPORTED";

export type RegistryWriteHint = "WATCH" | "TAINTED_REQUIRES_ATTESTER" | "NONE";

export interface DecodedAction {
  to?: string;
  /** Inner call value when known (MultiSend child) */
  value?: string;
  /** Exact inner calldata when known */
  data?: string;
  selector?: string;
  selectorHint?: string;
  args?: unknown[];
  operation?: 0 | 1; // 0=CALL 1=DELEGATECALL
  severity: DecoderSeverity;
  registryWrite: RegistryWriteHint;
  path: string[];
  note?: string;
}

export interface DecodeResult {
  supported: boolean;
  actions: DecodedAction[];
  maxSeverity: DecoderSeverity;
  /** CRITICAL never auto-maps to TAINTED */
  vaultWrite: "WATCH" | "NONE";
  /** False when MultiSend (or nested) bytes were not fully consumed */
  complete?: boolean;
}
