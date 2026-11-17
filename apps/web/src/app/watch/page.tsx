"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";

type Subscriber = {
  id: string;
  chainId: number;
  target: string;
  label?: string;
  telegramChatId?: string;
  durable?: boolean;
  createdAt: string;
};

const LS_KEY = "saviours.watch.subscribers";

function loadLocal(): Subscriber[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]") as Subscriber[];
  } catch {
    return [];
  }
}

function saveLocal(rows: Subscriber[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows.slice(0, 40)));
}

/**
 * Privilege Guard — Watch subscribe (server seed + browser localStorage).
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
  const [testBusy, setTestBusy] = useState(false);
  const [reviewHref, setReviewHref] = useState<string | null>(null);

  function merge(server: Subscriber[], local: Subscriber[]) {
    const map = new Map<string, Subscriber>();
    for (const r of [...server, ...local]) {
      map.set(`${r.chainId}:${r.target.toLowerCase()}:${r.id}`, r);
    }
    return [...map.values()];
  }

  async function refresh() {
    const local = loadLocal();
    try {
      const r = await fetch("/api/watch/subscribe");
      const j = await r.json();
      setRows(merge(j.subscribers ?? [], local));
    } catch {
      setRows(local);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function subscribe() {
    setBusy(true);
    setMsg(null);
    setReviewHref(null);
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
      const local = loadLocal();
      const next = [
        j.subscriber as Subscriber,
        ...local.filter(
          (x) =>
            !(
              x.target.toLowerCase() === target.toLowerCase() &&
              x.chainId === 1
            ),
        ),
      ];
      saveLocal(next);
      setMsg(
        j.note ||
          (j.subscriber?.durable
            ? `Subscribed ${j.subscriber.id}`
            : `Subscribed (browser + session) ${j.subscriber.id}`),
      );
      await refresh();
    } catch (e) {
      // Offline / API failure — still keep local habit
      const row: Subscriber = {
        id: `local_${Date.now()}`,
        chainId: 1,
        target,
        label: targetLabel,
        telegramChatId: chatId || undefined,
        createdAt: new Date().toISOString(),
        durable: false,
      };
      const next = [row, ...loadLocal()];
      saveLocal(next);
      setRows(merge([], next));
      setMsg(
        `Saved in this browser (${e instanceof Error ? e.message : String(e)})`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendTestAlert() {
    setTestBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/watch/test-alert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ telegramChatId: chatId || undefined }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "test alert failed");
      setReviewHref(j.reviewPath);
      setMsg(
        j.telegram?.ok
          ? "Telegram CRITICAL sent · open Review deep link"
          : "Test CRITICAL ready (Telegram dry-run — set bot token) · open Review",
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setTestBusy(false);
    }
  }

  return (
    <main className="cp-tool">
      <p className="cp-tool-eyebrow">Watch · prototype</p>
      <h1 className="cp-tool-h1">Watch prototype</h1>
      <p className="cp-tool-lead">
        Monitoring is not durable yet. Product is{" "}
        <Link href="/review" style={{ color: "var(--sig)" }}>
          Transaction Review
        </Link>
        . Use <strong>Send test CRITICAL</strong> only as a Review deep-link
        rehearsal — DEMO alerts are not live detections.
      </p>
      <p className="cp-honesty-rail" role="note">
        Prototype — not durable monitoring · prefer /audit and /review
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
        Telegram chat id (optional)
        <input
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          placeholder="123456789"
          style={input}
        />
      </label>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
        <button type="button" onClick={() => void subscribe()} disabled={busy} style={btn}>
          {busy ? "Saving…" : "Subscribe"}
        </button>
        <button
          type="button"
          onClick={() => void sendTestAlert()}
          disabled={testBusy}
          style={btnGhost}
        >
          {testBusy ? "Building…" : "Send test CRITICAL"}
        </button>
      </div>
      {msg ? <p style={{ marginTop: 12, fontSize: 13 }}>{msg}</p> : null}
      {reviewHref ? (
        <p style={{ marginTop: 8, fontSize: 13 }}>
          <Link href={reviewHref} style={{ color: "var(--sig, #4c8dff)" }}>
            Open Review from alert →
          </Link>
        </p>
      ) : null}

      <h2 style={{ ...h1, fontSize: 18, marginTop: 32 }}>Active subscriptions</h2>
      <ul
        style={{
          marginTop: 12,
          paddingLeft: 18,
          fontSize: 12,
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        {rows.length === 0 ? <li>None yet</li> : null}
        {rows.map((r) => (
          <li key={r.id} style={{ marginBottom: 8 }}>
            {r.label || "target"} · {r.target.slice(0, 10)}… · chain {r.chainId}
            {r.telegramChatId ? ` · tg ${r.telegramChatId}` : ""}
            {r.durable === false ? " · browser" : ""}
          </li>
        ))}
      </ul>

      <p style={{ ...muted, marginTop: 28 }}>
        Health:{" "}
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
  padding: "11px 16px",
  background: "var(--sig, #4c8dff)",
  color: "#061018",
  border: 0,
  fontWeight: 650,
  cursor: "pointer",
};

const btnGhost: CSSProperties = {
  ...btn,
  background: "transparent",
  color: "var(--sig, #4c8dff)",
  border: "1px solid var(--sig, #4c8dff)",
};
