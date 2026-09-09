"use client";

/**
 * Evidence provenance graph — React Flow.
 * Highlighted animated edges = same txHash across ≥2 protocols (atomic shape).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  buildProvenanceGraph,
  type ProvenanceEvidence,
  type ProvenanceNodeData,
} from "./provenanceBuild";

type Props = {
  address: string;
  evidence: ProvenanceEvidence[];
  height?: number;
  /** MiniMap adds noise in the Case rail — off by default. */
  showMiniMap?: boolean;
};

function DetailPanel({
  data,
  onClose,
}: {
  data: ProvenanceNodeData;
  onClose: () => void;
}) {
  return (
    <aside
      className="rise"
      style={{
        position: "absolute",
        right: 12,
        top: 12,
        bottom: 12,
        width: 280,
        zIndex: 10,
        overflow: "auto",
        padding: 14,
        background: "rgba(243, 246, 243, 0.96)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "start",
          gap: 8,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: data.atomic ? "var(--signal)" : "var(--ink-muted)",
          }}
        >
          {data.kind === "subject"
            ? "Subject"
            : data.atomic
              ? "Atomic event"
              : "Evidence"}
        </p>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--ink-muted)",
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      <p
        style={{
          margin: "10px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          wordBreak: "break-all",
        }}
      >
        {data.label}
      </p>
      {data.claim ? (
        <p style={{ margin: "12px 0 0", color: "var(--ink)" }}>{data.claim}</p>
      ) : null}
      {data.protocol ? (
        <p style={{ margin: "8px 0 0", color: "var(--ink-muted)" }}>
          protocol · {data.protocol}
          {data.evidenceKind ? ` · ${data.evidenceKind}` : ""}
        </p>
      ) : null}
      {data.subgraphId ? (
        <p
          style={{
            margin: "8px 0 0",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-muted)",
            wordBreak: "break-all",
          }}
        >
          subgraph · {data.subgraphId}
        </p>
      ) : null}
      {data.txHash ? (
        <p
          style={{
            margin: "8px 0 0",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            wordBreak: "break-all",
          }}
        >
          tx · {data.txHash}
        </p>
      ) : null}
      {typeof data.amountUSD === "number" ? (
        <p style={{ margin: "8px 0 0", color: "var(--ink-muted)" }}>
          ≈ ${data.amountUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
      ) : null}
      {data.etherscan ? (
        <a
          href={data.etherscan}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-block",
            marginTop: 14,
            color: "var(--signal)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}
        >
          Open Etherscan →
        </a>
      ) : null}
    </aside>
  );
}

function GraphInner({
  address,
  evidence,
  height = 420,
  showMiniMap = false,
}: Props) {
  const built = useMemo(
    () => buildProvenanceGraph(address, evidence),
    [address, evidence],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(
    built.nodes as Node[],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    built.edges as Edge[],
  );
  const [selected, setSelected] = useState<ProvenanceNodeData | null>(null);

  useEffect(() => {
    setNodes(built.nodes as Node[]);
    setEdges(built.edges as Edge[]);
    setSelected(null);
  }, [built, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_: MouseEvent, node: Node) => {
      setSelected(node.data as ProvenanceNodeData);
    },
    [],
  );

  const wrap: CSSProperties = {
    position: "relative",
    height,
    width: "100%",
    border: "1px solid var(--line)",
    borderRadius: 4,
    background: "rgba(243,246,243,0.85)",
    overflow: "hidden",
  };

  if (!evidence.length) {
    return (
      <div style={{ ...wrap, display: "grid", placeItems: "center" }}>
        <p style={{ color: "var(--ink-muted)", fontSize: 14 }}>
          No evidence rows to graph.
        </p>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.25}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} color="rgba(14,18,16,0.06)" />
        <Controls
          showInteractive={false}
          position="bottom-left"
          style={{
            border: "1px solid var(--line)",
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: "none",
          }}
        />
        {showMiniMap ? (
          <MiniMap
            pannable
            zoomable
            style={{
              background: "rgba(232,238,233,0.95)",
              border: "1px solid var(--line)",
              borderRadius: 4,
            }}
          />
        ) : null}
      </ReactFlow>
      {selected ? (
        <DetailPanel data={selected} onClose={() => setSelected(null)} />
      ) : null}
      <p
        style={{
          position: "absolute",
          left: 12,
          bottom: 10,
          margin: 0,
          zIndex: 5,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-muted)",
          background: "rgba(243,246,243,0.92)",
          padding: "4px 8px",
          borderRadius: 2,
          border: "1px solid var(--line)",
        }}
      >
        {built.atomicTxCount} same-tx multi-protocol
        {built.atomicTxCount > 0 ? " · green edges = atomic" : ""}
      </p>
    </div>
  );
}

export function ProvenanceGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}

export type { ProvenanceEvidence };
