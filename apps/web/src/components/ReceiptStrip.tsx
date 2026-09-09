"use client";

import type { CSSProperties } from "react";
import type { EncounterCost } from "../lib/receiptStore";

function fmtMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  return `${ms} ms`;
}

function fmtWhen(iso: string | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export type ReceiptStripProps = {
  mode: "first" | "memory" | "fresh";
  now: EncounterCost;
  first?: EncounterCost | null;
  forceFresh?: boolean;
};

/**
 * Hero cost comparison — the film WOW (V2 Part 0 §4 / F2).
 */
export function ReceiptStrip({ mode, now, first, forceFresh }: ReceiptStripProps) {
  const showCompare = mode === "memory" && first && first.graphQueries > 0;

  return (
    <div
      className="rise"
      style={{
        marginTop: 16,
        padding: "14px 16px",
        border: "1px solid var(--signal)",
        borderRadius: 4,
        background: "rgba(13,122,95,0.06)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          color: "var(--signal)",
        }}
      >
        COST RECEIPT
        {forceFresh ? " · forceFresh" : ""}
      </p>

      {showCompare ? (
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          <ReceiptCol
            title="First encounter"
            when={fmtWhen(first.at)}
            graph={first.graphQueries}
            ai={first.aiCalls}
            latencyMs={first.latencyMs}
            muted
          />
          <ReceiptCol
            title="This check"
            when="from memory"
            graph={now.graphQueries}
            ai={now.aiCalls}
            latencyMs={now.latencyMs}
            emphasize
          />
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          <ReceiptCol
            title={
              mode === "memory"
                ? "Resolved from memory"
                : mode === "fresh"
                  ? "Live investigation"
                  : "First encounter"
            }
            when={fmtWhen(now.at)}
            graph={now.graphQueries}
            ai={now.aiCalls}
            latencyMs={now.latencyMs}
            emphasize
          />
        </div>
      )}

      {mode === "memory" ? (
        <p
          style={{
            margin: "12px 0 0",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--ink)",
          }}
        >
          No new investigation was needed.
        </p>
      ) : null}
    </div>
  );
}

function ReceiptCol({
  title,
  when,
  graph,
  ai,
  latencyMs,
  muted,
  emphasize,
}: {
  title: string;
  when?: string;
  graph: number;
  ai: number;
  latencyMs: number;
  muted?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: muted ? "var(--ink-muted)" : "var(--ink)",
          fontWeight: emphasize ? 600 : 500,
        }}
      >
        {title}
      </p>
      {when ? (
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--ink-muted)" }}>
          {when}
        </p>
      ) : null}
      <p
        style={{
          margin: "8px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: emphasize ? 22 : 18,
          fontWeight: 500,
          color: emphasize ? "var(--signal)" : "var(--ink)",
          letterSpacing: "-0.02em",
        }}
      >
        {graph} Graph · {ai} AI · {fmtMs(latencyMs)}
      </p>
    </div>
  );
}

export function costFromInvestigate(c: {
  graphQueries: number;
  aiCalls: number;
  latencyMs: number;
}): EncounterCost {
  return {
    graphQueries: c.graphQueries,
    aiCalls: c.aiCalls,
    latencyMs: c.latencyMs,
    at: new Date().toISOString(),
  };
}

/** Visual-only spacer style shared with passport. */
export const receiptMuted: CSSProperties = {
  color: "var(--ink-muted)",
};
