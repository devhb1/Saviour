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
 * SourceMark-style 3-column system board — Consumers | Gate | Sources.
 * HTML/CSS (not Mermaid) so judges see it live in-app.
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
        marginTop: compact ? 24 : 36,
        padding: compact ? "18px 16px" : "22px 20px",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-md, 8px)",
        background: "var(--bg-raise)",
      }}
    >
      <h3
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: compact ? 18 : 22,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "var(--tx-hi)",
        }}
      >
        {FLOW_BOARD_TITLE}
      </h3>
      <p
        style={{
          margin: "6px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--tx-lo)",
          letterSpacing: "0.02em",
        }}
      >
        {FLOW_BOARD_SUB}
      </p>

      <div className="flow-board-grid" style={cols}>
        <div>
          <p style={colEyebrow}>CONSUMERS · $0 forever</p>
          <ul style={stack}>
            {FLOW_CONSUMERS.map((c) => (
              <li key={c.title} style={box}>
                <strong style={boxTitle}>{c.title}</strong>
                <span style={boxDetail}>{c.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          style={{
            padding: "12px 12px 14px",
            border: "1px solid color-mix(in srgb, var(--sig) 35%, var(--line))",
            borderRadius: "var(--radius-md, 8px)",
            background:
              "color-mix(in srgb, var(--sig) 6%, var(--bg-inset))",
          }}
        >
          <p style={{ ...colEyebrow, color: "var(--sig)" }}>SAVIOURS</p>
          <ol style={{ margin: "8px 0 0", padding: 0, listStyle: "none" }}>
            {FLOW_GATE_STEPS.map((s) => (
              <li
                key={s.n}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  marginTop: s.n === 1 ? 0 : 8,
                }}
              >
                <span
                  style={{
                    flex: "0 0 22px",
                    height: 22,
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: 600,
                    background: "color-mix(in srgb, var(--safe) 25%, transparent)",
                    color: "var(--safe, var(--green))",
                    border: "1px solid color-mix(in srgb, var(--safe) 40%, transparent)",
                  }}
                >
                  {s.n}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    lineHeight: 1.4,
                    color: "var(--tx)",
                    paddingTop: 2,
                  }}
                >
                  {s.text}
                </span>
              </li>
            ))}
          </ol>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={diamond}>Named?</span>
            <span style={pathYes}>YES → HIT · $0</span>
            <span style={pathNo}>NO → pay · investigate</span>
          </div>
        </div>

        <div>
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

      <p
        style={{
          margin: "16px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--tx-lo)",
          lineHeight: 1.45,
        }}
      >
        {MEMORY_FOOTER}
      </p>

      <style>{`
        @media (max-width: 900px) {
          .flow-board-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </aside>
  );
}

const cols: CSSProperties = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.3fr) minmax(0, 0.9fr)",
  gap: 14,
  alignItems: "start",
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
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "var(--bg-inset)",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const boxTitle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--tx-hi)",
};

const boxDetail: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--tx-lo)",
  lineHeight: 1.35,
};

const diamond: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 600,
  padding: "6px 10px",
  border: "1px solid var(--line-mid, var(--line))",
  borderRadius: 4,
  color: "var(--tx-hi)",
  transform: "rotate(0deg)",
};

const pathYes: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid color-mix(in srgb, var(--safe) 45%, var(--line))",
  color: "var(--safe, var(--green))",
  background: "color-mix(in srgb, var(--safe) 12%, transparent)",
};

const pathNo: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid color-mix(in srgb, var(--violet, #8b7cf6) 45%, var(--line))",
  color: "var(--violet, #a89bff)",
  background: "color-mix(in srgb, var(--violet, #8b7cf6) 12%, transparent)",
};
