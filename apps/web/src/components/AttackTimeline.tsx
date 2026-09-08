"use client";

import type { TimelineStep } from "./provenanceBuild";

export function AttackTimeline({
  steps,
  txHash,
  highlightId,
  onSelect,
}: {
  steps: TimelineStep[];
  txHash: string;
  highlightId?: string | null;
  onSelect?: (evidenceId: string) => void;
}) {
  if (steps.length < 2) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
        }}
      >
        Attack timeline · same tx · {steps.length} steps
      </p>
      <ol style={{ margin: "10px 0 0", paddingLeft: 20 }}>
        {steps.map((s, i) => {
          const active = highlightId === s.evidenceId;
          return (
            <li
              key={s.evidenceId}
              style={{
                marginBottom: 10,
                padding: active ? "8px 10px" : undefined,
                border: active ? "1px solid var(--signal)" : undefined,
                borderRadius: 4,
                background: active ? "rgba(13,122,95,0.08)" : undefined,
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
      <a
        href={`https://etherscan.io/tx/${txHash}`}
        target="_blank"
        rel="noreferrer"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--signal)",
        }}
      >
        Open atomic tx →
      </a>
    </div>
  );
}
