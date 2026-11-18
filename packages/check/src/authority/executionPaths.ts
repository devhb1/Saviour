import type { Hex } from "../assessTypes.js";
import type {
  CapabilityGraph,
  DelayInventory,
  GraphEdge,
  GraphNode,
  ModuleProbe,
  SafeInventory,
} from "./types.js";

export function buildCapabilityGraph(input: {
  safe: SafeInventory;
  delays: DelayInventory[];
  modules: ModuleProbe[];
  extraNodes?: GraphNode[];
  extraEdges?: GraphEdge[];
}): CapabilityGraph {
  const nodes: GraphNode[] = [
    {
      id: `safe:${input.safe.address}`,
      kind: "safe",
      address: input.safe.address,
      label: `Safe ${input.safe.version ?? "?"} · ${input.safe.threshold ?? "?"}-of-${input.safe.owners.length}`,
    },
  ];
  const edges: GraphEdge[] = [];

  for (const [i, o] of input.safe.owners.entries()) {
    const id = `owner:${o}`;
    nodes.push({ id, kind: "owner", address: o, label: `owner[${i}]` });
    edges.push({
      id: `owns:${o}`,
      from: id,
      to: `safe:${input.safe.address}`,
      kind: "owns",
    });
  }

  const delaySet = new Set(
    input.delays.filter((d) => d.looksLikeDelay).map((d) => d.address),
  );

  for (const d of input.delays) {
    if (!d.looksLikeDelay) continue;
    const id = `delay:${d.address}`;
    nodes.push({
      id,
      kind: "delay",
      address: d.address,
      label: `Delay cooldown=${d.txCooldown ?? "?"} expiration=${d.txExpiration ?? "?"}`,
    });
    edges.push({
      id: `mod-enables:${d.address}`,
      from: `safe:${input.safe.address}`,
      to: id,
      kind: "enables_module",
      label: "enabled on Safe",
    });
    edges.push({
      id: `delay-path:${d.address}`,
      from: id,
      to: `safe:${input.safe.address}`,
      kind: "delay_path",
      label: "queued execution path",
    });
    for (const m of d.modules) {
      const id = `module:${m}`;
      if (!nodes.some((n) => n.id === id)) {
        nodes.push({
          id,
          kind: "module",
          address: m,
          label: "module on Delay",
        });
      }
      edges.push({
        id: `delay-mod:${d.address}:${m}`,
        from: id,
        to: `delay:${d.address}`,
        kind: "enables_module",
        label: "module on Delay",
      });
    }
  }

  for (const m of input.modules) {
    if (delaySet.has(m.address)) continue;
    const id = `module:${m.address}`;
    if (!nodes.some((n) => n.id === id)) {
      nodes.push({
        id,
        kind: m.looksLikeRolesProxy ? "roles" : "module",
        address: m.address,
        label: m.looksLikeRolesProxy ? "Roles-like module" : "Safe module",
      });
    }
    edges.push({
      id: `direct:${m.address}`,
      from: id,
      to: `safe:${input.safe.address}`,
      kind: "direct_module_path",
      label: "direct module path (does not require Delay)",
    });
    edges.push({
      id: `safe-enables:${m.address}`,
      from: `safe:${input.safe.address}`,
      to: id,
      kind: "enables_module",
    });
  }

  if (input.extraNodes) nodes.push(...input.extraNodes);
  if (input.extraEdges) edges.push(...input.extraEdges);

  return {
    nodes,
    edges,
    safe: input.safe,
    delays: input.delays,
    modules: input.modules,
  };
}

export function delayAddressesOnSafe(
  safe: SafeInventory,
  probes: ModuleProbe[],
): Hex[] {
  return probes.filter((p) => p.looksLikeDelay).map((p) => p.address);
}

/** Modules enabled on a Delay that are not also enabled directly on the Safe. */
export function rolesProbeCandidates(
  safeProbes: { address: Hex }[],
  delays: DelayInventory[],
): Hex[] {
  const seen = new Set(safeProbes.map((m) => m.address.toLowerCase()));
  const extra: Hex[] = [];
  for (const d of delays) {
    if (!d.looksLikeDelay) continue;
    for (const m of d.modules) {
      const address = m.toLowerCase();
      if (seen.has(address)) continue;
      seen.add(address);
      extra.push(address as Hex);
    }
  }
  return extra;
}
