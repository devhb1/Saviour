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
}: {
  protocols: FanOutProtocolChip[];
  compact?: boolean;
}) {
  const n = Math.max(protocols.length, 1);
  const width = 560;
  const height = compact ? 64 : 88;
  const hubX = 36;
  const hubY = height / 2;
  const rightX = width - 28;
  const top = compact ? 10 : 18;
  const bottom = height - (compact ? 10 : 18);
  const span = n <= 1 ? 0 : bottom - top;

  return (
    <div
      style={{
        marginTop: compact ? 0 : 12,
        marginBottom: compact ? 6 : 4,
        overflow: "auto",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--line)",
        background: "color-mix(in srgb, var(--paper-deep) 55%, var(--surface))",
        padding: compact ? "6px 8px" : "8px 10px",
      }}
      aria-label="Graph fan-out live status"
    >
      <p
        style={{
          margin: "0 0 4px",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.08em",
          color: "var(--ink-muted)",
        }}
      >
        1 TEMPLATE → {protocols.length || 8} DEPLOYMENTS · LIVE
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        style={{ display: "block", minWidth: compact ? 280 : 320 }}
      >
        <circle
          cx={hubX}
          cy={hubY}
          r={10}
          fill="var(--signal)"
          opacity={0.9}
        />
        <text
          x={hubX}
          y={hubY + 28}
          textAnchor="middle"
          fill="var(--ink-muted)"
          fontSize={9}
          fontFamily="var(--font-mono)"
        >
          Messari
        </text>
        {protocols.map((p, i) => {
          const y = n === 1 ? hubY : top + (span * i) / (n - 1);
          const fill = statusFill(p.status);
          return (
            <g key={p.protocol}>
              <line
                x1={hubX + 10}
                y1={hubY}
                x2={rightX - 14}
                y2={y}
                stroke="var(--line)"
                strokeWidth={1}
              />
              <circle cx={rightX} cy={y} r={6} fill={fill} />
              <text
                x={rightX - 14}
                y={y + 3}
                textAnchor="end"
                fill="var(--ink)"
                fontSize={9}
                fontFamily="var(--font-mono)"
              >
                {p.protocol}
              </text>
            </g>
          );
        })}
      </svg>
      {!compact ? (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginTop: 4,
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
