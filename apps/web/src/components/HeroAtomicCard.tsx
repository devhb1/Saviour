"use client";

import type { AtomicHero } from "./provenanceBuild";

function shortTx(tx: string): string {
  return `${tx.slice(0, 10)}…${tx.slice(-6)}`;
}

/**
 * Composable WOW for ATTACK-1: one same-tx multi-protocol edge,
 * honest "1 template · 8 deployments" strip — not "8 integrations."
 * @deprecated Prefer AtomicPathTimeline for Case film; keep strip export.
 */
export function HeroAtomicCard({
  hero,
  compact = false,
}: {
  hero: AtomicHero;
  /** Single-row strip for dense Playground Graph. */
  compact?: boolean;
}) {
  const meta = [
    shortTx(hero.txHash),
    hero.hasFlashloan ? "flashloan" : null,
    hero.amountUSD > 0
      ? `~$${Math.round(hero.amountUSD).toLocaleString()}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (compact) {
    return (
      <div
        className="rise"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "6px 14px",
          padding: "8px 12px",
          border: "1px solid var(--signal)",
          borderRadius: "var(--radius-sm)",
          background: "var(--signal-wash)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.08em",
            color: "var(--signal)",
            flexShrink: 0,
          }}
        >
          ATOMIC
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--tx-hi)",
          }}
        >
          {hero.protocols.join(" × ")}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-muted)",
            flex: "1 1 160px",
            minWidth: 0,
          }}
        >
          {meta}
        </span>
        <a
          href={`https://etherscan.io/tx/${hero.txHash}`}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--signal)",
            flexShrink: 0,
          }}
        >
          Etherscan →
        </a>
      </div>
    );
  }

  return (
    <div
      className="rise"
      style={{
        padding: "16px 18px",
        border: "2px solid var(--signal)",
        borderRadius: "var(--radius-md)",
        background: "var(--signal-wash)",
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
        ATOMIC · same tx · ≥2 protocols
      </p>
      <p
        style={{
          margin: "8px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: 22,
          fontWeight: 500,
        }}
      >
        {hero.protocols.join(" × ")}
      </p>
      <p
        style={{
          margin: "8px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--ink-muted)",
          wordBreak: "break-all",
        }}
      >
        {shortTx(hero.txHash)}
        {hero.hasFlashloan ? " · flashloan in set" : ""}
        {hero.amountUSD > 0
          ? ` · ~$${Math.round(hero.amountUSD).toLocaleString()} USD (sum)`
          : ""}
      </p>
      <p
        style={{
          margin: "12px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.04em",
          color: "var(--ink-muted)",
          lineHeight: 1.45,
        }}
      >
        1 query template · 8 deployments · shared hash → ATOMIC_MULTI_PROTOCOL
      </p>
      <a
        href={`https://etherscan.io/tx/${hero.txHash}`}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-block",
          marginTop: 10,
          fontSize: 12,
          fontFamily: "var(--font-mono)",
          color: "var(--signal)",
        }}
      >
        View tx on Etherscan →
      </a>
    </div>
  );
}

export function StandardsLeverageStrip({
  protocolCount,
  adapterACount,
}: {
  protocolCount?: number;
  adapterACount?: number;
}) {
  const n = protocolCount ?? 8;
  return (
    <div
      style={{
        margin: "0 0 14px",
        padding: "12px 14px",
        border: "1px solid var(--signal)",
        borderRadius: "var(--radius-sm)",
        background: "var(--signal-wash)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.06em",
          color: "var(--signal)",
        }}
      >
        The Graph · Composable / Standardized
      </p>
      <p
        style={{
          margin: "6px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          color: "var(--ink)",
          lineHeight: 1.45,
        }}
      >
        1 Messari query template × {n} deployments — not {n} separate
        integrations. Shared <code>hash</code> → ATOMIC_MULTI_PROTOCOL.
      </p>
      {adapterACount != null && adapterACount > 0 ? (
        <p
          style={{
            margin: "8px 0 0",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--signal)",
          }}
        >
          + Adapter A · community Uniswap V3 · {adapterACount} rows · second
          Graph product
        </p>
      ) : null}
    </div>
  );
}
