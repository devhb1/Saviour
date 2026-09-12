"use client";

import type { CSSProperties } from "react";
import {
  FLOW_BOARD_SUB,
  FLOW_BOARD_TITLE,
  FLOW_CONSUMERS,
  FLOW_GATE_STEPS,
  FLOW_SOURCES,
  MEMORY_FOOTER,
} from "../lib/productStory";

/**
 * SourceMark-class 3-column system board — Consumers | Gate | Sources.
 */
export function SystemFlowBoard({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <aside
      aria-label="Saviours system flow"
      style={{
        marginTop: compact ? 18 : 28,
        padding: 0,
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-md, 8px)",
        background: "var(--bg-raise)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: compact ? "14px 16px 10px" : "18px 18px 12px" }}>
        <h3
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: compact ? 17 : 20,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--tx-hi)",
          }}
        >
          {FLOW_BOARD_TITLE}
        </h3>
        <p
          style={{
            margin: "4px 0 0",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--tx-lo)",
            letterSpacing: "0.02em",
          }}
        >
          {FLOW_BOARD_SUB}
        </p>
      </div>

      <div className="flow-board-grid" style={cols}>
        <div style={colPad}>
          <p style={colEyebrow}>CONSUMERS · $0 forever</p>
          <ul style={stack}>
            {FLOW_CONSUMERS.map((c, i) => (
              <li key={c.title} style={{ ...box, position: "relative" }}>
                <strong style={boxTitle}>{c.title}</strong>
                <span style={boxDetail}>{c.detail}</span>
                {i < FLOW_CONSUMERS.length - 1 ? null : (
                  <span className="flow-arrow-h" aria-hidden style={arrowHint}>
                    →
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div style={gateWrap}>
          <p style={{ ...colEyebrow, color: "var(--sig)" }}>SAVIOURS GATEWAY</p>
          <ol style={{ margin: "8px 0 0", padding: 0, listStyle: "none" }}>
            {FLOW_GATE_STEPS.slice(0, 4).map((s) => (
              <li key={s.n} style={stepRow}>
                <span style={stepDisc}>{s.n}</span>
                <span style={stepText}>{s.text}</span>
              </li>
            ))}
          </ol>

          <div style={decisionRow}>
            <span style={diamond}>Named?</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <span style={pathYes}>YES → HIT · BLOCK/WARN · $0</span>
              <span style={pathNo}>NO → 402 · agent pays · investigate</span>
            </div>
          </div>

          <ol style={{ margin: "10px 0 0", padding: 0, listStyle: "none" }}>
            {FLOW_GATE_STEPS.slice(4).map((s) => (
              <li key={s.n} style={stepRow}>
                <span style={stepDisc}>{s.n}</span>
                <span style={stepText}>{s.text}</span>
              </li>
            ))}
          </ol>
        </div>

        <div style={colPad}>
          <p style={colEyebrow}>SOURCES / SETTLEMENT</p>
          <ul style={stack}>
            {FLOW_SOURCES.map((s) => (
              <li key={s.title} style={box}>
                <strong style={boxTitle}>{s.title}</strong>
                <span style={boxDetail}>{s.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p style={footerBar}>{MEMORY_FOOTER}</p>

      <style>{`
        @media (max-width: 900px) {
          .flow-board-grid {
            grid-template-columns: 1fr !important;
          }
          .flow-arrow-h { display: none !important; }
        }
      `}</style>
    </aside>
  );
}

const cols: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.4fr) minmax(0, 0.85fr)",
  gap: 0,
  borderTop: "1px solid var(--line)",
  alignItems: "stretch",
};

const colPad: CSSProperties = {
  padding: "12px 14px 16px",
  borderRight: "1px solid var(--line)",
};

const gateWrap: CSSProperties = {
  padding: "12px 14px 16px",
  borderRight: "1px solid var(--line)",
  background: "color-mix(in srgb, var(--sig) 5%, var(--bg-inset))",
};

const colEyebrow: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--tx-faint)",
};

const stack: CSSProperties = {
  margin: "10px 0 0",
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const box: CSSProperties = {
  padding: "9px 11px",
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "var(--surface, var(--bg-raise))",
  display: "flex",
  flexDirection: "column",
  gap: 3,
};

const boxTitle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: "var(--tx-hi)",
};

const boxDetail: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  color: "var(--tx-lo)",
  lineHeight: 1.35,
};

const arrowHint: CSSProperties = {
  position: "absolute",
  right: -18,
  top: "40%",
  color: "var(--tx-faint)",
  fontSize: 14,
  display: "none",
};

const stepRow: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  marginTop: 7,
};

const stepDisc: CSSProperties = {
  flex: "0 0 20px",
  height: 20,
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 600,
  background: "color-mix(in srgb, var(--safe) 22%, transparent)",
  color: "var(--safe, var(--green))",
  border: "1px solid color-mix(in srgb, var(--safe) 40%, transparent)",
};

const stepText: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.35,
  color: "var(--tx)",
  paddingTop: 1,
};

const decisionRow: CSSProperties = {
  marginTop: 12,
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};

const diamond: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 600,
  padding: "8px 10px",
  border: "1px solid var(--line-mid, var(--line))",
  color: "var(--tx-hi)",
  background: "var(--bg-raise)",
  clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  width: 72,
  height: 72,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  lineHeight: 1.15,
  flexShrink: 0,
};

const pathYes: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  padding: "5px 9px",
  borderRadius: 6,
  border: "1px solid color-mix(in srgb, var(--safe) 45%, var(--line))",
  color: "var(--safe, var(--green))",
  background: "color-mix(in srgb, var(--safe) 12%, transparent)",
};

const pathNo: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  padding: "5px 9px",
  borderRadius: 6,
  border: "1px solid color-mix(in srgb, var(--violet) 45%, var(--line))",
  color: "var(--violet)",
  background: "color-mix(in srgb, var(--violet) 12%, transparent)",
};

const footerBar: CSSProperties = {
  margin: 0,
  padding: "12px 16px",
  borderTop: "1px solid var(--line)",
  borderLeft: "3px solid var(--safe, var(--green))",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.02em",
  color: "var(--tx)",
  lineHeight: 1.4,
  background: "color-mix(in srgb, var(--safe) 6%, transparent)",
};
