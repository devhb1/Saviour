import type {
  CapabilityGraph,
  AuthorityFinding,
  InventoryReadStatus,
  ModuleProbe,
} from "./types.js";
import type { PrincipalReach } from "./verdict.js";
import type { Hex } from "../assessTypes.js";

const BURNED = new Set([
  "0x000000000000000000000000000000000000dead",
  "0x0000000000000000000000000000000000000000",
]);

/** True when every owner is the zero address or the dead address. */
export function ownersAreBurned(owners: readonly string[]): boolean {
  return (
    owners.length > 0 &&
    owners.every((o) => BURNED.has(o.toLowerCase()))
  );
}

export type OwnerSetOptions = {
  ownersRead?: InventoryReadStatus;
  thresholdRead?: InventoryReadStatus;
};

/** Structurally valid Safe owner inventory — empty or inconsistent sets are not UNBOUNDED. */
export function ownerInventoryValid(
  owners: readonly string[],
  threshold: number | null,
): { ok: true } | { ok: false; reason: string } {
  if (owners.length === 0) {
    return { ok: false, reason: "getOwners returned an empty set" };
  }
  const lowered = owners.map((o) => o.toLowerCase());
  if (new Set(lowered).size !== lowered.length) {
    return { ok: false, reason: "Owner set contains duplicate addresses" };
  }
  if (threshold == null) {
    return { ok: false, reason: "Threshold is null" };
  }
  if (!Number.isFinite(threshold) || threshold <= 0) {
    return {
      ok: false,
      reason: `Threshold ${threshold} is not a positive integer`,
    };
  }
  if (threshold > owners.length) {
    return {
      ok: false,
      reason: `Threshold ${threshold} exceeds owner count ${owners.length}`,
    };
  }
  return { ok: true };
}

/**
 * Owner threshold is full control only when those owners can still sign.
 * A burned set cannot change policy, so it is not UNBOUNDED.
 * A failed or structurally invalid owner/threshold read is UNKNOWN —
 * never invent UNBOUNDED from silence or an empty successful read.
 */
export function ownerSetPrincipal(
  owners: readonly string[],
  threshold: number | null,
  opts?: OwnerSetOptions,
): PrincipalReach {
  const ownersFailed = opts?.ownersRead === "failed";
  const thresholdFailed = opts?.thresholdRead === "failed";
  if (ownersFailed || thresholdFailed) {
    return {
      principalId: "owner-set",
      principal: "owners",
      kind: "owner_set",
      verdict: "UNKNOWN",
      bounds: [],
      reasons: [
        ownersFailed && thresholdFailed
          ? "getOwners and getThreshold both failed. Owner authority is unread — not a live owner set and not a burned set."
          : ownersFailed
            ? "getOwners failed. Owner authority is unread — not a live owner set and not a burned set."
            : "getThreshold failed. Owner authority is unread.",
      ],
      patterns: ["pattern:owners-unread"],
    };
  }
  if (ownersAreBurned(owners)) {
    return {
      principalId: "owner-set",
      principal: "owners",
      kind: "owner_set",
      verdict: "BOUNDED",
      bounds: [],
      reasons: [
        "Every owner is the zero or dead address. This owner set cannot sign and cannot change modules or policy. Standing authority is the enabled modules, reported as their own principals.",
      ],
      patterns: ["pattern:owners-burned"],
    };
  }
  const structural = ownerInventoryValid(owners, threshold);
  if (!structural.ok) {
    return {
      principalId: "owner-set",
      principal: "owners",
      kind: "owner_set",
      verdict: "UNKNOWN",
      bounds: [],
      reasons: [
        `Owner inventory is structurally invalid (${structural.reason}). Not treated as a live signing threshold.`,
      ],
      patterns: ["pattern:owners-invalid"],
    };
  }
  return {
    principalId: "owner-set",
    principal: "owners",
    kind: "owner_set",
    verdict: "UNBOUNDED",
    bounds: [],
    reasons: [
      `Owner threshold ${threshold}-of-${owners.length} can change modules and policy. That control is separate from a role member.`,
    ],
    patterns: ["pattern:owner-threshold"],
  };
}

/**
 * Reach row for a Safe-enabled or Delay-enabled module that has no full adapter.
 * Roles modules are handled separately. Delay is inventory-only (lifecycle unread).
 */
export function unreadModulePrincipal(
  module: ModuleProbe,
  where: "safe" | "delay",
): PrincipalReach | null {
  const address = module.address.toLowerCase() as Hex;
  if (module.looksLikeRolesProxy) {
    return null;
  }
  if (module.looksLikeDelay) {
    return {
      principalId: `delay:${address}`,
      principal: address,
      kind: "module",
      verdict: "UNKNOWN",
      bounds: [],
      reasons: [
        "Delay inventory only. Queued transactions, queue nonce, and execution eligibility are not read.",
      ],
      patterns: ["pattern:delay-inventory-only"],
    };
  }
  return {
    principalId: `module:${address}`,
    principal: address,
    kind: "module",
    verdict: "UNKNOWN",
    bounds: [],
    reasons: [
      where === "safe"
        ? "Module enabled directly on the Safe. No permission adapter for this implementation — authority stays UNKNOWN."
        : "Module enabled on a Delay. No permission adapter for this implementation — authority stays UNKNOWN.",
    ],
    patterns: ["pattern:module-unread"],
  };
}

/** First three MVP rules: Delay bypass, cooldown==0, direct module on Safe. */
export function evaluateAuthorityFindings(
  graph: CapabilityGraph,
): AuthorityFinding[] {
  const findings: AuthorityFinding[] = [];
  const delays = graph.delays.filter((d) => d.looksLikeDelay);
  const delayAddrs = new Set(delays.map((d) => d.address));

  for (const d of delays) {
    if (d.txCooldown === "0") {
      findings.push({
        id: `cooldown-zero:${d.address}`,
        rule: "DELAY_COOLDOWN_ZERO",
        severity: "CRITICAL",
        title: "Delay cooldown is zero",
        detail:
          "txCooldown=0 removes the waiting period on this Delay path. Distinct from txExpiration.",
        evidence: [
          `delay=${d.address}`,
          `txCooldown=${d.txCooldown}`,
          `txExpiration=${d.txExpiration ?? "unread"}`,
        ],
      });
    }
    if (d.txExpiration === "0") {
      findings.push({
        id: `expiration-zero:${d.address}`,
        rule: "DELAY_EXPIRATION_ZERO",
        severity: "WARN",
        title: "Delay expiration is zero (no auto-expiry)",
        detail:
          "txExpiration=0 means queued transactions never expire automatically; a stale FIFO head can block the queue. Not the same as cooldown=0.",
        evidence: [`delay=${d.address}`, `txExpiration=0`],
      });
    }
  }

  const directModules = graph.safe.modules.filter((m) => !delayAddrs.has(m));
  if (delays.length > 0 && directModules.length > 0) {
    findings.push({
      id: `bypass:${graph.safe.address}`,
      rule: "DELAY_BYPASS_PATH",
      severity: "CRITICAL",
      title: "Direct Safe module path bypasses Delay",
      detail:
        "At least one module is enabled directly on the Safe while a Delay is also present. Delay only protects routes that execute through it — these direct modules can reach the Safe without that waiting period.",
      evidence: [
        `safe=${graph.safe.address}`,
        `delays=${[...delayAddrs].join(",")}`,
        `directModules=${directModules.join(",")}`,
      ],
    });
  }

  for (const m of directModules) {
    findings.push({
      id: `direct-module:${m}`,
      rule: "DIRECT_SAFE_MODULE",
      severity: "WARN",
      title: "Module enabled directly on Safe",
      detail:
        "This module can initiate Safe execution without going through an observed Delay path.",
      evidence: [`module=${m}`, `safe=${graph.safe.address}`],
    });
  }

  if (
    graph.safe.ownersRead !== "failed" &&
    ownersAreBurned(graph.safe.owners)
  ) {
    findings.push({
      id: `owners-burned:${graph.safe.address}`,
      rule: "OWNERS_BURNED",
      severity: "CRITICAL",
      title: "Safe owner set is a burn address",
      detail:
        "Every owner is the zero or dead address. Threshold signatures cannot move this Safe. Standing authority is whatever the enabled modules already allow.",
      evidence: [`safe=${graph.safe.address}`, `owners=${graph.safe.owners.join(",")}`],
    });
  }

  return findings;
}
