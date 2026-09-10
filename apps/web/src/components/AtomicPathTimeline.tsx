"use client";

import type { AtomicHero, TimelineStep } from "./provenanceBuild";

function shortTx(tx: string): string {
  return `${tx.slice(0, 10)}…${tx.slice(-6)}`;
}

/**
 * Merged ATOMIC hero + same-tx step path — one composition for the Case film beat.
 */
export function AtomicPathTimeline({
  hero,
  steps,
  highlightId,
  onSelect,
}: {
  hero: AtomicHero;
  steps: TimelineStep[];
  highlightId?: string | null;
  onSelect?: (evidenceId: string) => void;
}) {
  return (
    <div
      className="rise"
      style={{
        padding: "var(--space-4) 18px",
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
        ATOMIC PATH · same tx · ≥2 protocols
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
          color: "var(--ink-faint)",
          lineHeight: 1.45,
        }}
      >
        1 query template · 8 deployments · shared hash → ATOMIC_MULTI_PROTOCOL
      </p>

      {steps.length >= 2 ? (
        <ol style={{ margin: "16px 0 0", paddingLeft: 20 }}>
          {steps.map((s, i) => {
            const active = highlightId === s.evidenceId;
            return (
              <li
                key={s.evidenceId}
                style={{
                  marginBottom: 10,
                  padding: active ? "8px 10px" : undefined,
                  border: active ? "1px solid var(--signal)" : undefined,
                  borderRadius: "var(--radius-sm)",
                  background: active ? "var(--signal-wash)" : undefined,
                  cursor: onSelect ? "pointer" : undefined,
                }}
                onClick={() => onSelect?.(s.evidenceId)}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--signal)",
                  }}
                >
                  {i + 1}. {s.protocol}
                </span>{" "}
                <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>
                  · {s.kind}
                </span>
                {s.amountUSD != null && s.amountUSD > 0 ? (
                  <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                    {" "}
                    · ~${Math.round(s.amountUSD).toLocaleString()}
                  </span>
                ) : null}
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink-muted)",
                    marginTop: 2,
                    wordBreak: "break-word",
                  }}
                >
                  {s.claim.slice(0, 140)}
                  {s.claim.length > 140 ? "…" : ""}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      <a
        href={`https://etherscan.io/tx/${hero.txHash}`}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-block",
          marginTop: 12,
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
