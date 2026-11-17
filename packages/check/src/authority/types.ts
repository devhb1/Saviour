import type { Hex } from "../assessTypes.js";
import type { ReachReport } from "./verdict.js";

export type AuthorityFindingSeverity = "INFO" | "WARN" | "CRITICAL";

export type AuthorityFinding = {
  id: string;
  rule: string;
  severity: AuthorityFindingSeverity;
  title: string;
  detail: string;
  evidence: string[];
};

export type CoverageGap = {
  area: string;
  reason: string;
};

/** Component Coverage — never imply whole-Safe assessed from Roles alone. */
export type CoverageComponentId =
  | "safeOwners"
  | "modules"
  | "rolesV211"
  | "rolesOther"
  | "delay"
  | "delegatecall"
  | "guards"
  | "allowances";

export type CoverageComponentStatus =
  | "assessed"
  | "partial"
  | "unassessed"
  | "unsupported";

export type CoverageComponent = {
  id: CoverageComponentId;
  status: CoverageComponentStatus;
  detail?: string;
};

export type CoverageReport = {
  /** @deprecated Prefer components — true only if every in-scope component is assessed */
  complete: boolean;
  components: CoverageComponent[];
  gaps: CoverageGap[];
  reconstructed: string[];
};

export type Freshness = {
  chainId: number;
  blockNumber: string;
  blockHash: Hex;
  rpcUrlHost?: string;
};

export type GraphNode = {
  id: string;
  kind: "safe" | "delay" | "roles" | "module" | "owner" | "unknown";
  address: Hex;
  label?: string;
};

export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  kind:
    | "owns"
    | "enables_module"
    | "delay_path"
    | "direct_module_path"
    | "avatar"
    | "target"
    | "roles_membership";
  label?: string;
};

export type SafeInventory = {
  address: Hex;
  version: string | null;
  owners: Hex[];
  threshold: number | null;
  modules: Hex[];
  guard: Hex | null;
  fallbackHandler: Hex | null;
};

export type DelayInventory = {
  address: Hex;
  txCooldown: string | null;
  txExpiration: string | null;
  avatar: Hex | null;
  target: Hex | null;
  modules: Hex[];
  looksLikeDelay: boolean;
};

export type ModuleProbe = {
  address: Hex;
  avatar: Hex | null;
  target: Hex | null;
  looksLikeDelay: boolean;
  looksLikeRolesProxy: boolean;
  implementation?: Hex | null;
};

export type CapabilityGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  safe: SafeInventory;
  delays: DelayInventory[];
  modules: ModuleProbe[];
};

export type AuthorityAuditReport = {
  product: "saviour-control-path-auditor";
  version: string;
  safeAddress: Hex;
  findings: AuthorityFinding[];
  coverage: CoverageReport;
  freshness: Freshness | null;
  graph: CapabilityGraph | null;
  /** Blast Radius Reach — may be UNKNOWN-heavy until Roles trees land */
  reach: ReachReport | null;
  /** Loud fixture-only assumptions (never from public API) */
  assumptions?: string[];
  errors: string[];
};
