/**
 * Build React Flow nodes/edges from live Evidence.
 * Same-tx multi-protocol links become highlighted "atomic" edges.
 */

export type ProvenanceEvidence = {
  id: string;
  source: string;
  claim: string;
  protocol?: string;
  kind?: string;
  txHash?: string;
  subgraphId?: string;
  amountUSD?: number;
  timestamp: number;
  counterparty?: string;
};

export type ProvenanceNodeData = {
  label: string;
  kind: "subject" | "event";
  protocol?: string;
  evidenceKind?: string;
  txHash?: string;
  claim?: string;
  subgraphId?: string;
  amountUSD?: number;
  atomic: boolean;
  etherscan?: string;
};

export type ProvenanceEdgeData = {
  atomic: boolean;
  txHash?: string;
  label?: string;
};

export type RFNode = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: ProvenanceNodeData;
  style?: Record<string, string | number>;
};

export type RFEdge = {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  label?: string;
  style?: Record<string, string | number>;
  data?: ProvenanceEdgeData;
};

const MAX_EVENT_NODES = 16;

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function shortTx(tx: string): string {
  return `${tx.slice(0, 10)}…`;
}

/** txHash → evidence rows sharing that hash */
export function groupByTx(
  evidence: ProvenanceEvidence[],
): Map<string, ProvenanceEvidence[]> {
  const map = new Map<string, ProvenanceEvidence[]>();
  for (const e of evidence) {
    if (!e.txHash) continue;
    const t = e.txHash.toLowerCase();
    const list = map.get(t) ?? [];
    list.push(e);
    map.set(t, list);
  }
  return map;
}

/** Same-tx groups spanning ≥2 distinct protocols (ATOMIC_MULTI_PROTOCOL shape). */
export function atomicTxGroups(
  evidence: ProvenanceEvidence[],
): Map<string, ProvenanceEvidence[]> {
  const out = new Map<string, ProvenanceEvidence[]>();
  for (const [tx, rows] of groupByTx(evidence)) {
    const protocols = new Set(
      rows.map((r) => r.protocol).filter((p): p is string => Boolean(p)),
    );
    if (protocols.size >= 2) out.set(tx, rows);
  }
  return out;
}

export type AtomicHero = {
  txHash: string;
  protocols: string[];
  rows: ProvenanceEvidence[];
  amountUSD: number;
  hasFlashloan: boolean;
};

/** Strongest same-tx multi-protocol edge for HeroAtomicCard. */
export function strongestAtomicHero(
  evidence: ProvenanceEvidence[],
): AtomicHero | null {
  let best: AtomicHero | null = null;
  for (const [txHash, rows] of atomicTxGroups(evidence)) {
    const protocols = [
      ...new Set(
        rows.map((r) => r.protocol).filter((p): p is string => Boolean(p)),
      ),
    ].sort();
    const amountUSD = rows.reduce((s, r) => s + (r.amountUSD ?? 0), 0);
    const hasFlashloan = rows.some((r) => r.kind === "flashloan");
    const score =
      protocols.length * 1_000_000 +
      (hasFlashloan ? 500_000 : 0) +
      amountUSD;
    const prev =
      best == null
        ? -1
        : best.protocols.length * 1_000_000 +
          (best.hasFlashloan ? 500_000 : 0) +
          best.amountUSD;
    if (score > prev) {
      best = { txHash, protocols, rows, amountUSD, hasFlashloan };
    }
  }
  return best;
}

export type TimelineStep = {
  evidenceId: string;
  protocol: string;
  kind: string;
  claim: string;
  amountUSD?: number;
  timestamp: number;
};

/** Ordered steps for one atomic tx — never invents rows not in evidence. */
export function buildAttackTimeline(
  hero: AtomicHero | null,
): TimelineStep[] {
  if (!hero) return [];
  const steps = hero.rows
    .filter((r) => r.protocol || r.kind)
    .map((r) => ({
      evidenceId: r.id,
      protocol: r.protocol ?? "unknown",
      kind: r.kind ?? "event",
      claim: r.claim,
      amountUSD: r.amountUSD,
      timestamp: r.timestamp,
    }));
  // Flashloan first, then by amount desc, then protocol name
  steps.sort((a, b) => {
    const aFl = a.kind === "flashloan" ? 0 : 1;
    const bFl = b.kind === "flashloan" ? 0 : 1;
    if (aFl !== bFl) return aFl - bFl;
    if ((b.amountUSD ?? 0) !== (a.amountUSD ?? 0)) {
      return (b.amountUSD ?? 0) - (a.amountUSD ?? 0);
    }
    return a.protocol.localeCompare(b.protocol);
  });
  return steps;
}

/** Short plain verdict for ENS text (≤120 chars). */
export function plainVerdictFromSignals(
  signals: { id: string; detail: string }[],
  status: string,
): string {
  const ids = new Set(signals.map((s) => s.id));
  if (ids.has("FLASHLOAN_ONE_SHOT") && ids.has("ATOMIC_MULTI_PROTOCOL")) {
    return "Flashloan-funded same-tx multi-protocol drain (TAINTED)";
  }
  if (ids.has("BOT_PROFILE")) {
    return "High flashloan volume · bot-like · WATCH not TAINTED";
  }
  if (ids.has("REGISTRY_COOCCURRENCE")) {
    return "Shared Graph counterparty with named threat";
  }
  if (status === "TAINTED") return "Threat verified from Graph signals";
  if (status === "WATCH") return "Under watch — signals insufficient for TAINTED";
  return status;
}

export function buildProvenanceGraph(
  subjectAddress: string,
  evidence: ProvenanceEvidence[],
): { nodes: RFNode[]; edges: RFEdge[]; atomicTxCount: number } {
  const subject = subjectAddress.toLowerCase();
  const atomic = atomicTxGroups(evidence);
  const atomicIds = new Set<string>();
  for (const rows of atomic.values()) {
    for (const r of rows) atomicIds.add(r.id);
  }

  // Prefer atomic events, then flashloans/swaps, then the rest
  const ranked = [...evidence].sort((a, b) => {
    const aA = atomicIds.has(a.id) ? 0 : 1;
    const bA = atomicIds.has(b.id) ? 0 : 1;
    if (aA !== bA) return aA - bA;
    const aFl = a.kind === "flashloan" || a.kind === "swap" ? 0 : 1;
    const bFl = b.kind === "flashloan" || b.kind === "swap" ? 0 : 1;
    if (aFl !== bFl) return aFl - bFl;
    return (b.amountUSD ?? 0) - (a.amountUSD ?? 0);
  });

  // When same-tx multi-protocol edges exist, graph only that path (film clarity).
  const pool =
    atomic.size > 0 ? ranked.filter((e) => atomicIds.has(e.id)) : ranked;
  const picked = pool.slice(0, MAX_EVENT_NODES);
  const pickedIds = new Set(picked.map((e) => e.id));

  const nodes: RFNode[] = [
    {
      id: "subject",
      position: { x: 0, y: 0 },
      data: {
        label: shortAddr(subject),
        kind: "subject",
        atomic: false,
        claim: subject,
        etherscan: `https://etherscan.io/address/${subject}`,
      },
      style: {
        background: "var(--ink)",
        color: "var(--paper)",
        border: "none",
        borderRadius: 4,
        padding: 10,
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        fontWeight: 600,
        minWidth: 120,
        textAlign: "center",
      },
    },
  ];

  const n = Math.max(picked.length, 1);
  picked.forEach((e, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const radius = atomicIds.has(e.id) ? 220 : 320;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const isAtomic = atomicIds.has(e.id);
    const label = [
      e.protocol ?? e.kind ?? "event",
      e.kind && e.protocol ? e.kind : null,
    ]
      .filter(Boolean)
      .join(" · ");

    nodes.push({
      id: e.id,
      position: { x, y },
      data: {
        label,
        kind: "event",
        protocol: e.protocol,
        evidenceKind: e.kind,
        txHash: e.txHash,
        claim: e.claim,
        subgraphId: e.subgraphId,
        amountUSD: e.amountUSD,
        atomic: isAtomic,
        etherscan: e.txHash
          ? `https://etherscan.io/tx/${e.txHash}`
          : undefined,
      },
      style: {
        background: isAtomic ? "var(--sig-wash)" : "var(--bg-high)",
        color: "var(--ink)",
        border: isAtomic
          ? "2px solid var(--signal)"
          : "1px solid var(--line)",
        borderRadius: 4,
        padding: 8,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        maxWidth: 160,
        textAlign: "center",
      },
    });
  });

  const edges: RFEdge[] = [];

  // Subject → each event
  for (const e of picked) {
    edges.push({
      id: `s-${e.id}`,
      source: "subject",
      target: e.id,
      style: {
        stroke: "var(--line)",
        strokeWidth: 1,
      },
      data: { atomic: false },
    });
  }

  // Same-tx atomic edges between protocols in a shared tx
  let atomicEdge = 0;
  for (const [tx, rows] of atomic) {
    const inGraph = rows.filter((r) => pickedIds.has(r.id));
    for (let i = 0; i < inGraph.length; i += 1) {
      for (let j = i + 1; j < inGraph.length; j += 1) {
        const a = inGraph[i]!;
        const b = inGraph[j]!;
        if (a.protocol && b.protocol && a.protocol === b.protocol) continue;
        atomicEdge += 1;
        edges.push({
          id: `atomic-${tx.slice(2, 10)}-${atomicEdge}`,
          source: a.id,
          target: b.id,
          animated: true,
          label: shortTx(tx),
          style: {
            stroke: "var(--signal)",
            strokeWidth: 2.5,
          },
          data: {
            atomic: true,
            txHash: tx,
            label: "same tx",
          },
        });
      }
    }
  }

  return { nodes, edges, atomicTxCount: atomic.size };
}
