import type { DecodeResult, DecodedAction } from "./types.js";
import { maxSeverity, registryWriteForSeverity } from "./severity.js";
import { decodePackedTransactions, type PackedTx } from "./unwrap/multisend.js";
import { decodeAragonActions, type AragonAction } from "./adapters/aragonOsx.js";
import { unwrapRolesCall } from "./adapters/zodiacRoles.js";

export * from "./types.js";
export * from "./severity.js";
export * from "./unwrap/multisend.js";
export * from "./adapters/aragonOsx.js";
export * from "./adapters/zodiacRoles.js";

export interface TermLikeInput {
  aragonActions?: AragonAction[];
  rolesInner?: AragonAction[];
  delayPacked?: PackedTx[];
}

/** Term-shaped nested path: Aragon → Roles → Delay/payload actions. */
export function decodeTermLike(input: TermLikeInput): DecodeResult {
  const actions: DecodedAction[] = [];
  if (input.aragonActions?.length) {
    actions.push(...decodeAragonActions(input.aragonActions));
  }
  if (input.rolesInner?.length) {
    for (const inner of input.rolesInner) {
      actions.push(...unwrapRolesCall(inner));
    }
  }
  if (input.delayPacked?.length) {
    actions.push(...decodePackedTransactions(input.delayPacked, ["ZodiacDelay"]));
  }

  if (actions.length === 0) {
    return {
      supported: false,
      actions: [
        {
          severity: "UNSUPPORTED",
          registryWrite: "NONE",
          path: ["unknown"],
          note: "No supported adapter matched",
        },
      ],
      maxSeverity: "UNSUPPORTED",
      vaultWrite: "NONE",
    };
  }

  const sev = maxSeverity(actions);
  return {
    supported: sev !== "UNSUPPORTED",
    actions,
    maxSeverity: sev,
    vaultWrite: registryWriteForSeverity(sev) === "WATCH" ? "WATCH" : "NONE",
  };
}
