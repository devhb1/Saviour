import type { DecodedAction } from "../types.js";
import { decodeAragonActions, type AragonAction } from "./aragonOsx.js";

/**
 * Zodiac Roles `callTargetFunctionWithRole` envelope — unwrap to inner target call.
 * Term Prop 5 sat behind Roles before Delay.
 */
export function unwrapRolesCall(inner: AragonAction, path: string[] = ["ZodiacRoles"]): DecodedAction[] {
  return decodeAragonActions([inner], [...path, "callTargetFunctionWithRole"]);
}
