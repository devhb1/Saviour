import type { Hex } from "../assessTypes.js";
import type { RolesPolicy, RolesRole, RolesTargetClearance } from "./rolesTree.js";

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

function clearanceKind(
  clearance: string,
): "none" | "target" | "function" | "other" {
  const c = clearance.toLowerCase();
  if (c === "none" || c === "noperiod") return "none";
  if (c.includes("target") || c === "allowed") return "target";
  if (c.includes("function")) return "function";
  return "other";
}

/** True when Target-wide clearance grants unconstrained parameter use. */
function targetWideUnrestricted(t: RolesTargetClearance): boolean {
  const kind = clearanceKind(t.clearance);
  if (kind !== "target") return false;
  // AllowTarget with no function list = whole target. Wildcarded fns also count.
  return t.functions.length === 0 || t.functions.some((f) => f.wildcarded);
}

/**
 * Safe-self call is escalation only when a real execution grant exists.
 * ScopeTarget with an empty function list is not a grant.
 */
function grantsSafeSelfCall(t: RolesTargetClearance): boolean {
  const kind = clearanceKind(t.clearance);
  if (kind === "none") return false;
  if (kind === "target") return true;
  if (kind === "function") return t.functions.length > 0;
  return t.functions.length > 0;
}

/** Slice a policy down to roles that include this member. */
export function policyForMember(
  policy: RolesPolicy,
  member: Hex,
): RolesPolicy {
  const m = member.toLowerCase();
  return {
    ...policy,
    roles: policy.roles
      .filter((r) => r.members.some((x) => x.toLowerCase() === m))
      .map(
        (r): RolesRole => ({
          ...r,
          members: r.members.filter((x) => x.toLowerCase() === m),
        }),
      ),
  };
}

/**
 * Derive topology pattern flags from reconstructed Roles policies.
 * Never invent flags without evidence in the policy tree.
 *
 * Zodiac semantics:
 * - Target clearance = target-wide authority
 * - Function clearance + empty functions = no granted function (not unrestricted)
 * - Function clearance + scoped/wildcard functions = those functions only
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
        const kind = clearanceKind(t.clearance);

        if (target === safe && grantsSafeSelfCall(t)) {
          rolesCanCallSafe = true;
          notes.push(
            `target ${t.address} is the Safe itself with granted clearance=${t.clearance}`,
          );
        }

        const targetOpt = (t.executionOptions ?? "").toLowerCase();
        if (kind === "target" && targetOpt.includes("delegate")) {
          rolesDelegatecall = true;
          notes.push(
            `delegatecall AllowTarget on ${t.address.slice(0, 10)}… options=${t.executionOptions}`,
          );
        }

        if (targetWideUnrestricted(t)) {
          freeRecipientTransfer = true;
          notes.push(
            `role ${role.key.slice(0, 10)}… target ${t.address.slice(0, 10)}… target-wide clearance=${t.clearance}`,
          );
        }

        // Function clearance with zero functions = no permission on that target.
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
