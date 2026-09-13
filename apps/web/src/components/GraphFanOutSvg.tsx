"use client";

import type { CSSProperties } from "react";
import type { FanOutProtocolChip } from "./StandardsRegistryPanel";

function statusFill(status: string): string {
  if (status === "ok") return "var(--signal)";
  if (status === "empty") return "var(--ink-faint)";
  if (status === "err" || status === "error") return "var(--block)";
  return "var(--ink-muted)";
}

function statusLabel(status: string): string {
  if (status === "ok") return "ok";
  if (status === "empty") return "empty";
  if (status === "err" || status === "error") return "err";
  if (status === "pending") return "…";
  return status;
}

/**
 * 1×8 live-status fan-out — one Messari template → eight deployments.
 * Compact = tall readable column (Loop / Naming), not a crushed 64px strip.
 */
export function GraphFanOutSvg({
  protocols,
  compact = false,
  featured = false,
  dense = false,
}: {
  protocols: FanOutProtocolChip[];
  compact?: boolean;
  /** Diagram for Playground Graph sell. */
  featured?: boolean;
  /** Shorter featured diagram for above-the-fold density. */
  dense?: boolean;
}) {
  const list: FanOutProtocolChip[] = protocols.length
    ? protocols
    : Array.from({ length: 8 }, (_, i) => ({
        protocol: `slot-${i}`,
        status: "pending",
        ms: 0,
        rowCount: 0,
      }));
  const n = Math.max(list.length, 1);

  // Compact column: CSS list — labels never collide, fills the Loop split pane.
  if (compact && !featured) {
    return (
      <div style={compactWrap} aria-label="Graph fan-out live status">
        <p style={eyebrow}>1 TEMPLATE → {list.length} DEPLOYMENTS · LIVE</p>
        <div style={compactBody}>
          <div style={hubCol}>
            <span style={hubDot} aria-hidden />
            <span style={hubLabel}>Messari</span>
          </div>
          <div style={fanLines} aria-hidden>
            {list.map((_, i) => (
              <span
                key={`ray-${i}`}
                style={{
                  ...ray,
                  top: `${((i + 0.5) / n) * 100}%`,
                }}
              />
            ))}
          </div>
          <ul style={protoList}>
            {list.map((p) => {
              const fill = statusFill(p.status);
              const ms =
                typeof p.ms === "number" && p.ms > 0 ? `${p.ms}ms` : "";
              const rows =
                typeof p.rowCount === "number" ? `${p.rowCount}r` : "";
              const meta = [ms, rows].filter(Boolean).join(" · ");
              return (
                <li key={p.protocol} style={protoRow}>
                  <span
                    style={{ ...protoDot, background: fill }}
                    title={statusLabel(p.status)}
                  />
                  <span style={protoName}>{p.protocol}</span>
                  <span style={protoMeta}>
                    {meta || statusLabel(p.status)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div style={legend}>
          <span>
            <span style={{ color: "var(--signal)" }}>●</span> ok
          </span>
          <span>
            <span style={{ color: "var(--ink-faint)" }}>●</span> empty
          </span>
          <span>
            <span style={{ color: "var(--block)" }}>●</span> err
          </span>
        </div>
      </div>
    );
  }

  const width = featured ? (dense ? 520 : 640) : 560;
  const height = featured ? (dense ? 128 : 168) : 100;
  const hubX = featured ? (dense ? 40 : 52) : 36;
  const hubY = height / 2;
  const rightX = width - (featured ? (dense ? 100 : 120) : 28);
  const top = featured ? (dense ? 10 : 16) : 14;
  const bottom = height - (featured ? (dense ? 10 : 16) : 14);
  const span = n <= 1 ? 0 : bottom - top;

  return (
    <div
      style={{
        marginTop: 0,
        marginBottom: 0,
        overflow: "auto",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--sig-line)",
        background: featured
          ? "var(--bg-high)"
          : "color-mix(in srgb, var(--paper-deep) 55%, var(--surface))",
        padding: featured
          ? dense
            ? "8px 10px"
            : "12px 14px"
          : "8px 10px",
        boxShadow: featured ? "var(--edge)" : undefined,
      }}
      aria-label="Graph fan-out live status"
    >
      <p
        style={{
          margin: dense ? "0 0 4px" : "0 0 8px",
          fontFamily: "var(--font-mono)",
          fontSize: featured && !dense ? 11 : 10,
          letterSpacing: "0.08em",
          color: "var(--sig)",
        }}
      >
        1 TEMPLATE → {protocols.length || 8} DEPLOYMENTS · LIVE
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        style={{
          display: "block",
          minWidth: featured ? (dense ? 280 : 360) : 320,
        }}
      >
        <circle
          cx={hubX}
          cy={hubY}
          r={featured ? (dense ? 11 : 14) : 10}
          fill="var(--signal)"
          opacity={0.95}
        />
        <text
          x={hubX}
          y={hubY + (featured ? (dense ? 26 : 32) : 28)}
          textAnchor="middle"
          fill="var(--ink-muted)"
          fontSize={featured && !dense ? 11 : 9}
          fontFamily="var(--font-mono)"
        >
          Messari
        </text>
        {list.map((p, i) => {
          const y = n === 1 ? hubY : top + (span * i) / Math.max(n - 1, 1);
          const fill = statusFill(p.status);
          const ms =
            typeof p.ms === "number" && p.ms > 0 ? `${p.ms}ms` : "";
          const rows =
            typeof p.rowCount === "number" ? `${p.rowCount}r` : "";
          const meta = [ms, rows].filter(Boolean).join(" · ");
          const hubR = featured ? (dense ? 11 : 14) : 10;
          return (
            <g key={`${p.protocol}-${i}`}>
              <line
                x1={hubX + hubR}
                y1={hubY}
                x2={rightX - (featured ? 8 : 14)}
                y2={y}
                stroke="var(--line-mid)"
                strokeWidth={1.25}
              />
              <circle
                cx={rightX}
                cy={y}
                r={featured ? (dense ? 5 : 7) : 6}
                fill={fill}
              />
              <text
                x={featured ? rightX + 10 : rightX - 14}
                y={y + 3}
                textAnchor={featured ? "start" : "end"}
                fill="var(--ink)"
                fontSize={featured && !dense ? 10 : 9}
                fontFamily="var(--font-mono)"
              >
                {p.protocol}
                {featured && meta ? `  ${meta}` : ""}
              </text>
            </g>
          );
        })}
      </svg>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: dense ? 8 : 10,
          marginTop: dense ? 4 : 8,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--ink-muted)",
        }}
      >
        <span>
          <span style={{ color: "var(--signal)" }}>●</span> ok
        </span>
        <span>
          <span style={{ color: "var(--ink-faint)" }}>●</span> empty
        </span>
        <span>
          <span style={{ color: "var(--block)" }}>●</span> err
        </span>
      </div>
    </div>
  );
}

const compactWrap: CSSProperties = {
  height: "100%",
  minHeight: 168,
  display: "flex",
  flexDirection: "column",
  margin: 0,
  padding: "8px 10px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--sig-line)",
  background: "color-mix(in srgb, var(--paper-deep) 55%, var(--surface))",
  boxSizing: "border-box",
};

const eyebrow: CSSProperties = {
  margin: "0 0 8px",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.08em",
  color: "var(--sig)",
};

const compactBody: CSSProperties = {
  flex: 1,
  display: "grid",
  gridTemplateColumns: "52px 16px 1fr",
  gap: 0,
  alignItems: "stretch",
  minHeight: 0,
};

const hubCol: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};

const hubDot: CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 999,
  background: "var(--signal)",
  boxShadow: "0 0 0 3px color-mix(in srgb, var(--signal) 22%, transparent)",
  flexShrink: 0,
};

const hubLabel: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  color: "var(--ink-muted)",
  letterSpacing: "0.02em",
};

const fanLines: CSSProperties = {
  position: "relative",
  minHeight: 120,
};

const ray: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  height: 1,
  background:
    "linear-gradient(90deg, color-mix(in srgb, var(--signal) 55%, transparent), var(--line-mid))",
  transform: "translateY(-50%)",
};

const protoList: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: 2,
  minHeight: 120,
};

const protoRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "10px minmax(0, 1fr) auto",
  gap: 6,
  alignItems: "center",
  minHeight: 16,
};

const protoDot: CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: 999,
  flexShrink: 0,
};

const protoName: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const protoMeta: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "var(--ink-muted)",
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
};

const legend: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 8,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "var(--ink-muted)",
};
