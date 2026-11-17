import type { Hex } from "../assessTypes.js";
import { ROLES_MASTERCOPIES } from "./abis.js";
import type { CoverageGap, GraphEdge, GraphNode, ModuleProbe } from "./types.js";

/**
 * MVP Roles adapter — identity + wiring hints only.
 * Full members / condition trees are Coverage gaps (Gate G1 expansion).
 */
export function rolesFromProbes(
  probes: ModuleProbe[],
  safeAddress: Hex,
): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  gaps: CoverageGap[];
  reconstructed: string[];
} {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const gaps: CoverageGap[] = [];
  const reconstructed: string[] = [];

  for (const p of probes) {
    const impl = p.implementation?.toLowerCase();
    const isRoles =
      p.looksLikeRolesProxy ||
      (impl != null && ROLES_MASTERCOPIES.has(impl));

    if (!isRoles && !p.looksLikeRolesProxy) continue;

    const id = `roles:${p.address}`;
    nodes.push({
      id,
      kind: "roles",
      address: p.address,
      label: impl && ROLES_MASTERCOPIES.has(impl) ? "Zodiac Roles (mastercopy match)" : "Possible Roles / modifier proxy",
    });
    reconstructed.push(`roles-proxy:${p.address}`);

    if (p.avatar) {
      edges.push({
        id: `avatar:${p.address}`,
        from: id,
        to: `safe:${p.avatar}`,
        kind: "avatar",
        label: "avatar",
      });
    }
    if (p.target) {
      const targetIsSafe = p.target === safeAddress;
      edges.push({
        id: `target:${p.address}`,
        from: id,
        to: targetIsSafe ? `safe:${p.target}` : `module:${p.target}`,
        kind: "target",
        label: "target",
      });
    }

    gaps.push({
      area: `roles:${p.address}`,
      reason:
        "Role members, role keys, target/function permissions, and condition trees are not reconstructed in MVP — mark inconclusive for 'what can this role do?'",
    });
  }

  if (nodes.length === 0) {
    gaps.push({
      area: "roles",
      reason:
        "No Roles-like module identified by mastercopy / avatar probe — Roles state unknown",
    });
  }

  return { nodes, edges, gaps, reconstructed };
}
