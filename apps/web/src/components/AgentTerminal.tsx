"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Label } from "../ui";

/**
 * Embedded terminal replay of consumers/live-agent — proves ENS hot path
 * outside the UI (F2). Live process: `cd consumers/live-agent && pnpm start`.
 */
const LINES: { kind: "hdr" | "ok" | "block" | "warn" | "miss" | "sys"; text: string }[] = [
  { kind: "sys", text: "trader-07.live-agent · worklist 2" },
  { kind: "sys", text: "ENS hot path imports nothing from @saviours/*" },
  { kind: "hdr", text: "trader-07 → considering swap with 0x935bfb…ede48" },
  {
    kind: "block",
    text: "BLOCK · FLASHLOAN_ONE_SHOT ∧ ATOMIC_MULTI_PROTOCOL · 0 Graph · 0 AI · 612ms · $0.00 · 0x935bfb….saviours.eth",
  },
  { kind: "ok", text: "  → cancel swap (agent decision)" },
  { kind: "hdr", text: "trader-07 → considering swap with 0x352423…3cc7" },
  {
    kind: "warn",
    text: "WARN · BOT_PROFILE · reduce size 90% · 488ms · 0x352423….saviours.eth",
  },
  { kind: "sys", text: "done" },
];

export function AgentTerminal({
  auto = true,
}: {
  auto?: boolean;
}) {
  const [n, setN] = useState(auto ? 0 : LINES.length);

  useEffect(() => {
    if (!auto) return;
    setN(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setN(i);
      if (i >= LINES.length) window.clearInterval(id);
    }, 380);
    return () => window.clearInterval(id);
  }, [auto]);

  return (
    <aside style={wrap}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "center",
        }}
      >
        <Label>LIVE-AGENT · OUTSIDE THIS UI</Label>
        <button
          type="button"
          onClick={() => {
            setN(0);
            let i = 0;
            const id = window.setInterval(() => {
              i += 1;
              setN(i);
              if (i >= LINES.length) window.clearInterval(id);
            }, 320);
          }}
          style={ghost}
        >
          Replay
        </button>
      </div>
      <p style={muted}>
        Same memory. Separate Node process.{" "}
        <code style={{ color: "var(--sig-hi)" }}>
          cd consumers/live-agent && pnpm start
        </code>
      </p>
      <pre style={term} aria-live="polite">
        {LINES.slice(0, n).map((line, i) => (
          <div
            key={`${i}-${line.text.slice(0, 24)}`}
            className="line-in"
            style={{ color: colorFor(line.kind) }}
          >
            {prefix(line.kind)}
            {line.text}
          </div>
        ))}
        {n < LINES.length ? (
          <span className="pending-pulse" style={{ color: "var(--sig)" }}>
            ▍
          </span>
        ) : null}
      </pre>
    </aside>
  );
}

function prefix(kind: (typeof LINES)[number]["kind"]) {
  if (kind === "block") return "✗ ";
  if (kind === "warn") return "! ";
  if (kind === "ok") return "✓ ";
  if (kind === "miss") return "? ";
  return "$ ";
}

function colorFor(kind: (typeof LINES)[number]["kind"]) {
  if (kind === "block") return "var(--red)";
  if (kind === "warn") return "var(--amber)";
  if (kind === "ok") return "var(--green)";
  if (kind === "miss") return "var(--amber)";
  if (kind === "hdr") return "var(--sig-hi)";
  return "var(--tx-lo)";
}

const wrap: CSSProperties = {
  marginTop: 22,
  padding: "14px 14px",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-inset)",
  boxShadow: "var(--edge)",
};

const muted: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 12,
  color: "var(--tx-lo)",
  lineHeight: 1.45,
};

const term: CSSProperties = {
  margin: "12px 0 0",
  padding: 12,
  minHeight: 140,
  border: "1px solid var(--line)",
  borderRadius: "var(--r-sm)",
  background: "var(--bg-void)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  lineHeight: 1.55,
  overflow: "auto",
  whiteSpace: "pre-wrap",
};

const ghost: CSSProperties = {
  border: "1px solid var(--line)",
  background: "var(--bg-high)",
  color: "var(--tx)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  padding: "5px 9px",
  borderRadius: "var(--r-sm)",
  cursor: "pointer",
};
