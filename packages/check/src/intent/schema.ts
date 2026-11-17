/**
 * Intent v1 — token quantities only (no USD).
 * Actual ⊆ declared; fail with exact break id.
 */

export type IntentMayCall = {
  target: string;
  functions: string[];
  recipient?: "must_equal_safe" | "any";
  max_amount?: {
    token: string;
    per_day?: string;
    once?: string;
  };
};

export type IntentFile = {
  safe: string;
  chain: number;
  role: string;
  may_call: IntentMayCall[];
  must_not: Array<
    | "delegatecall"
    | "call_to_self"
    | "approve_to_unlisted_spender"
    | string
  >;
  revocation?: {
    max_latency_hours: number;
  };
};

export type IntentBreak = {
  id: string;
  rule: string;
  detail: string;
};

export type IntentCheckResult = {
  ok: boolean;
  breaks: IntentBreak[];
  coverageNotes: string[];
};
