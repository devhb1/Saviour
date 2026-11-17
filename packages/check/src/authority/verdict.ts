import type { Hex } from "../assessTypes.js";

export type ReachVerdictKind = "BOUNDED" | "UNBOUNDED" | "UNKNOWN";

export type TokenBound = {
  token: Hex | "ETH" | "NATIVE";
  symbol?: string;
  amount: string;
  decimals?: number;
  period?: "once" | "per_day" | "per_period" | "unknown";
};

export type PrincipalReach = {
  principalId: string;
  principal: Hex | "owners" | "module";
  kind: "role_member" | "module" | "owner_set";
  verdict: ReachVerdictKind;
  bounds: TokenBound[];
  reasons: string[];
  patterns: string[];
};

export type ReachReport = {
  engineVersion: string;
  rolesModelVersion: string;
  principals: PrincipalReach[];
};

export const REACH_ENGINE_VERSION = "0.2.0-reach";
/** Bump to 0.2.0-v2.1.1-trees only when differential suite is green end-to-end. */
export const ROLES_MODEL_VERSION = "0.2.0-v2.1.1-partial";

/**
 * Soundness: never emit BOUNDED when unmodeled dangerous path exists.
 * Prefer UNKNOWN over false BOUNDED.
 */
export function mergeVerdict(
  current: ReachVerdictKind,
  next: ReachVerdictKind,
): ReachVerdictKind {
  if (current === "UNBOUNDED" || next === "UNBOUNDED") return "UNBOUNDED";
  if (current === "UNKNOWN" || next === "UNKNOWN") return "UNKNOWN";
  return "BOUNDED";
}
