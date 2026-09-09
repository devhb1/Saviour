"use client";

import type { CSSProperties } from "react";

export type NarrationBandProps = {
  status?: string | null;
  /** Plain 1–2 sentence lead (from signals or ENS plainVerdict). */
  lead?: string | null;
  signalIds?: string[];
  protocols?: string | string[] | null;
  atomicTx?: string | null;
  /** AI explanation — shown muted under code-decided lead */
  explanation?: string | null;
};

const RULE_PILLS: {
  id: string;
  match: (ids: Set<string>) => boolean;
  label: string;
  tip: string;
}[] = [
  {
    id: "ONE_SHOT∧ATOMIC",
    match: (ids) =>
      ids.has("FLASHLOAN_ONE_SHOT") && ids.has("ATOMIC_MULTI_PROTOCOL"),
    label: "ONE_SHOT ∧ ATOMIC",
    tip: "FLASHLOAN_ONE_SHOT ∧ ATOMIC_MULTI_PROTOCOL → TAINTED ceiling",
  },
  {
    id: "BOT_PROFILE",
    match: (ids) => ids.has("BOT_PROFILE"),
    label: "BOT_PROFILE → WATCH",
    tip: "High flashloan volume · amplifier-only · cannot reach TAINTED alone",
  },
  {
    id: "COOCCURRENCE",
    match: (ids) => ids.has("REGISTRY_COOCCURRENCE"),
    label: "REGISTRY_COOCCURRENCE",
    tip: "Live Graph edge to named TAINTED peer → propagation",
  },
];

/**
 * Case narrative band — truthful, from signals / plainVerdict.
 * Model explains; code decided. No invented fund-flow story.
 */
export function NarrationBand({
  status,
  lead,
  signalIds = [],
  protocols,
  atomicTx,
  explanation,
}: NarrationBandProps) {
  const ids = new Set(signalIds);
  const active = RULE_PILLS.filter((p) => p.match(ids));
  const protoLine = Array.isArray(protocols)
    ? protocols.filter(Boolean).join(" · ")
    : protocols ?? "";

  if (!lead && active.length === 0 && !protoLine && !explanation) return null;

  return (
    <div
      className="rise"
      style={{
        marginTop: 16,
        padding: "14px 16px",
        border: "1px solid var(--line)",
        borderRadius: 4,
        background: "rgba(255,255,255,0.45)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.06em",
          color: "var(--ink-muted)",
        }}
      >
        CASE NARRATIVE · code decided
        {status ? ` · ${status}` : ""}
      </p>

      {lead ? (
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 16,
            lineHeight: 1.45,
            maxWidth: 640,
          }}
        >
          {lead}
        </p>
      ) : null}

      {active.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {active.map((p) => (
            <span key={p.id} title={p.tip} style={pillActive}>
              {p.label}
            </span>
          ))}
          {RULE_PILLS.filter((p) => !p.match(ids)).map((p) => (
            <span key={p.id} title={p.tip} style={pillIdle}>
              {p.label}
            </span>
          ))}
        </div>
      ) : null}

      {protoLine || atomicTx ? (
        <p
          style={{
            margin: "12px 0 0",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--ink-muted)",
            lineHeight: 1.5,
          }}
        >
          {protoLine ? (
            <>
              Same-tx protocols · <span style={{ color: "var(--ink)" }}>{protoLine}</span>
            </>
          ) : null}
          {protoLine && atomicTx ? " · " : null}
          {atomicTx ? (
            <a
              href={`https://etherscan.io/tx/${atomicTx}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--signal)" }}
            >
              atomic {atomicTx.slice(0, 10)}…↗
            </a>
          ) : null}
        </p>
      ) : null}

      {explanation ? (
        <p
          style={{
            margin: "12px 0 0",
            fontSize: 13,
            color: "var(--ink-muted)",
            lineHeight: 1.5,
            maxWidth: 640,
          }}
        >
          <span style={{ color: "var(--ink)", fontWeight: 500 }}>AI cites · </span>
          {explanation.length > 280 ? `${explanation.slice(0, 280)}…` : explanation}
        </p>
      ) : null}
    </div>
  );
}

const pillActive: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  padding: "4px 8px",
  border: "1px solid var(--signal)",
  color: "var(--signal)",
  borderRadius: 4,
  background: "rgba(13,122,95,0.08)",
};

const pillIdle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  padding: "4px 8px",
  border: "1px solid var(--line)",
  color: "var(--ink-muted)",
  borderRadius: 4,
};
