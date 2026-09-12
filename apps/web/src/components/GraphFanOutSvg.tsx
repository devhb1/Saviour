"use client";

import type { FanOutProtocolChip } from "./StandardsRegistryPanel";

function statusFill(status: string): string {
  if (status === "ok") return "var(--signal)";
  if (status === "empty") return "var(--ink-faint)";
  if (status === "err" || status === "error") return "var(--block)";
  return "var(--ink-muted)";
}

/**
 * 1×8 live-status fan-out — one Messari template → eight deployments.
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
  const n = Math.max(protocols.length, 1);
  const width = featured ? (dense ? 520 : 640) : 560;
  const height = featured
    ? dense
      ? 128
      : 168
    : compact
      ? 64
      : 88;
  const hubX = featured ? (dense ? 40 : 52) : 36;
  const hubY = height / 2;
  const rightX = width - (featured ? (dense ? 100 : 120) : 28);
  const top = featured ? (dense ? 10 : 16) : compact ? 10 : 18;
  const bottom = height - (featured ? (dense ? 10 : 16) : compact ? 10 : 18);
  const span = n <= 1 ? 0 : bottom - top;
  const list: FanOutProtocolChip[] = protocols.length
    ? protocols
    : Array.from({ length: 8 }, (_, i) => ({
        protocol: `slot-${i}`,
        status: "pending",
        ms: 0,
        rowCount: 0,
      }));

  return (
    <div
      style={{
        marginTop: 0,
        marginBottom: compact ? 6 : 0,
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
          : compact
            ? "6px 8px"
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
          minWidth: featured ? (dense ? 280 : 360) : compact ? 280 : 320,
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
      {!compact || featured ? (
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
      ) : null}
    </div>
  );
}
