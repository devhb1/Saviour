import type { Hex } from "../assessTypes.js";
import type { RolesPolicy } from "./rolesTree.js";

const APPROVE_SELECTOR = "0x095ea7b3"; // approve(address,uint256)
const TRANSFER_SELECTOR = "0xa9059cbb";
const TRANSFER_FROM = "0x23b872dd";

export type DerivedPatternFlags = {
  rolesCanCallSafe: boolean;
  rolesDelegatecall: boolean;
  freeRecipientTransfer: boolean;
  unrestrictedApprove: boolean;
  anyUnbounded: boolean;
  anyPartial: boolean;
  summary: string;
};

/**
 * Derive topology pattern flags from reconstructed Roles policies.
 * Never invent flags without evidence in the policy tree.
 */
export function derivePatternFlagsFromPolicy(
  policies: RolesPolicy[],
  safeAddress: Hex,
): DerivedPatternFlags {
  const safe = safeAddress.toLowerCase();
  let rolesCanCallSafe = false;
  let rolesDelegatecall = false;
  let freeRecipientTransfer = false;
  let unrestrictedApprove = false;
  const notes: string[] = [];

  for (const pol of policies) {
    if (pol.status !== "reconstructed" && pol.status !== "partial") continue;
    for (const role of pol.roles) {
      for (const t of role.targets) {
        const target = t.address.toLowerCase();
        const clearance = t.clearance.toLowerCase();

        if (target === safe) {
          rolesCanCallSafe = true;
          notes.push(`target ${t.address} is the Safe itself`);
        }

        const targetOpt = (t.executionOptions ?? "").toLowerCase();
        if (targetOpt.includes("delegate")) {
          rolesDelegatecall = true;
          notes.push(
            `delegatecall AllowTarget on ${t.address.slice(0, 10)}… options=${t.executionOptions}`,
          );
        }

        // Target-wide allow without function scoping → high risk
        if (
          clearance.includes("target") ||
          clearance === "allowed" ||
          (t.functions.length === 0 && clearance !== "none")
        ) {
          if (clearance !== "none" && clearance !== "noperiod") {
            // ScopeTarget / AllowTarget without tight functions
            if (t.functions.length === 0 || t.functions.some((f) => f.wildcarded)) {
              freeRecipientTransfer = true;
              notes.push(
                `role ${role.key.slice(0, 10)}… target ${t.address.slice(0, 10)}… wildcard/allow clearance=${t.clearance}`,
              );
            }
          }
        }

        for (const fn of t.functions) {
          const opt = fn.executionOptions.toLowerCase();
          if (opt.includes("delegate")) {
            rolesDelegatecall = true;
            notes.push(`delegatecall options on ${fn.selector}`);
          }
          if (fn.wildcarded) {
            freeRecipientTransfer = true;
            notes.push(`wildcarded function ${fn.selector} on ${t.address}`);
          }
          const sel = fn.selector.toLowerCase();
          if (
            sel === TRANSFER_SELECTOR ||
            sel === TRANSFER_FROM ||
            sel.startsWith("0xa9059cbb")
          ) {
            if (!fn.conditionId) {
              freeRecipientTransfer = true;
              notes.push(`transfer-like ${sel} without condition id`);
            }
          }
          if (sel === APPROVE_SELECTOR && !fn.conditionId) {
            unrestrictedApprove = true;
            notes.push(`approve ${sel} without condition id`);
          }
        }
      }
    }
  }

  const anyUnbounded =
    rolesDelegatecall || rolesCanCallSafe || freeRecipientTransfer;
  const anyPartial = policies.some(
    (p) => p.status === "partial" || p.gaps.length > 0,
  );

  return {
    rolesCanCallSafe,
    rolesDelegatecall,
    freeRecipientTransfer: freeRecipientTransfer || unrestrictedApprove,
    unrestrictedApprove,
    anyUnbounded,
    anyPartial,
    summary: notes.slice(0, 4).join("; "),
  };
}
