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

/** Normalized cost for bar width — not raw ms (second bar would vanish). */
function costScore(c: { graphQueries: number; aiCalls: number }): number {
  return c.graphQueries * 10 + c.aiCalls * 25;
}

export type ReceiptStripProps = {
  mode: "first" | "memory" | "fresh";
  now: EncounterCost;
  first?: EncounterCost | null;
  forceFresh?: boolean;
  /** True when MEMORY HIT verdict + optional live /api/evidence proof. */
  liveProofOverlay?: boolean;
};

/**
 * Hero cost comparison — FIRST → SECOND bars (film WOW).
 */
export function ReceiptStrip({
  mode,
  now,
  first,
  forceFresh,
  liveProofOverlay,
}: ReceiptStripProps) {
  const showCompare = mode === "memory" && first && first.graphQueries > 0;
  const firstScore = first ? costScore(first) : costScore(now);
  const nowScore = costScore(now);
  const maxScore = Math.max(firstScore, nowScore, 1);
  const firstPct = Math.min(100, Math.max(8, (firstScore / maxScore) * 100));
  const nowPct = Math.min(100, Math.max(4, (nowScore / maxScore) * 100));
  const proofPaid = Boolean(liveProofOverlay) || (mode === "memory" && now.graphQueries > 0);

  return (
    <div
      className="rise"
      style={{
        padding: "14px 16px",
        border: "1px solid var(--signal)",
        borderRadius: "var(--radius-soft, 10px)",
        background: "#f3f6f3",
        isolation: "isolate",
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
        {proofPaid && !forceFresh ? " · live proof" : ""}
      </p>

      {showCompare ? (
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: 10,
            alignItems: "end",
          }}
        >
          <ReceiptSide
            title="FIRST ENCOUNTER"
            caption="Investigated once."
            when={fmtWhen(first.at)}
            graph={first.graphQueries}
            ai={first.aiCalls}
            latencyMs={first.latencyMs}
            barPct={firstPct}
            muted
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              color: "var(--ink-muted)",
              paddingBottom: 28,
            }}
          >
            →
          </span>
          <ReceiptSide
            title={proofPaid ? "MEMORY + LIVE PROOF" : "SECOND ENCOUNTER"}
            caption={
              proofPaid
                ? "Verdict from ENS · Graph paid for proof UI."
                : "0 Graph · 0 AI — cost eliminated, not a latency race."
            }
            when={proofPaid ? "ENS + /api/evidence" : "from memory"}
            graph={now.graphQueries}
            ai={now.aiCalls}
            latencyMs={now.latencyMs}
            barPct={nowPct}
            emphasize
          />
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <ReceiptSide
            title={
              mode === "memory"
                ? proofPaid
                  ? "MEMORY VERDICT · LIVE GRAPH PROOF"
                  : "RESOLVED FROM MEMORY"
                : mode === "fresh"
                  ? "LIVE INVESTIGATION"
                  : "FIRST ENCOUNTER"
            }
            caption={
              mode === "memory"
                ? proofPaid
                  ? "Verdict unchanged · proof re-queried The Graph."
                  : "0 Graph · 0 AI — cost eliminated, not a latency race."
                : "Investigated once."
            }
            when={fmtWhen(now.at)}
            graph={now.graphQueries}
            ai={now.aiCalls}
            latencyMs={now.latencyMs}
            barPct={Math.min(100, Math.max(12, (costScore(now) / Math.max(costScore(now), 90)) * 100))}
            emphasize
            showPlaceholderSecond={mode === "fresh" || mode === "first"}
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
          {proofPaid
            ? "No re-investigation — but the proof panel did pay The Graph."
            : "No new investigation was needed."}
        </p>
      ) : null}
      {mode === "memory" && !proofPaid ? (
        <p className="receipt-baz">
          Settled via Bazantic shieldCheck · $0 · x402 metered
        </p>
      ) : null}
    </div>
  );
}

function ReceiptSide({
  title,
  caption,
  when,
  graph,
  ai,
  latencyMs,
  barPct,
  muted,
  emphasize,
  showPlaceholderSecond,
}: {
  title: string;
  caption: string;
  when?: string;
  graph: number;
  ai: number;
  latencyMs: number;
  barPct: number;
  muted?: boolean;
  emphasize?: boolean;
  showPlaceholderSecond?: boolean;
}) {
  return (
    <div style={{ minWidth: 0, width: "100%" }}>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.08em",
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
      <div
        style={{
          marginTop: 10,
          width: "100%",
          height: 10,
          borderRadius: 2,
          background: "var(--bg-inset)",
          border: "1px solid var(--line)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${barPct}%`,
            maxWidth: "100%",
            height: "100%",
            borderRadius: 2,
            background: emphasize ? "var(--signal)" : "var(--ink-muted)",
            opacity: muted ? 0.55 : 1,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      {showPlaceholderSecond ? (
        <div
          style={{
            marginTop: 6,
            width: "28%",
            height: 6,
            borderRadius: 2,
            background: "var(--bg-high)",
          }}
          title="Second encounter appears after a memory hit"
        />
      ) : null}
      <p
        style={{
          margin: "8px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: emphasize ? 20 : 16,
          fontWeight: 500,
          color: emphasize ? "var(--signal)" : "var(--ink)",
          letterSpacing: "-0.02em",
        }}
      >
        {graph} Graph · {ai} AI · {fmtMs(latencyMs)}
      </p>
      <p
        style={{
          margin: "4px 0 0",
          fontSize: 12,
          color: "var(--ink-muted)",
          fontStyle: "italic",
        }}
      >
        {caption}
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

export const receiptMuted: CSSProperties = {
  color: "var(--ink-muted)",
};
