/**
 * Shield entry — today Tier-1 only (registry-first).
 * Future tiers may escalate to investigate; they must never skip Tier-1.
 */

import {
  checkTargetTier1,
  type ShieldCheckInput,
  type ShieldCheckResult,
} from "./tier1";

export type { ShieldCheckInput, ShieldCheckResult, ShieldDecision } from "./tier1";
export { checkTargetTier1 } from "./tier1";

/** Public Shield check. Always registry-first; `usedAi` is always false for Tier-1. */
export async function checkTarget(
  input: ShieldCheckInput,
): Promise<ShieldCheckResult> {
  return checkTargetTier1(input);
}
