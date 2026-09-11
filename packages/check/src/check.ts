import { checkEns } from "./ens.js";
import { checkFull, checkShield } from "./gateway.js";
import type { CheckOptions, CheckResult } from "./types.js";

/**
 * Counterparty check.
 *
 * - `ens` (default): Sepolia PermissionedResolver · $0 · no our server
 * - `shield`: POST /api/shield/check · $0 · gateway
 * - `full`: POST /api/investigate · ~$0.01 on miss · gateway
 */
export async function check(
  address: string,
  opts: CheckOptions = {},
): Promise<CheckResult> {
  const mode = opts.mode ?? "ens";
  if (mode === "shield") return checkShield(address, opts);
  if (mode === "full") return checkFull(address, opts);
  return checkEns(address, opts);
}
