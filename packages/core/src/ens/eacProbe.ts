/**
 * Probe: investigator setText(saviours.dispute) should EAC-revert.
 */

import { namehash, type Hex } from "viem";
import { ensNameForAddress } from "./label";
import { isEnsIdentityReady } from "./identity";
import { trySetTextAs } from "./roles";

export async function probeInvestigatorDispute(address: string): Promise<{
  expectedRevert: true;
  reverted: boolean;
  ok: boolean;
  ensName: string;
  message: string;
  error?: string;
  warning?: string;
  txHash?: Hex;
}> {
  if (!isEnsIdentityReady()) {
    throw new Error("ENS identity not ready");
  }
  const ensName = ensNameForAddress(address);
  const node = namehash(ensName);
  const result = await trySetTextAs(
    "investigator",
    node,
    "saviours.dispute",
    `eac-probe @ ${Math.floor(Date.now() / 1000)}`,
  );

  if (result.ok) {
    return {
      expectedRevert: true,
      reverted: false,
      ok: true,
      ensName,
      message: "Investigator wrote dispute — EAC misconfigured",
      warning: "Investigator was allowed to write dispute — EAC misconfigured",
      txHash: result.txHash,
    };
  }

  return {
    expectedRevert: true,
    reverted: true,
    ok: false,
    ensName,
    message: "EAC blocked investigator from saviours.dispute",
    error: result.error.slice(0, 400),
  };
}
