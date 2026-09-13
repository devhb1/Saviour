"use client";

import type { CSSProperties } from "react";

/** Under-the-hood visuals for Home / Live / Build — no mermaid runtime. */
export function UnderHoodDiagrams({
  focus = "all",
}: {
  focus?: "all" | "agent" | "graph" | "ens";
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns:
          focus === "all" ? "repeat(auto-fit, minmax(280px, 1fr))" : "1fr",
      }}
    >
      {focus === "all" || focus === "agent" ? <AgentBazanticFlow /> : null}
      {focus === "all" || focus === "graph" ? <GraphFanOutStatic /> : null}
      {focus === "all" || focus === "ens" ? <CodeDecidesFlow /> : null}
    </div>
  );
}

function AgentBazanticFlow() {
  return (
    <figure style={card}>
      <figcaption style={cap}>BAZANTIC · AGENT PAY PATH</figcaption>
      <ol style={steps}>
        <li>
          Agent → <code>shieldCheck</code> via Bazantic
        </li>
        <li>
          SAVIOURS → ENS <code>saviours.status</code>
        </li>
        <li>
          <strong style={{ color: "var(--signal)" }}>MEMORY HIT</strong> → BLOCK/WARN ·{" "}
          <strong>$0</strong> · Graph finding kept in ENS
        </li>
        <li>
          <strong style={{ color: "var(--warn)" }}>MISS</strong> → HTTP 402 → pay $0.01
          USDC → investigate (Graph ×8) → name if WATCH/TAINTED
        </li>
      </ol>
      <p style={foot}>
        Shield free forever. Investigate metered. Never charge the hit.
      </p>
    </figure>
  );
}

function GraphFanOutStatic() {
  const protos = [
    "Aave",
    "Compound",
    "Spark",
    "Maker",
    "Uniswap",
    "Sushi",
    "Curve",
    "Yearn",
  ];
  return (
    <figure style={card}>
      <figcaption style={cap}>GRAPH · 1 TEMPLATE × 8 DEPLOYMENTS</figcaption>
      <div
        style={{
          marginTop: 12,
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center",
        }}
      >
        <span style={hub}>Messari template</span>
        <span style={{ color: "var(--ink-muted)", fontFamily: "var(--font-mono)" }}>
          →
        </span>
        {protos.map((p) => (
          <span key={p} style={proto}>
            {p}
          </span>
        ))}
        <span style={proto}>+ Adapter A</span>
      </div>
      <p style={foot}>
        Shared <code>hash</code> → ATOMIC_MULTI_PROTOCOL. AI cites only; code decides.
      </p>
    </figure>
  );
}

function CodeDecidesFlow() {
  return (
    <figure style={card}>
      <figcaption style={cap}>ENS · CODE DECIDES</figcaption>
      <p style={{ ...foot, marginTop: 12 }}>
        Graph evidence → deterministic rules → AI explains (cites only) →{" "}
        <code>validateAssessment</code> → name WATCH/TAINTED on{" "}
        <code>&lt;addr&gt;.saviours.eth</code> · never name SAFE/UNKNOWN
      </p>
      <p style={foot}>
        AI cannot invent TAINTED. Cast proves memory without our server.
      </p>
    </figure>
  );
}

const card: CSSProperties = {
  margin: 0,
  padding: "16px 18px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  background: "var(--surface)",
};

const cap: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.1em",
  color: "var(--signal)",
};

const steps: CSSProperties = {
  margin: "12px 0 0",
  paddingLeft: 18,
  fontSize: 13,
  color: "var(--ink-muted)",
  lineHeight: 1.55,
};

const foot: CSSProperties = {
  margin: "12px 0 0",
  fontSize: 12,
  color: "var(--ink-muted)",
  lineHeight: 1.5,
};

const hub: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  padding: "5px 10px",
  border: "1px solid var(--signal)",
  color: "var(--signal)",
  borderRadius: 2,
};

const proto: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  padding: "4px 8px",
  border: "1px solid var(--line)",
  color: "var(--ink)",
  borderRadius: 2,
};
