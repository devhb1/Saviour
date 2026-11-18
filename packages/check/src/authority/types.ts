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

/** How strongly the pinned block was held for the duration of the audit. */
export type SnapshotConsistency =
  | "hash-verified-at-end"
  | "number-pinned"
  | "inconsistent";

export type Freshness = {
  chainId: number;
  blockNumber: string;
  blockHash: Hex;
  rpcUrlHost?: string;
  /** Present when the auditor re-checked the block hash after reads. */
  consistency?: SnapshotConsistency;
};

/**
 * Top-level audit outcome. Integrators must read this — not only HTTP 200 or `ok`.
 * COMPLETE / PARTIAL keep usable evidence. INCONCLUSIVE / INVALID_INPUT are failures.
 */
export type AuditCompletionStatus =
  | "COMPLETE"
  | "PARTIAL"
  | "INCONCLUSIVE"
  | "INVALID_INPUT";

/** Delay module identity confidence. txCooldown() alone is never "verified". */
export type DelayIdentity =
  | "verified"
  | "suspected"
  | "unsupported";

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

/** How a Safe inventory field was obtained. Never treat a failed read as empty-and-fine. */
export type InventoryReadStatus =
  | "ok"
  | "failed"
  | "truncated"
  | "fallback_page";

export type SafeInventory = {
  address: Hex;
  version: string | null;
  owners: Hex[];
  threshold: number | null;
  modules: Hex[];
  modulesTruncated?: boolean;
  /** getOwners succeeded */
  ownersRead?: InventoryReadStatus;
  /** getThreshold succeeded */
  thresholdRead?: InventoryReadStatus;
  /**
   * Module list status.
   * ok = full pagination finished without truncation.
   * truncated = hit the 1,000-entry cap.
   * fallback_page = only the first page after pagination failed — not complete.
   * failed = no module list.
   */
  modulesRead?: InventoryReadStatus;
  /** getGuard succeeded (null guard with ok = none installed). */
  guardRead?: InventoryReadStatus;
  /** Fallback-handler storage read succeeded. */
  fallbackHandlerRead?: InventoryReadStatus;
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
  modulesTruncated?: boolean;
  modulesRead?: InventoryReadStatus;
  looksLikeDelay: boolean;
  /** verified = known mastercopy + avatar/target. suspected = txCooldown only. */
  delayIdentity?: DelayIdentity;
};

export type ModuleProbe = {
  address: Hex;
  avatar: Hex | null;
  target: Hex | null;
  /**
   * True only for verified Delay identity (known mastercopy + wiring).
   * Suspected Delay-like contracts stay false so they remain direct modules.
   */
  looksLikeDelay: boolean;
  looksLikeRolesProxy: boolean;
  implementation?: Hex | null;
  delayIdentity?: DelayIdentity;
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
  /** Explicit completion — never infer success from empty errors alone. */
  status: AuditCompletionStatus;
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
