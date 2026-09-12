"use client";

import { useState, type CSSProperties } from "react";
import { btnGhost, btnPrimary } from "./AppShell";
import { fetchJson } from "../lib/fetchJson";

const CHIPS = [
  "Ask why it's tainted",
  "Ask what protocol got hit",
  "Ask why WATCH instead of TAINTED",
  "Ask which evidence ids the AI cited",
  "Ask about the atomic transaction",
  "Ask if we've seen this evidence hash",
] as const;

export type AskPacketClient = {
  address: string;
  status?: string | null;
  confidence?: number | null;
  signals?: Array<{ id: string; class?: string; detail?: string }>;
  evidence?: Array<{
    id: string;
    claim?: string;
    protocol?: string;
    kind?: string;
    txHash?: string;
    amountUSD?: number;
  }>;
  explanation?: string | null;
  threatTypes?: string[];
  rulesVersion?: string | null;
  evidenceHash?: string | null;
  atomicTx?: string | null;
  protocols?: string | null;
};

type AskResponse = {
  answer?: string;
  toolTrace?: Array<{ name: string; args: Record<string, unknown>; summary: string }>;
  model?: string | null;
  mode?: string;
  error?: string;
};

/**
 * Full-width Ask — lives below the Case grid so answers get room to breathe.
 */
export function AskPanel({
  packet,
  compact = false,
}: {
  packet: AskPacketClient;
  compact?: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [trace, setTrace] = useState<AskResponse["toolTrace"]>([]);
  const [meta, setMeta] = useState<string | null>(null);
  const [chipsOpen, setChipsOpen] = useState(true);

  async function ask(q: string) {
    const text = q.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    setQuestion(text);
    setChipsOpen(false);
    try {
      const json = await fetchJson<AskResponse>(
        `/api/case/${encodeURIComponent(packet.address)}/ask`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question: text, packet }),
        },
      );
      setAnswer(json.answer ?? "");
      setTrace(json.toolTrace ?? []);
      setMeta(
        [json.mode, json.model].filter(Boolean).join(" · ") || null,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ask failed");
      setAnswer(null);
      setTrace([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      id="case-ask"
      className="ask-panel"
      style={{
        ...root,
        ...(compact
          ? { marginTop: 0, padding: "12px 12px", minHeight: 0 }
          : null),
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.08em",
            color: "var(--ink-muted)",
          }}
        >
          ASK WHY IT&apos;S TAINTED · evidence-bound · read-only tools
        </p>

        {answer && !chipsOpen ? (
          <button
            type="button"
            onClick={() => setChipsOpen(true)}
            style={{
              marginTop: 10,
              padding: 0,
              border: "none",
              background: "none",
              color: "var(--signal)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            + suggested questions
          </button>
        ) : (
          <div className="ask-chips" style={chipRow}>
            {CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                disabled={busy}
                onClick={() => void ask(c)}
                style={chipBtn}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void ask(question);
            }}
            placeholder="Ask why it's tainted · ask what protocol got hit"
            disabled={busy}
            style={inputStyle}
          />
          <button
            type="button"
            disabled={busy || !question.trim()}
            onClick={() => void ask(question)}
            style={{ ...btnPrimary, opacity: busy ? 0.7 : 1 }}
          >
            {busy ? "Asking…" : "Ask"}
          </button>
        </div>

        {error ? (
          <p role="alert" style={{ color: "var(--block)", marginTop: 12 }}>
            {error}
          </p>
        ) : null}
      </div>

      {answer ? (
        <div
          style={{
            ...answerBox,
            ...(compact
              ? { minHeight: 120, maxHeight: "min(280px, 40vh)", marginTop: 12, padding: "12px 14px" }
              : null),
          }}
        >
          {trace && trace.length > 0 ? (
            <div style={traceBox}>
              <p
                style={{
                  margin: "0 0 6px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  color: "var(--ink-muted)",
                }}
              >
                TOOL TRACE
              </p>
              {trace.map((t, i) => (
                <p
                  key={`${t.name}-${i}`}
                  style={{
                    margin: i === 0 ? 0 : "4px 0 0",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--signal)",
                    lineHeight: 1.45,
                    wordBreak: "break-word",
                  }}
                >
                  called {t.name}({summarizeArgs(t.args)}) · {t.summary}
                </p>
              ))}
            </div>
          ) : null}
          <p
            style={{
              margin: 0,
              fontSize: 16,
              lineHeight: 1.6,
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            {answer}
          </p>
          {meta ? (
            <p
              style={{
                margin: "10px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--ink-muted)",
              }}
            >
              {meta}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setAnswer(null);
              setTrace([]);
              setMeta(null);
              setChipsOpen(true);
            }}
            style={{ ...btnGhost, marginTop: 14, padding: "6px 10px", fontSize: 12 }}
          >
            Clear
          </button>
        </div>
      ) : null}

      <style>{`
        .ask-chips {
          scrollbar-width: thin;
        }
        .ask-chips::-webkit-scrollbar {
          height: 6px;
        }
        .ask-chips::-webkit-scrollbar-thumb {
          background: var(--line);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}

function summarizeArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args);
  if (entries.length === 0) return "";
  return entries
    .map(([k, v]) => {
      const s = String(v ?? "");
      if (s.startsWith("0x") && s.length > 14) return `${k}=${s.slice(0, 10)}…`;
      return `${k}=${s.slice(0, 24)}`;
    })
    .join(",");
}

const root: CSSProperties = {
  marginTop: 20,
  padding: "18px 20px",
  border: "1px solid var(--line)",
  borderRadius: 6,
  background: "var(--surface)",
};

const chipRow: CSSProperties = {
  display: "flex",
  flexWrap: "nowrap",
  gap: 8,
  marginTop: 12,
  overflowX: "auto",
  paddingBottom: 4,
};

const answerBox: CSSProperties = {
  marginTop: 18,
  padding: "18px 20px",
  border: "1px solid var(--line)",
  borderRadius: 4,
  background: "var(--paper)",
  minHeight: 280,
  maxHeight: "min(560px, 65vh)",
  overflowY: "auto",
  overflowX: "hidden",
  WebkitOverflowScrolling: "touch",
};

const traceBox: CSSProperties = {
  marginBottom: 14,
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 2,
  background: "rgba(14, 143, 158, 0.06)",
};

const chipBtn: CSSProperties = {
  padding: "6px 12px",
  border: "1px solid var(--line)",
  borderRadius: 999,
  background: "var(--bg-raise)",
  color: "var(--ink)",
  fontFamily: "var(--font-body)",
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const inputStyle: CSSProperties = {
  flex: "1 1 280px",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 2,
  background: "var(--bg-high)",
  fontFamily: "var(--font-body)",
  fontSize: 14,
  color: "var(--ink)",
  outline: "none",
};
