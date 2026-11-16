export type DecoderSeverity = "INFO" | "WATCH" | "HIGH" | "CRITICAL" | "UNSUPPORTED";

export type RegistryWriteHint = "WATCH" | "TAINTED_REQUIRES_ATTESTER" | "NONE";

export interface DecodedAction {
  to?: string;
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
}
