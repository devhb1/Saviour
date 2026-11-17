import type { Hex } from "../assessTypes.js";
import { openMainnetSnapshot } from "./chainSnapshot.js";
import { readDelayInventory, probeModule } from "./delayAdapter.js";
import {
  buildCapabilityGraph,
  delayAddressesOnSafe,
} from "./executionPaths.js";
import { evaluateAuthorityFindings } from "./findings.js";
import { rolesFromProbes } from "./rolesAdapter.js";
import { readSafeInventory } from "./safeInventory.js";
import type { AuthorityAuditReport, DelayInventory } from "./types.js";

const AUDITOR_VERSION = "0.1.0-control-path";

/**
 * Baseline Control-Path audit: Safe address → Findings · Coverage · Freshness.
 */
export async function auditSafe(opts: {
  safeAddress: Hex;
  chainId?: number;
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

    const gaps = [
      ...roles.gaps,
      ...(safe.guard == null
        ? []
        : []),
    ];
    if (safe.version == null) {
      gaps.push({
        area: "safe.version",
        reason: "VERSION() unread — Safe identity inconclusive",
      });
    }

    const complete =
      gaps.length === 0 &&
      errors.length === 0 &&
      safe.modules.length >= 0;

    // Roles gaps always make complete=false in MVP
    const coverageComplete = roles.gaps.length === 0 && errors.length === 0;

    return {
      product: "saviour-control-path-auditor",
      version: AUDITOR_VERSION,
      safeAddress,
      findings,
      coverage: {
        complete: coverageComplete && complete,
        gaps,
        reconstructed,
      },
      freshness: snap.freshness,
      graph,
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
      errors: [e instanceof Error ? e.message : String(e)],
    };
  }
}
