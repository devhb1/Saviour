import type { DecodedAction } from "../types.js";
import { classifySelector, registryWriteForSeverity } from "../severity.js";

export interface AragonAction {
  to: string;
  value?: string;
  data: string;
  selectorHint?: string;
}

/** Decode Aragon OSx ProposalCreated Action[] (synthetic or ABI-decoded). */
export function decodeAragonActions(
  actions: AragonAction[],
  path: string[] = ["AragonOSx.ProposalCreated"],
): DecodedAction[] {
  return actions.map((a) => {
    const hint = a.selectorHint ?? `0x${a.data.replace(/^0x/, "").slice(0, 8)}`;
    const { severity, note } = classifySelector(hint);
    return {
      to: a.to,
      selectorHint: hint,
      severity,
      registryWrite: registryWriteForSeverity(severity),
      path: [...path, hint],
      note,
    };
  });
}
