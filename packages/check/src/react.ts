/**
 * Optional React entry — peer-free types; apps re-export a fetch-based hook.
 * Node agents should use `check()` / `guard()` from the main entry (viem ENS).
 */
export { check, guard, castCommand } from "./index.js";
export type { CheckResult, CheckOptions, Decision } from "./types.js";
