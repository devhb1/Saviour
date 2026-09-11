"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Label } from "../ui";
import { btnPrimary, HOME_CHIPS } from "./AppShell";

type Tone = "sys" | "ok" | "block" | "warn" | "miss" | "pay" | "hdr";

type StreamLine = {
  id: number;
  t: number;
  agent: "payer" | "free";
  text: string;
  tone: Tone;
};

type Meta = {
  payer?: {
    id: string;
    role: string;
    note: string;
    settleAccount: string;
    network: string;
  };
  free?: { id: string; role: string; note: string };
  address?: string;
  gateway?: string;
};

type SettleInfo = {
  ok?: boolean;
  payer?: string | null;
  amountUsd?: string;
  transaction?: string;
  explorerUrl?: string;
  error?: string;
};

/**
 * Live third-party agent console — answers "who pays?"
 *
 * Not a scripted replay. Streams GET /api/agent/stream: ENS read → live 402 →
 * optional Base settle from the agent's account → second agent resolves $0.
 */
export function AgentClientConsole({
  address,
}: {
  address: string;
}) {
  const [lines, setLines] = useState<StreamLine[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [settle, setSettle] = useState<SettleInfo | null>(null);
  const [running, setRunning] = useState(false);
  const [wantPay, setWantPay] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const boxRef = useRef<HTMLPreElement>(null);

  const target =
    address.trim().toLowerCase() || HOME_CHIPS[0]?.address || "";

  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [lines]);

  const run = useCallback(async () => {
    if (!/^0x[a-f0-9]{40}$/.test(target)) {
      setError("Paste a valid 0x address first");
      return;
    }
    setRunning(true);
    setError(null);
    setLines([]);
    setSettle(null);
    setMeta(null);
    seq.current = 0;

    const url = `/api/agent/stream?address=${encodeURIComponent(target)}&pay=${wantPay ? "1" : "0"}`;
    try {
      const res = await fetch(url);
      if (!res.ok || !res.body) {
        throw new Error(`stream failed · HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const chunks = buf.split("\n\n");
        buf = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const dataLine = chunk
            .split("\n")
            .find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          let ev: {
            kind: string;
            t?: number;
            agent?: "payer" | "free";
            text?: string;
            tone?: Tone;
            data?: Record<string, unknown>;
          };
          try {
            ev = JSON.parse(dataLine.slice(6)) as typeof ev;
          } catch {
            continue;
          }
          if (ev.kind === "meta") {
            setMeta((ev.data as Meta) ?? null);
          } else if (ev.kind === "line" && ev.text) {
            const id = ++seq.current;
            setLines((prev) => [
              ...prev,
              {
                id,
                t: ev.t ?? 0,
                agent: ev.agent ?? "payer",
                text: ev.text!,
                tone: ev.tone ?? "sys",
              },
            ]);
          } else if (ev.kind === "settle") {
            setSettle((ev.data as SettleInfo) ?? null);
          } else if (ev.kind === "error") {
            setError(ev.text ?? "stream error");
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "stream failed");
    } finally {
      setRunning(false);
    }
  }, [target, wantPay]);

  return (
    <aside style={wrap} className="on-night">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <div>
          <Label>AGENT CLIENT · WHO PAYS</Label>
          <p style={muted}>
            A separate integrator agent — not this website. It reads ENS for
            free, pays the miss itself, then a second agent resolves the same
            memory for $0.
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--tx-lo)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={wantPay}
              onChange={(e) => setWantPay(e.target.checked)}
              disabled={running}
            />
            settle $0.01 on miss
          </label>
          <button
            type="button"
            onClick={() => void run()}
            disabled={running}
            className="btn-primary-motion"
            style={{
              ...btnPrimary,
              background: "var(--signal)",
              color: "var(--night)",
              padding: "8px 14px",
              fontSize: 13,
            }}
          >
            {running ? "Running…" : "Run as swap-router-agent →"}
          </button>
        </div>
      </div>

      <div style={identityRow}>
        <IdentityCard
          title="PAYER"
          id={meta?.payer?.id ?? "swap-router-agent"}
          role={meta?.payer?.role ?? "integrator #1 · trading bot"}
          note={meta?.payer?.note ?? "not saviours · not this website"}
          accent="var(--violet)"
          extra={
            meta?.payer
              ? `settle · ${meta.payer.settleAccount} · ${meta.payer.network}`
              : "Base · x402 via Bazantic"
          }
        />
        <IdentityCard
          title="FREE"
          id={meta?.free?.id ?? "vault-keeper"}
          role={meta?.free?.role ?? "integrator #2 · wallet copilot"}
          note={meta?.free?.note ?? "different account · never paid us"}
          accent="var(--green)"
          extra="ENS read only · $0 forever on MEMORY HIT"
        />
      </div>

      {settle?.ok && settle.transaction ? (
        <div style={settleBanner}>
          <span style={{ color: "var(--violet)", fontWeight: 600 }}>
            PAID BY THE AGENT
          </span>
          <span>
            ${settle.amountUsd ?? "0.01"} USDC · payer{" "}
            <code style={{ color: "var(--tx-hi)" }}>
              {settle.payer ?? "—"}
            </code>
          </span>
          {settle.explorerUrl ? (
            <a
              href={settle.explorerUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--sig-hi)" }}
            >
              basescan ↗
            </a>
          ) : null}
        </div>
      ) : null}

      {settle && settle.ok === false ? (
        <div style={{ ...settleBanner, borderLeftColor: "var(--rule)" }}>
          <span style={{ color: "var(--tx-mid)", fontWeight: 600 }}>
            SETTLE · LOCAL ONLY
          </span>
          <span style={{ color: "var(--tx-lo)" }}>
            Live 402 above is real. Paid settle needs{" "}
            <code>pnpm dev</code> + <code>bazantic</code> grant — this public
            host cannot hold the agent wallet. vault-keeper $0 below still
            proves the product.
          </span>
        </div>
      ) : null}

      <pre ref={boxRef} style={term} aria-live="polite">
        {lines.length === 0 && !running ? (
          <span style={{ color: "var(--tx-faint)" }}>
            // waiting — run as swap-router-agent
          </span>
        ) : null}
        {lines.map((l) => (
          <div
            key={l.id}
            className="line-in"
            style={{ color: colorFor(l.tone) }}
          >
            <span style={{ color: "var(--tx-faint)" }}>
              t+{(l.t / 1000).toFixed(1)}s{" "}
            </span>
            <span
              style={{
                color:
                  l.agent === "payer" ? "var(--violet)" : "var(--green)",
                fontWeight: 600,
              }}
            >
              {l.agent === "payer" ? "payer" : "free  "}
            </span>{" "}
            {l.text}
          </div>
        ))}
        {running ? (
          <span className="pending-pulse" style={{ color: "var(--sig)" }}>
            ▍
          </span>
        ) : null}
      </pre>

      {error ? (
        <p style={{ ...muted, color: "var(--red)" }}>{error}</p>
      ) : null}

      <p style={{ ...muted, marginTop: 10 }}>
        Shield / MEMORY HIT stays $0 forever. A fresh investigation costs ~$0.01
        — and <strong style={{ color: "var(--tx-hi)" }}>the agent pays, not us</strong>.
      </p>
    </aside>
  );
}

function IdentityCard({
  title,
  id,
  role,
  note,
  extra,
  accent,
}: {
  title: string;
  id: string;
  role: string;
  note: string;
  extra: string;
  accent: string;
}) {
  return (
    <div
      style={{
        flex: "1 1 240px",
        padding: "12px 14px",
        border: "1px solid var(--line-mid)",
        borderLeft: `3px solid ${accent}`,
        borderRadius: "var(--r-sm)",
        background: "var(--bg-void)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: accent,
        }}
      >
        {title}
      </p>
      <p
        style={{
          margin: "6px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          color: "var(--tx-hi)",
          fontWeight: 600,
        }}
      >
        {id}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--tx)" }}>
        {role}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--tx-lo)" }}>
        {note}
      </p>
      <p
        style={{
          margin: "8px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--tx-faint)",
        }}
      >
        {extra}
      </p>
    </div>
  );
}

function colorFor(tone: Tone) {
  if (tone === "block") return "var(--red)";
  if (tone === "warn") return "var(--amber)";
  if (tone === "ok") return "var(--green)";
  if (tone === "miss") return "var(--amber)";
  if (tone === "pay") return "var(--violet)";
  if (tone === "hdr") return "var(--sig-hi)";
  return "var(--tx-lo)";
}

const wrap: CSSProperties = {
  marginTop: 22,
  padding: "16px 16px",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-inset)",
  boxShadow: "var(--edge)",
};

const muted: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 13,
  color: "var(--tx-lo)",
  lineHeight: 1.5,
  maxWidth: 640,
};

const identityRow: CSSProperties = {
  marginTop: 14,
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};

const settleBanner: CSSProperties = {
  marginTop: 12,
  padding: "10px 12px",
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  alignItems: "center",
  borderLeft: "3px solid var(--violet)",
  background: "var(--violet-wash)",
  borderRadius: "0 var(--r-sm) var(--r-sm) 0",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--tx)",
  lineHeight: 1.45,
};

const term: CSSProperties = {
  margin: "14px 0 0",
  padding: 12,
  minHeight: 180,
  maxHeight: 360,
  overflow: "auto",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-sm)",
  background: "var(--bg-void)",
  fontFamily: "var(--font-mono)",
  fontSize: 11.5,
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
};
