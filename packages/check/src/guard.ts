import { check } from "./check.js";
import type { CheckOptions, CheckResult } from "./types.js";

export class SavioursBlockedError extends Error {
  readonly result: CheckResult;
  constructor(result: CheckResult) {
    super(
      `SAVIOURS BLOCK: ${result.ensName} status=${result.status}` +
        (result.threat ? ` threat=${result.threat}` : ""),
    );
    this.name = "SavioursBlockedError";
    this.result = result;
  }
}

/**
 * Drop-in for signer middleware: throws on BLOCK, returns result on WARN/ALLOW/ESCALATE.
 * WARN is returned (not thrown) so callers can reduce size — never silent.
 */
export async function guard(
  address: string,
  opts: CheckOptions = {},
): Promise<CheckResult> {
  const result = await check(address, opts);
  if (result.decision === "BLOCK") {
    throw new SavioursBlockedError(result);
  }
  return result;
}
