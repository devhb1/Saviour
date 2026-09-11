export type Decision = "BLOCK" | "WARN" | "ALLOW" | "ESCALATE";

export type CheckMode = "ens" | "shield" | "full";

export type CheckCost = {
  graph: number;
  ai: number;
  usd: number;
};

export type CheckResult = {
  decision: Decision;
  status: string;
  ensName: string;
  source: "ens" | "shield" | "investigate" | "none";
  threat?: string;
  evidenceHash?: string;
  atomicTx?: string;
  reason?: string;
  latencyMs: number;
  cost: CheckCost;
  mode: CheckMode;
};

export type CheckOptions = {
  /** ens (default) | shield | full */
  mode?: CheckMode;
  /** Sepolia RPC for mode=ens. Defaults to publicnode. */
  rpcUrl?: string;
  /** PermissionedResolver proxy. */
  resolver?: `0x${string}`;
  /** Parent name, default saviours.eth */
  parent?: string;
  /** Gateway / app origin for shield + full. */
  baseUrl?: string;
  chainId?: number;
  registryNetwork?: "sepolia" | "anvil";
  /** full mode only — force Graph path */
  forceFresh?: boolean;
  /** full mode only — attempt Remember (usually false on public) */
  persist?: boolean;
};
