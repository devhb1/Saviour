/**
 * Differential helpers vs zodiac-roles-sdk v4.
 * SDK transforms permission shapes; chain/subgraph remain the discovery trust path.
 */
import {
  Clearance,
  ExecutionOptions,
  reconstructPermissions,
} from "zodiac-roles-sdk";
import type { Hex } from "../assessTypes.js";
import type { RolesPolicy, RolesTargetClearance } from "./rolesTree.js";

export type SdkTargetLike = {
  address: string;
  clearance: (typeof Clearance)[keyof typeof Clearance];
  executionOptions: (typeof ExecutionOptions)[keyof typeof ExecutionOptions];
  functions: Array<{
    selector: string;
    wildcarded: boolean;
    executionOptions: (typeof ExecutionOptions)[keyof typeof ExecutionOptions];
    condition?: unknown;
  }>;
};

function mapClearance(c: string): (typeof Clearance)[keyof typeof Clearance] {
  const n = c.toLowerCase();
  if (n.includes("function")) return Clearance.Function;
  if (n.includes("target") || n === "allowed") return Clearance.Target;
  if (n.includes("none")) return Clearance.None;
  return Clearance.Function;
}

function mapExecOpts(
  o: string,
): (typeof ExecutionOptions)[keyof typeof ExecutionOptions] {
  const n = o.toLowerCase();
  if (n.includes("delegate") && n.includes("send")) return ExecutionOptions.Both;
  if (n.includes("delegate")) return ExecutionOptions.DelegateCall;
  if (n.includes("send")) return ExecutionOptions.Send;
  return ExecutionOptions.None;
}

export function toSdkTargets(
  targets: RolesTargetClearance[],
): SdkTargetLike[] {
  return targets.map((t) => ({
    address: t.address,
    clearance: mapClearance(t.clearance),
    executionOptions: ExecutionOptions.None,
    functions: t.functions.map((f) => ({
      selector: f.selector,
      wildcarded: f.wildcarded,
      executionOptions: mapExecOpts(f.executionOptions),
    })),
  }));
}

/** Flatten our reconstructed targets through the SDK permission normalizer. */
export function sdkPermissionsFromPolicy(policy: RolesPolicy): unknown[] {
  const allTargets: RolesTargetClearance[] = [];
  for (const role of policy.roles) allTargets.push(...role.targets);
  return reconstructPermissions(toSdkTargets(allTargets) as never);
}

export function comparePolicyToSdkFlat(
  policy: RolesPolicy,
): {
  ourTargetCount: number;
  sdkPermissionCount: number;
  sample: unknown[];
} {
  const perms = sdkPermissionsFromPolicy(policy);
  const ourTargetCount = policy.roles.reduce(
    (n, r) => n + r.targets.length,
    0,
  );
  return {
    ourTargetCount,
    sdkPermissionCount: perms.length,
    sample: perms.slice(0, 5),
  };
}

export function assertV211Mastercopy(mastercopy: Hex | null): boolean {
  return (
    mastercopy?.toLowerCase() ===
    "0xf2964ce6161ce0e75964fe7927ce114cb0b283d5"
  );
}
