/**
 * Gate: live ATTACK-1 evidence → provenance graph has same-tx atomic edges.
 *
 *   pnpm check:provenance
 */

import { getEvidenceBundle } from "../packages/core/src/evidence/getEvidence";
import { loadRootEnv } from "../packages/core/src/config/env";
import {
  atomicTxGroups,
  buildProvenanceGraph,
} from "../apps/web/src/components/provenanceBuild";

loadRootEnv();

const ATTACK_1 = "0x935bfb495e33f74d2e9735df1da66ace442ede48";

async function main() {
  console.log("check:provenance — ATTACK-1 live Graph → same-tx edges\n");

  const bundle = await getEvidenceBundle(1, ATTACK_1, {
    bypassCache: true,
    skipCooccurrence: true,
  });

  const rows = bundle.evidence.map((e) => ({
    id: e.id,
    source: e.source,
    claim: e.claim,
    protocol: e.protocol,
    kind: e.kind,
    txHash: e.txHash,
    subgraphId: e.subgraphId,
    amountUSD: e.amountUSD,
    timestamp: e.timestamp,
    counterparty: e.counterparty,
  }));

  const atomic = atomicTxGroups(rows);
  console.log("evidence", rows.length);
  console.log("banner", bundle.banner);
  console.log("same-tx multi-protocol txs", atomic.size);

  if (atomic.size < 1) {
    throw new Error("ATTACK-1 expected ≥1 atomic same-tx group from live Graph");
  }

  const sampleTx = [...atomic.keys()][0]!;
  const sampleRows = atomic.get(sampleTx)!;
  console.log(
    "sample",
    sampleTx.slice(0, 18) + "…",
    sampleRows.map((r) => `${r.protocol}/${r.kind}`).join(" + "),
  );

  const graph = buildProvenanceGraph(ATTACK_1, rows);
  const atomicEdges = graph.edges.filter((e) => e.data?.atomic);
  console.log(
    "graph nodes",
    graph.nodes.length,
    "atomic edges",
    atomicEdges.length,
  );

  if (graph.atomicTxCount < 1 || atomicEdges.length < 1) {
    throw new Error("Provenance graph missing highlighted atomic edges");
  }

  console.log("\nok: check:provenance (ATTACK-1 same-tx edges)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
