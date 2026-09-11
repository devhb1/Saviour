"use client";

import type { CSSProperties, ReactNode } from "react";
import { btnGhost } from "./AppShell";

export type VerdictDecision = "BLOCK" | "WARN" | "ALLOW" | "ESCALATE";
export type VerdictStatus = "TAINTED" | "WATCH" | "SAFE" | "UNKNOWN" | string;

export type VerdictCardProps = {
  address: string;
  decision: VerdictDecision | string;
  status: VerdictStatus;
  plainVerdict?: string | null;
  ensName?: string | null;
  cost: {
    graph: number;
    ai: number;
    usd: number;
    latencyMs?: number;
  };
  source?: "ens" | "registry" | "none" | string;
  size?: "hero" | "inline";
  onCast?: () => void;
  onEvidence?: () => void;
  extra?: ReactNode;
};

function decisionColor(decision: string): string {
  const d = decision.toUpperCase();
  if (d === "BLOCK") return "var(--block)";
  if (d === "WARN") return "var(--warn)";
  if (d === "ALLOW") return "var(--safe)";
  return "var(--ink-muted)";
}

function statusLabel(status: string, decision: string): string {
  const s = (status || "").toUpperCase();
  if (s) return s;
  const d = decision.toUpperCase();
  if (d === "BLOCK") return "TAINTED";
  if (d === "WARN") return "WATCH";
  if (d === "ALLOW") return "SAFE";
  return "UNKNOWN";
}

/**
 * Shared verdict surface — Hook, Loop ④, Registry drawer, Wallet gate.
 * Cost line lives INSIDE the card (ENDGAME Law 1).
 */
export function VerdictCard({
  address,
  decision,
  status,
  plainVerdict,
  ensName,
  cost,
  source = "none",
  size = "hero",
  onCast,
  onEvidence,
  extra,
}: VerdictCardProps) {
  const d = (decision || "ESCALATE").toUpperCase();
  const st = statusLabel(status, d);
  const color = decisionColor(d);
  const name =
    ensName?.trim() ||
    `${address.toLowerCase()}.saviours.eth`;
  const hit = source === "ens" || source === "registry";
  const hero = size === "hero";

  return (
    <div
      className="rise pulse-decision"
      style={{
        padding: hero ? "20px 22px" : "14px 16px",
        border: `1px solid color-mix(in srgb, ${color} 40%, var(--line))`,
        borderRadius: "var(--radius-md)",
        background: `linear-gradient(145deg, color-mix(in srgb, ${color} 8%, var(--surface)), var(--surface))`,
        maxWidth: hero ? 420 : "100%",
        width: "100%",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: "var(--t-floor)",
          letterSpacing: "0.1em",
          color: "var(--ink-muted)",
        }}
      >
        {hit ? "MEMORY HIT" : "SHIELD"}
        {" · "}
        source={source}
      </p>

      <p
        style={{
          margin: "10px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: hero ? 36 : 24,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          color,
          lineHeight: 1.05,
        }}
      >
        {d === "BLOCK" ? "🛑  BLOCK" : d}
      </p>

      <p
        style={{
          margin: "8px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--t-sm)",
          fontWeight: 600,
          color: "var(--ink)",
          letterSpacing: "0.04em",
        }}
      >
        {st}
      </p>

      {plainVerdict ? (
        <p
          style={{
            margin: "10px 0 0",
            fontSize: "var(--t-sm)",
            lineHeight: 1.45,
            color: "var(--ink-muted)",
          }}
        >
          {plainVerdict}
        </p>
      ) : null}

      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid var(--line)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: "var(--t-sm)",
            fontWeight: 600,
            color: hit ? "var(--safe)" : "var(--ink)",
            letterSpacing: "-0.01em",
          }}
        >
          {cost.graph} Graph · {cost.ai} AI · $
          {cost.usd.toFixed(cost.usd === 0 ? 0 : 2)}
          {typeof cost.latencyMs === "number"
            ? ` · ${cost.latencyMs} ms`
            : ""}
        </p>
        <p
          style={{
            margin: "8px 0 0",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--t-floor)",
            color: "var(--ink-muted)",
            wordBreak: "break-all",
            lineHeight: 1.4,
          }}
        >
          {name}
        </p>
      </div>

      {(onCast || onEvidence) && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 14,
          }}
        >
          {onCast ? (
            <button type="button" onClick={onCast} style={btnGhostCompact}>
              cast this yourself ↗
            </button>
          ) : null}
          {onEvidence ? (
            <button type="button" onClick={onEvidence} style={btnGhostCompact}>
              Show evidence
            </button>
          ) : null}
        </div>
      )}

      {extra}
    </div>
  );
}

const btnGhostCompact: CSSProperties = {
  ...btnGhost,
  padding: "8px 12px",
  fontSize: 12,
};
