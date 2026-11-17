import type { Hex } from "../assessTypes.js";
import { openMainnetSnapshot } from "./chainSnapshot.js";
import { readDelayInventory, probeModule } from "./delayAdapter.js";
import {
  buildCapabilityGraph,
  delayAddressesOnSafe,
} from "./executionPaths.js";
import { evaluateAuthorityFindings } from "./findings.js";
import {
  applyPatternsToPrincipal,
  evaluateTopologyPatterns,
  patternsToFindings,
} from "./patterns.js";
import { rolesFromProbes } from "./rolesAdapter.js";
import { readRolesModifierState } from "./rolesState.js";
import { readSafeInventory } from "./safeInventory.js";
import type { AuthorityAuditReport, DelayInventory } from "./types.js";
import {
  REACH_ENGINE_VERSION,
  ROLES_MODEL_VERSION,
  type PrincipalReach,
  type ReachReport,
} from "./verdict.js";

const AUDITOR_VERSION = "0.2.0-reach-preview";

const emptyReach = (): ReachReport => ({
  engineVersion: REACH_ENGINE_VERSION,
  rolesModelVersion: ROLES_MODEL_VERSION,
  principals: [],
});

/**
 * Baseline Control-Path audit + Blast Radius Reach preview.
 * Safe address → Findings · Coverage · Freshness · Reach.
 */
export async function auditSafe(opts: {
  safeAddress: Hex;
  chainId?: number;
  /** Optional known role members (e.g. Nov16 operator) for defaultRoles probes */
  knownRoleMembers?: Hex[];
  /** When true, treat free-recipient outbound as suspected (incident fixtures) */
  suspectFreeRecipient?: boolean;
}): Promise<AuthorityAuditReport> {
  const errors: string[] = [];
  const chainId = opts.chainId ?? 1;
  const safeAddress = opts.safeAddress.toLowerCase() as Hex;

  if (chainId !== 1) {
    return {
      product: "saviour-control-path-auditor",
      version: AUDITOR_VERSION,
      safeAddress,
      findings: [],
      coverage: {
        complete: false,
        gaps: [
          {
            area: "chain",
            reason: "Mainnet-only MVP — refuse other chainIds",
          },
        ],
        reconstructed: [],
      },
      freshness: null,
      graph: null,
      reach: emptyReach(),
      errors: ["chainId must be 1"],
    };
  }

  try {
    const snap = await openMainnetSnapshot(chainId);
    const safe = await readSafeInventory(
      snap.client,
      safeAddress,
      snap.blockNumber,
    );

    const modules = [];
    for (const m of safe.modules) {
      try {
        modules.push(
          await probeModule(snap.client, m, snap.blockNumber),
        );
      } catch (e) {
        errors.push(
          `module probe failed ${m}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    const delayAddrs = delayAddressesOnSafe(safe, modules);
    const delays: DelayInventory[] = [];
    for (const d of delayAddrs) {
      delays.push(
        await readDelayInventory(snap.client, d, snap.blockNumber),
      );
    }

    const roles = rolesFromProbes(modules, safeAddress);
    const graph = buildCapabilityGraph({
      safe,
      delays,
      modules,
      extraNodes: roles.nodes,
      extraEdges: roles.edges,
    });

    const findings = evaluateAuthorityFindings(graph);

    const reconstructed = [
      "safe.owners",
      "safe.threshold",
      "safe.modules",
      "safe.version",
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

    // Deep Roles state reads
    const rolesModules = modules.filter(
      (m) =>
        m.looksLikeRolesProxy ||
        roles.nodes.some((n) => n.address === m.address),
    );
    for (const rm of rolesModules) {
      const state = await readRolesModifierState(
        snap.client,
        rm.address,
        snap.blockNumber,
        { knownMembers: opts.knownRoleMembers },
      );
      gaps.push(...state.gaps);
      reconstructed.push(...state.reconstructed);
    }

    const hasRoles = rolesModules.length > 0 || roles.nodes.length > 0;
    const hasDelay = delays.some((d) => d.looksLikeDelay);
    const bypass = findings.some((f) => f.rule === "DELAY_BYPASS_PATH");

    const patternHits = evaluateTopologyPatterns({
      safeAddress,
      hasRolesModule: hasRoles,
      hasDelay,
      directModulesBypassDelay: bypass,
      freeRecipientTransferSuspected: opts.suspectFreeRecipient === true,
    });
    findings.push(...patternsToFindings(patternHits));

    const principals: PrincipalReach[] = [];
    if (hasRoles) {
      let rolePrincipal: PrincipalReach = {
        principalId: "roles-module",
        principal: (rolesModules[0]?.address ??
          ("module" as const)) as Hex | "module",
        kind: "module",
        verdict: "UNKNOWN",
        bounds: [],
        reasons: [
          "Roles permission trees not fully enumerated — worst-case UNKNOWN until differential reconstruction",
        ],
        patterns: [],
      };
      rolePrincipal = applyPatternsToPrincipal(rolePrincipal, patternHits);
      principals.push(rolePrincipal);

      for (const member of opts.knownRoleMembers ?? []) {
        let p: PrincipalReach = {
          principalId: `role-member:${member.toLowerCase()}`,
          principal: member.toLowerCase() as Hex,
          kind: "role_member",
          verdict: "UNKNOWN",
          bounds: [],
          reasons: [
            "Member supplied via fixture/probe — policy clearance unread",
          ],
          patterns: [],
        };
        p = applyPatternsToPrincipal(p, patternHits);
        principals.push(p);
      }
    }

    principals.push({
      principalId: "owner-set",
      principal: "owners",
      kind: "owner_set",
      verdict: "UNBOUNDED",
      bounds: [],
      reasons: [
        `Owner threshold ${safe.threshold ?? "?"}-of-${safe.owners.length} can change modules/policy — treated as full control`,
      ],
      patterns: ["pattern:owner-threshold"],
    });

    const reach: ReachReport = {
      engineVersion: REACH_ENGINE_VERSION,
      rolesModelVersion: ROLES_MODEL_VERSION,
      principals,
    };

    const coverageComplete = roles.gaps.length === 0 && errors.length === 0;

    return {
      product: "saviour-control-path-auditor",
      version: AUDITOR_VERSION,
      safeAddress,
      findings,
      coverage: {
        complete: coverageComplete,
        gaps,
        reconstructed,
      },
      freshness: snap.freshness,
      graph,
      reach,
      errors,
    };
  } catch (e) {
    return {
      product: "saviour-control-path-auditor",
      version: AUDITOR_VERSION,
      safeAddress,
      findings: [],
      coverage: {
        complete: false,
        gaps: [
          {
            area: "snapshot",
            reason: e instanceof Error ? e.message : String(e),
          },
        ],
        reconstructed: [],
      },
      freshness: null,
      graph: null,
      reach: emptyReach(),
      errors: [e instanceof Error ? e.message : String(e)],
    };
  }
}
