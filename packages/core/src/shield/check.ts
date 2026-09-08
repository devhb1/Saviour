/**
 * Shield entry — Tier-1 ENS-first (then registry). Never Graph, never AI.
 */

import {
  checkTargetTier1,
  type ShieldCheckInput,
  type ShieldCheckResult,
} from "./tier1";

export type { ShieldCheckInput, ShieldCheckResult, ShieldDecision } from "./tier1";
export { checkTargetTier1 } from "./tier1";

/** Public Shield check. ENS-first on Sepolia; `usedAi` always false. */
export async function checkTarget(
  input: ShieldCheckInput,
): Promise<ShieldCheckResult> {
  return checkTargetTier1(input);
}
