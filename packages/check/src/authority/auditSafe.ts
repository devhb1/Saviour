import type { Hex } from "../assessTypes.js";
import { assertHexAddress, filterHexAddresses } from "./address.js";
import { openMainnetSnapshot } from "./chainSnapshot.js";
import { buildCoverageReport, component } from "./coverage.js";
import { readDelayInventory, probeModule } from "./delayAdapter.js";
import {
  buildCapabilityGraph,
  delayAddressesOnSafe,
  rolesProbeCandidates,
} from "./executionPaths.js";
import {
  evaluateAuthorityFindings,
  ownerInventoryValid,
  ownerSetPrincipal,
  ownersAreBurned,
  unreadModulePrincipal,
} from "./findings.js";
import {
  applyPatternsToPrincipal,
  evaluateTopologyPatterns,
  hitsForRolesReach,
  patternsToFindings,
} from "./patterns.js";
import { rolesFromProbes } from "./rolesAdapter.js";
import { derivePatternFlagsFromPolicy } from "./rolesPatterns.js";
import { readRolesModifierState } from "./rolesState.js";
import {
  ROLES_V211_MASTERCOPY,
  reconstructRolesPolicy,
  type RolesPolicy,
} from "./rolesTree.js";
import { readSafeInventory } from "./safeInventory.js";
import { deriveAuditStatus } from "./auditStatus.js";
import type {
  AuthorityAuditReport,
  CoverageComponent,
  DelayInventory,
} from "./types.js";
import {
  REACH_ENGINE_VERSION,
  ROLES_MODEL_VERSION,
  type PrincipalReach,
  type ReachReport,
} from "./verdict.js";

function finishReport(
  partial: Omit<AuthorityAuditReport, "status">,
): AuthorityAuditReport {
  const status = deriveAuditStatus(partial);
  return { ...partial, status };
}

function scrubReadError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const line = (msg.split("\n")[0] ?? "read failed").slice(0, 160);
  if (/https?:\/\//i.test(line) || /\/v2\/|api[_-]?key/i.test(line)) {
    return "RPC request failed";
  }
  return line;
}

const AUDITOR_VERSION = "0.3.0-permission-auditor";

const emptyReach = (): ReachReport => ({
  engineVersion: REACH_ENGINE_VERSION,
  rolesModelVersion: ROLES_MODEL_VERSION,
  principals: [],
});

export type AuditSafeOptions = {
  safeAddress: Hex;
  chainId?: number;
  /**
   * Optional addresses to probe for defaultRoles / membership display.
   * Never treated as verified membership for CRITICAL severity alone —
   * chain / reconstructed policy is the trust root.
   */
  probeMembers?: Hex[];
  /** Re-audit this block instead of the chain head. */
  blockNumber?: bigint;
  /**
   * Fixture-only assumptions (e.g. CLI nov16). Never exposed on public HTTP API.
   * Each string is echoed into report.assumptions with an `assumption:` prefix.
   */
  fixtureAssumptions?: {
    freeRecipientTransferSuspected?: boolean;
    labels?: string[];
  };
};

/**
 * Baseline Permission Auditor + Reach.
 * Safe address → Findings · Coverage · Freshness · Reach.
 */
export async function auditSafe(
  opts: AuditSafeOptions,
): Promise<AuthorityAuditReport> {
  const errors: string[] = [];
  const assumptions: string[] = [];
  const chainId = opts.chainId ?? 1;
  const safeAddress = assertHexAddress(opts.safeAddress, "safeAddress");
  const probeMembers = filterHexAddresses(
    (opts.probeMembers ?? []).map(String),
  );

  if (opts.fixtureAssumptions?.freeRecipientTransferSuspected) {
    assumptions.push(
      "assumption:freeRecipientTransferSuspected — fixture/CLI only; not derived from reconstructed policy",
    );
  }
  for (const label of opts.fixtureAssumptions?.labels ?? []) {
    assumptions.push(`assumption:${label}`);
  }

  if (chainId !== 1) {
    return finishReport({
      product: "saviour-control-path-auditor",
      version: AUDITOR_VERSION,
      safeAddress,
      findings: [],
      coverage: buildCoverageReport({
        components: [
          component("safeOwners", "unsupported", "Mainnet-only MVP"),
        ],
        gaps: [
          {
            area: "chain",
            reason: "Mainnet-only MVP — refuse other chainIds",
          },
        ],
        reconstructed: [],
        errors: ["chainId must be 1"],
      }),
      freshness: null,
      graph: null,
      reach: emptyReach(),
      assumptions,
      errors: ["chainId must be 1"],
    });
  }

  try {
    const snap = await openMainnetSnapshot(chainId, opts.blockNumber);
    const safe = await readSafeInventory(
      snap.client,
      safeAddress,
      snap.blockNumber,
    );

    const modules = [];
    for (const m of safe.modules) {
      try {
        modules.push(await probeModule(snap.client, m, snap.blockNumber));
      } catch (e) {
        errors.push(`module probe failed ${m}: ${scrubReadError(e)}`);
      }
    }

    const delayAddrs = delayAddressesOnSafe(safe, modules);
    const delays: DelayInventory[] = [];
    for (const d of delayAddrs) {
      delays.push(
        await readDelayInventory(snap.client, d, snap.blockNumber),
      );
    }

    const behindDelay = [];
    for (const m of rolesProbeCandidates(modules, delays)) {
      try {
        behindDelay.push(await probeModule(snap.client, m, snap.blockNumber));
      } catch (e) {
        errors.push(`delay module probe failed ${m}: ${scrubReadError(e)}`);
      }
    }

    const roles = rolesFromProbes(
      [...modules, ...behindDelay],
      safeAddress,
    );
    const graph = buildCapabilityGraph({
      safe,
      delays,
      modules,
      extraNodes: roles.nodes,
      extraEdges: roles.edges,
    });

    const findings = evaluateAuthorityFindings(graph);

    const reconstructed = [
      ...(safe.ownersRead === "ok" ? (["safe.owners"] as const) : []),
      ...(safe.thresholdRead === "ok" ? (["safe.threshold"] as const) : []),
      ...(safe.modulesRead === "ok" || safe.modulesRead === "truncated"
        ? (["safe.modules"] as const)
        : []),
      ...(safe.version != null ? (["safe.version"] as const) : []),
      ...delays.map((d) => `delay:${d.address}`),
      ...roles.reconstructed,
    ];

    const gaps = [...roles.gaps];
    if (safe.version == null) {
      gaps.push({
        area: "safe.version",
        reason: "VERSION() unread — Safe identity inconclusive",
      });
    }
    if (safe.ownersRead === "failed") {
      gaps.push({
        area: "safe.owners",
        reason:
          "getOwners failed. Owner authority is unread — Reach stays UNKNOWN for the owner set.",
      });
    }
    if (safe.thresholdRead === "failed") {
      gaps.push({
        area: "safe.threshold",
        reason: "getThreshold failed. Owner threshold is unread.",
      });
    }
    if (
      safe.ownersRead === "ok" &&
      safe.thresholdRead === "ok" &&
      !ownersAreBurned(safe.owners)
    ) {
      const structural = ownerInventoryValid(safe.owners, safe.threshold);
      if (!structural.ok) {
        gaps.push({
          area: "safe.owners",
          reason: `Owner inventory structurally invalid: ${structural.reason}`,
        });
      }
    }
    if (
      safe.version == null &&
      safe.ownersRead === "failed" &&
      safe.modulesRead === "failed"
    ) {
      gaps.push({
        area: "safe.identity",
        reason:
          "VERSION, owners, and modules all failed. This address may not be a Safe at this block.",
      });
    }
    if (safe.modulesRead === "failed") {
      gaps.push({
        area: "safe.modules",
        reason:
          "Module list could not be read. An empty list here is not proof that no modules are enabled.",
      });
    } else if (safe.modulesRead === "fallback_page") {
      gaps.push({
        area: "safe.modules",
        reason:
          "Full module pagination failed. Only the first page of up to 20 modules was read. Coverage stays partial.",
      });
    } else if (safe.modulesRead === "truncated" || safe.modulesTruncated) {
      gaps.push({
        area: "safe.modules",
        reason:
          "Module pagination stopped at 1,000 entries. Later modules were not read.",
      });
    }
    for (const d of delays) {
      if (d.modulesRead === "failed") {
        gaps.push({
          area: `delay:${d.address}:modules`,
          reason:
            "Delay module list could not be read. Nested modules on this Delay are unread.",
        });
        continue;
      }
      if (d.modulesRead === "truncated" || d.modulesTruncated) {
        gaps.push({
          area: `delay:${d.address}:modules`,
          reason:
            "Delay module pagination stopped at 1,000 entries. Later modules were not read.",
        });
      }
    }

    const rolesModules = [...modules, ...behindDelay].filter(
      (m) =>
        m.looksLikeRolesProxy ||
        roles.nodes.some((n) => n.address === m.address),
    );

    const policies: RolesPolicy[] = [];
    let hasV211 = false;
    let hasOtherRoles = false;

    for (const rm of rolesModules) {
      const state = await readRolesModifierState(
        snap.client,
        rm.address,
        snap.blockNumber,
        { probeMembers },
      );
      gaps.push(...state.gaps);
      reconstructed.push(...state.reconstructed);

      const mc = state.mastercopy?.toLowerCase() ?? "";
      if (mc === ROLES_V211_MASTERCOPY) {
        hasV211 = true;
        const policy = await reconstructRolesPolicy({
          client: snap.client,
          rolesAddress: rm.address,
          blockNumber: snap.blockNumber,
          mastercopy: state.mastercopy,
          versionHint: state.versionHint,
          probeMembers,
        });
        policies.push(policy);
        gaps.push(...policy.gaps);
        reconstructed.push(...policy.reconstructed);
      } else {
        hasOtherRoles = true;
        gaps.push({
          area: `roles:${rm.address}:version-gate`,
          reason: `Roles mastercopy ${state.mastercopy ?? "unknown"} (${state.versionHint}) is not v2.1.1 — identified only; not silently interpreted with the v2.1.1 adapter`,
        });
      }
    }

    const hasRoles = rolesModules.length > 0 || roles.nodes.length > 0;
    const hasDelay = delays.some((d) => d.looksLikeDelay);
    const bypass = findings.some((f) => f.rule === "DELAY_BYPASS_PATH");

    for (const d of delays) {
      if (d.delayIdentity === "suspected") {
        gaps.push({
          area: `delay:${d.address}:identity`,
          reason:
            "Delay identity is suspected (txCooldown readable) — mastercopy was not a known Delay implementation. Lifecycle stays unread.",
        });
      }
    }

    const derived = derivePatternFlagsFromPolicy(policies, safeAddress);
    const patternHits = evaluateTopologyPatterns({
      safeAddress,
      hasRolesModule: hasRoles,
      hasDelay,
      directModulesBypassDelay: bypass,
      rolesCanCallSafe: derived.rolesCanCallSafe,
      rolesDelegatecall: derived.rolesDelegatecall,
      freeRecipientTransferSuspected:
        derived.freeRecipientTransfer ||
        opts.fixtureAssumptions?.freeRecipientTransferSuspected === true,
    });
    findings.push(...patternsToFindings(patternHits));

    const principals: PrincipalReach[] = [];

    // One Reach principal per Roles module — never aggregate A+B+C into one row.
    const rolesModuleAddrs = new Set(
      rolesModules.map((m) => m.address.toLowerCase()),
    );
    for (const pol of policies) {
      const addr = pol.rolesAddress.toLowerCase() as Hex;
      rolesModuleAddrs.delete(addr);
      const perDerived = derivePatternFlagsFromPolicy([pol], safeAddress);
      const perHits = evaluateTopologyPatterns({
        safeAddress,
        hasRolesModule: true,
        hasDelay,
        directModulesBypassDelay: bypass,
        rolesCanCallSafe: perDerived.rolesCanCallSafe,
        rolesDelegatecall: perDerived.rolesDelegatecall,
        freeRecipientTransferSuspected:
          perDerived.freeRecipientTransfer ||
          opts.fixtureAssumptions?.freeRecipientTransferSuspected === true,
      });
      const policyComplete =
        pol.status === "reconstructed" && pol.gaps.length === 0;
      const reachHits = hitsForRolesReach(perHits, policyComplete);

      let rolePrincipal: PrincipalReach = {
        principalId: `roles-module:${addr}`,
        principal: addr,
        kind: "module",
        verdict:
          pol.status === "reconstructed" || pol.status === "partial"
            ? perDerived.anyUnbounded
              ? "UNBOUNDED"
              : "UNKNOWN"
            : "UNKNOWN",
        bounds: [],
        reasons:
          pol.roles.length > 0
            ? [
                pol.source === "chain-logs"
                  ? `Roles module ${addr.slice(0, 10)}… — permissions replayed from chain logs at the pinned block. Condition trees are not reduced to token quantities.`
                  : `Roles module ${addr.slice(0, 10)}… — policy is partial; see Coverage gaps`,
                ...pol.roles.slice(0, 4).map((r) => {
                  const targets = r.targets
                    .slice(0, 3)
                    .map((t) => {
                      const fns = t.functions
                        .slice(0, 3)
                        .map((f) => f.selector)
                        .join(",");
                      return `${t.address.slice(0, 10)}… ${t.clearance}${fns ? ` [${fns}]` : ""}`;
                    })
                    .join("; ");
                  return `role ${r.key.slice(0, 10)}… members=${r.members.length} ${targets || "no targets"}`;
                }),
              ]
            : [
                `Roles module ${addr.slice(0, 10)}… — permission trees not fully enumerated; worst-case UNKNOWN`,
              ],
        patterns: [],
      };
      rolePrincipal = applyPatternsToPrincipal(rolePrincipal, reachHits);
      principals.push(rolePrincipal);

      const policyMembers = new Set<string>();
      for (const role of pol.roles) {
        for (const m of role.members) policyMembers.add(m.toLowerCase());
      }
      const memberList = [
        ...new Set([
          ...policyMembers,
          ...probeMembers.map((m) => m.toLowerCase()),
        ]),
      ] as Hex[];

      for (const member of memberList) {
        const fromPolicy = policyMembers.has(member.toLowerCase());
        let p: PrincipalReach = {
          principalId: `role-member:${addr}:${member.toLowerCase()}`,
          principal: member.toLowerCase() as Hex,
          kind: "role_member",
          verdict: "UNKNOWN",
          bounds: [],
          reasons: [
            fromPolicy
              ? `Membership on Roles module ${addr.slice(0, 10)}… from reconstructed policy — clearance assessed via targets/options`
              : `Probe address on Roles module ${addr.slice(0, 10)}… — membership not proven; treat as unverified probe`,
          ],
          patterns: [],
        };
        if (fromPolicy) {
          p = applyPatternsToPrincipal(p, reachHits);
        } else if (opts.fixtureAssumptions?.freeRecipientTransferSuspected) {
          p = applyPatternsToPrincipal(p, perHits);
          p.reasons.push(
            "assumption: fixture free-recipient applied to probe member",
          );
        }
        principals.push(p);
      }
    }

    for (const leftover of rolesModuleAddrs) {
      principals.push({
        principalId: `roles-module:${leftover}`,
        principal: leftover as Hex,
        kind: "module",
        verdict: "UNKNOWN",
        bounds: [],
        reasons: [
          "Roles module identified but not interpreted with the v2.1.1 adapter (unsupported mastercopy or failed reconstruction).",
        ],
        patterns: ["pattern:roles-unsupported"],
      });
    }

    const seenModulePrincipals = new Set(
      principals.map((p) => p.principalId),
    );
    for (const m of modules) {
      const row = unreadModulePrincipal(m, "safe");
      if (!row || seenModulePrincipals.has(row.principalId)) continue;
      seenModulePrincipals.add(row.principalId);
      principals.push(row);
    }
    for (const m of behindDelay) {
      const row = unreadModulePrincipal(m, "delay");
      if (!row || seenModulePrincipals.has(row.principalId)) continue;
      seenModulePrincipals.add(row.principalId);
      principals.push(row);
    }

    principals.push(
      ownerSetPrincipal(safe.owners, safe.threshold, {
        ownersRead: safe.ownersRead,
        thresholdRead: safe.thresholdRead,
      }),
    );

    const reach: ReachReport = {
      engineVersion: REACH_ENGINE_VERSION,
      rolesModelVersion: ROLES_MODEL_VERSION,
      principals,
    };

    const ownersStructural = ownerInventoryValid(safe.owners, safe.threshold);
    const ownersAssessed =
      safe.ownersRead === "ok" &&
      safe.thresholdRead === "ok" &&
      (ownersAreBurned(safe.owners) || ownersStructural.ok);
    const modulesAssessed =
      safe.modulesRead === "ok" &&
      modules.length === safe.modules.length &&
      !safe.modulesTruncated;

    const components: CoverageComponent[] = [
      component(
        "safeOwners",
        ownersAssessed
          ? "assessed"
          : safe.ownersRead === "failed" || safe.thresholdRead === "failed"
            ? "partial"
            : "partial",
        ownersAssessed
          ? "Owners + threshold inventory"
          : safe.ownersRead === "failed" || safe.thresholdRead === "failed"
            ? "Owner or threshold read failed — not assessed"
            : !ownersStructural.ok
              ? `Owner inventory invalid — ${ownersStructural.reason}`
              : "Owners + threshold incomplete",
      ),
      component(
        "modules",
        modulesAssessed ? "assessed" : "partial",
        modulesAssessed
          ? "Enabled modules enumerated and probed"
          : safe.modulesRead === "failed"
            ? "Module list unread — empty is not assessed"
            : safe.modulesRead === "fallback_page"
              ? "Only the first module page was read"
              : "Module enumeration incomplete or probe mismatch",
      ),
      component(
        "rolesV211",
        !hasRoles
          ? "unsupported"
          : hasV211 && policies.some((p) => p.status === "reconstructed")
            ? policies.every((p) => p.status === "reconstructed" && p.gaps.length === 0)
              ? "assessed"
              : "partial"
            : hasV211
              ? "partial"
              : "unassessed",
        hasV211
          ? "Zodiac Roles v2.1.1 adapter"
          : hasRoles
            ? "No v2.1.1 Roles module on this Safe"
            : "No Roles module",
      ),
      component(
        "rolesOther",
        hasOtherRoles ? "partial" : "unsupported",
        hasOtherRoles
          ? "Non-2.1.1 Roles identified only — not interpreted"
          : "No other Roles versions",
      ),
      component(
        "delay",
        !hasDelay
          ? "unsupported"
          : "partial",
        hasDelay
          ? "Delay inventory only — lifecycle not fully assessed"
          : "No Delay module",
      ),
      component(
        "delegatecall",
        derived.rolesDelegatecall
          ? "assessed"
          : hasV211
            ? "partial"
            : "unassessed",
        derived.rolesDelegatecall
          ? "Delegatecall capability found in reconstructed options"
          : "Delegatecall not fully proven absent",
      ),
      component(
        "guards",
        safe.guard != null || safe.fallbackHandler != null
          ? "partial"
          : "unassessed",
        safe.guard != null || safe.fallbackHandler != null
          ? "Guard or fallback handler is identified, not interpreted"
          : "No guard or fallback handler was recorded",
      ),
      component(
        "allowances",
        policies.some((p) => p.hasAllowanceData)
          ? "partial"
          : hasV211
            ? "unassessed"
            : "unsupported",
        "Token allowances only when reconstructed with evidence",
      ),
    ];

    let freshness = snap.freshness;
    try {
      const again = await snap.client.getBlock({
        blockNumber: snap.blockNumber,
      });
      if (
        again.hash &&
        again.hash.toLowerCase() !== snap.freshness.blockHash.toLowerCase()
      ) {
        errors.push(
          "Block hash changed during audit — snapshot inconsistent (possible reorg)",
        );
        gaps.push({
          area: "snapshot",
          reason:
            "Pinned block hash at start does not match the hash at the same height after reads",
        });
        freshness = {
          ...snap.freshness,
          consistency: "inconsistent",
        };
      } else {
        freshness = {
          ...snap.freshness,
          consistency: "hash-verified-at-end",
        };
      }
    } catch {
      freshness = {
        ...snap.freshness,
        consistency: "number-pinned",
      };
      gaps.push({
        area: "snapshot",
        reason:
          "Could not re-read block hash after inventory — consistency is number-pinned only",
      });
    }

    return finishReport({
      product: "saviour-control-path-auditor",
      version: AUDITOR_VERSION,
      safeAddress,
      findings,
      coverage: buildCoverageReport({
        components,
        gaps,
        reconstructed,
        errors,
      }),
      freshness,
      graph,
      reach,
      assumptions: assumptions.length ? assumptions : undefined,
      errors,
    });
  } catch (e) {
    return finishReport({
      product: "saviour-control-path-auditor",
      version: AUDITOR_VERSION,
      safeAddress,
      findings: [],
      coverage: buildCoverageReport({
        components: [component("safeOwners", "unassessed", "Snapshot failed")],
        gaps: [
          {
            area: "snapshot",
            reason: e instanceof Error ? e.message : String(e),
          },
        ],
        reconstructed: [],
        errors: [e instanceof Error ? e.message : String(e)],
      }),
      freshness: null,
      graph: null,
      reach: emptyReach(),
      assumptions: assumptions.length ? assumptions : undefined,
      errors: [e instanceof Error ? e.message : String(e)],
    });
  }
}
