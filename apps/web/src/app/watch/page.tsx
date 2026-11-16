"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";

type Subscriber = {
  id: string;
  chainId: number;
  target: string;
  label?: string;
  telegramChatId?: string;
  createdAt: string;
};

/**
 * Privilege Guard — Watch subscribe (operator allowlist file via API).
 */
export default function WatchPage() {
  const [target, setTarget] = useState(
    "0x35C99CF4a5DF2D9bCd822BeE32676D9590229e33",
  );
  const [targetLabel, setTargetLabel] = useState("Term Zodiac Delay");
  const [chatId, setChatId] = useState("");
  const [rows, setRows] = useState<Subscriber[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const r = await fetch("/api/watch/subscribe");
    const j = await r.json();
    setRows(j.subscribers ?? []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function subscribe() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/watch/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chainId: 1,
          target,
          label: targetLabel,
          telegramChatId: chatId || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "subscribe failed");
      setMsg(`Subscribed ${j.subscriber.id}`);
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={main}>
      <p style={muted}>
        <Link href="/" style={{ color: "var(--sig, #4c8dff)", textDecoration: "none" }}>
          saviours
        </Link>
        {" · "}Privilege Guard · Watch
      </p>
      <h1 style={h1}>Watch for CRITICAL privilege ops</h1>
      <p style={lead}>
        Subscribe a Delay / DAO / Roles / Safe address. The indexer polls allowlisted
        targets and Telegrams CRITICAL privilege mutations. Day-1 starts with Term
        Prop 5–class addresses.
      </p>

      <label style={fieldLabel}>
        Target address
        <input value={target} onChange={(e) => setTarget(e.target.value)} style={input} />
      </label>
      <label style={fieldLabel}>
        Label
        <input
          value={targetLabel}
          onChange={(e) => setTargetLabel(e.target.value)}
          style={input}
        />
      </label>
      <label style={fieldLabel}>
        Telegram chat id (optional — else uses TELEGRAM_CHAT_IDS env)
        <input
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          placeholder="123456789"
          style={input}
        />
      </label>

      <button type="button" onClick={() => void subscribe()} disabled={busy} style={btn}>
        {busy ? "Saving…" : "Subscribe"}
      </button>
      {msg ? <p style={{ marginTop: 12, fontSize: 13 }}>{msg}</p> : null}

      <h2 style={{ ...h1, fontSize: 18, marginTop: 32 }}>Active subscriptions</h2>
      <ul style={{ marginTop: 12, paddingLeft: 18, fontSize: 12, fontFamily: "var(--font-mono, monospace)" }}>
        {rows.length === 0 ? <li>None yet</li> : null}
        {rows.map((r) => (
          <li key={r.id} style={{ marginBottom: 8 }}>
            {r.label || "target"} · {r.target.slice(0, 10)}… · chain {r.chainId}
            {r.telegramChatId ? ` · tg ${r.telegramChatId}` : ""}
          </li>
        ))}
      </ul>

      <p style={{ ...muted, marginTop: 28 }}>
        Run indexer:{" "}
        <code>pnpm --filter @saviours/indexer replay</code> (demo alert) or{" "}
        <code>start</code> (live poll). Health:{" "}
        <Link href="/queues" style={{ color: "var(--sig, #4c8dff)" }}>
          /queues
        </Link>
        {" · "}
        <Link href="/review" style={{ color: "var(--sig, #4c8dff)" }}>
          /review
        </Link>
      </p>
    </main>
  );
}

const main: CSSProperties = {
  minHeight: "100vh",
  maxWidth: 720,
  margin: "0 auto",
  padding: "36px 20px 72px",
  background: "var(--bg-base, #0b0e14)",
  color: "var(--tx-hi, #f2f5f9)",
};

const muted: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 11,
  letterSpacing: "0.06em",
  color: "var(--tx-lo, #9aa5b2)",
};

const h1: CSSProperties = {
  margin: "10px 0 0",
  fontFamily: "var(--font-display, Georgia, serif)",
  fontSize: "clamp(24px, 4vw, 32px)",
  letterSpacing: "-0.035em",
  fontWeight: 700,
};

const lead: CSSProperties = {
  margin: "10px 0 0",
  fontSize: 14,
  lineHeight: 1.5,
  color: "var(--tx, #c5cdd8)",
  maxWidth: 520,
};

const fieldLabel: CSSProperties = {
  display: "block",
  marginTop: 16,
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 11,
  color: "var(--tx-lo, #9aa5b2)",
};

const input: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 6,
  padding: 10,
  background: "var(--bg-inset, #05070b)",
  border: "1px solid var(--line, #2a333c)",
  color: "var(--tx-hi, #f2f5f9)",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 12,
};

const btn: CSSProperties = {
  marginTop: 16,
  padding: "11px 16px",
  background: "var(--sig, #4c8dff)",
  color: "#061018",
  border: 0,
  fontWeight: 650,
  cursor: "pointer",
};
