"use client";

import { useMemo } from "react";

/**
 * AI explanation with clickable evidence-id / tx citations.
 * Sits below the proof tree — never above deterministic signals.
 */
export function AiCitePanel({
  explanation,
  evidenceIds,
  txHashes,
  highlightId,
  onCite,
}: {
  explanation: string;
  evidenceIds: string[];
  txHashes: string[];
  highlightId?: string | null;
  onCite: (token: string) => void;
}) {
  const tokens = useMemo(() => {
    const set = new Set<string>();
    for (const id of evidenceIds) if (id) set.add(id);
    for (const t of txHashes) if (t) set.add(t.toLowerCase());
    return [...set].sort((a, b) => b.length - a.length);
  }, [evidenceIds, txHashes]);

  const parts = useMemo(() => {
    if (tokens.length === 0) return [{ type: "text" as const, value: explanation }];
    const out: Array<{ type: "text" | "cite"; value: string }> = [];
    let rest = explanation;
    while (rest.length > 0) {
      let bestIdx = -1;
      let bestTok = "";
      const lower = rest.toLowerCase();
      for (const tok of tokens) {
        const i = lower.indexOf(tok.toLowerCase());
        if (i >= 0 && (bestIdx < 0 || i < bestIdx || (i === bestIdx && tok.length > bestTok.length))) {
          bestIdx = i;
          bestTok = rest.slice(i, i + tok.length);
        }
      }
      if (bestIdx < 0) {
        out.push({ type: "text", value: rest });
        break;
      }
      if (bestIdx > 0) out.push({ type: "text", value: rest.slice(0, bestIdx) });
      out.push({ type: "cite", value: bestTok });
      rest = rest.slice(bestIdx + bestTok.length);
    }
    return out;
  }, [explanation, tokens]);

  return (
    <div style={{ marginTop: 18 }}>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          color: "var(--ink-muted)",
        }}
      >
        AI explanation · cites evidence (below proof tree)
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.55 }}>
        {parts.map((p, i) =>
          p.type === "text" ? (
            <span key={i}>{p.value}</span>
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => onCite(p.value)}
              style={{
                display: "inline",
                padding: "0 3px",
                margin: "0 1px",
                border:
                  highlightId?.toLowerCase() === p.value.toLowerCase()
                    ? "1px solid var(--signal)"
                    : "1px solid var(--line)",
                borderRadius: 2,
                background:
                  highlightId?.toLowerCase() === p.value.toLowerCase()
                    ? "rgba(13,122,95,0.15)"
                    : "rgba(13,122,95,0.06)",
                color: "var(--signal)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                cursor: "pointer",
              }}
              title="Highlight related evidence"
            >
              {p.value.length > 24 ? `${p.value.slice(0, 10)}…${p.value.slice(-6)}` : p.value}
            </button>
          ),
        )}
      </p>
    </div>
  );
}
