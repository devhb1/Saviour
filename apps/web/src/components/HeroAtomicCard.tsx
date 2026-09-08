"use client";

import type { AtomicHero } from "./provenanceBuild";

function shortTx(tx: string): string {
  return `${tx.slice(0, 10)}…${tx.slice(-6)}`;
}

/**
 * Composable WOW for ATTACK-1: one same-tx multi-protocol edge,
 * honest "1 template · 8 deployments" strip — not "8 integrations."
 */
export function HeroAtomicCard({ hero }: { hero: AtomicHero }) {
  return (
    <div
      className="rise"
      style={{
        padding: "16px 18px",
        border: "2px solid var(--signal)",
        borderRadius: 6,
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
}: {
  protocolCount?: number;
}) {
  const n = protocolCount ?? 8;
  return (
    <p
      style={{
        margin: "0 0 12px",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "var(--ink-muted)",
        lineHeight: 1.45,
      }}
    >
      Standards leverage · 1 Messari query template × {n} deployments — not {n}{" "}
      separate integrations.
    </p>
  );
}
