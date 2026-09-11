"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Label } from "../ui";

type ProtocolRow = {
  protocol: string;
  displayName?: string;
  status: string;
  ms?: number;
  rowCount?: number;
  error?: string;
  subgraphId?: string;
  schema?: string;
  family?: string;
};

type EvidencePayload = {
  banner?: string;
  fanOut?: {
    protocols?: ProtocolRow[];
    protocolsOk?: number;
    protocolsEmpty?: number;
    protocolsError?: number;
    rowCount?: number;
    totalMs?: number;
    excluded?: string[];
  };
  adapterACount?: number;
  signals?: Array<{ id?: string; class?: string; detail?: string }>;
  signalStatus?: string;
};

/**
 * Live Graph fan-out console — 1 Messari template × 8 deployments with real ms/rows.
 */
export function FanOutConsole({
  address,
  auto = true,
  compact = false,
}: {
  address: string;
  auto?: boolean;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EvidencePayload | null>(null);
  const [revealed, setRevealed] = useState(0);

  async function load() {
    const a = address.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(a)) {
      setError("Need a 0x address");
      return;
    }
    setBusy(true);
    setError(null);
    setData(null);
    setRevealed(0);
    try {
      const res = await fetch(`/api/evidence/1/${a}`);
      const json = (await res.json()) as EvidencePayload & { error?: string };
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fan-out failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (auto && address) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, auto]);

  const protocols = data?.fanOut?.protocols ?? [];

  useEffect(() => {
    if (!protocols.length) return;
    setRevealed(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setRevealed(i);
      if (i >= protocols.length) window.clearInterval(id);
    }, 120);
    return () => window.clearInterval(id);
  }, [protocols]);

  const maxMs = Math.max(1, ...protocols.map((p) => p.ms ?? 0));
  const signals = data?.signals ?? [];

  return (
    <aside style={wrap}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
        }}
      >
        <Label>GRAPH · 1 TEMPLATE → 8 DEPLOYMENTS</Label>
        <button type="button" onClick={() => void load()} disabled={busy} style={ghostBtn}>
          {busy ? "Querying…" : "Refresh live"}
        </button>
      </div>
      <p style={muted}>
        Same Messari schema across pinned deployments. Empty ≠ error — honest zeros stay
        visible. Adapter A is a second Graph surface.
      </p>

      {error ? (
        <p role="alert" style={{ marginTop: 12, color: "var(--red)", fontSize: 13 }}>
          {error}
        </p>
      ) : null}

      {data?.banner ? (
        <p style={{ ...muted, marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 11 }}>
          {data.banner}
        </p>
      ) : null}

      <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
        {(protocols.length ? protocols : PLACEHOLDER).map((p, i) => {
          const visible = protocols.length ? i < revealed : false;
          const ms = p.ms ?? 0;
          const pct = Math.min(100, Math.round((ms / maxMs) * 100));
          const status = p.status || "…";
          const color =
            status === "ok"
              ? "var(--green)"
              : status === "empty"
                ? "var(--tx-faint)"
                : status === "err" || status === "error"
                  ? "var(--red)"
                  : "var(--tx-lo)";
          return (
            <div
              key={p.protocol}
              className={visible ? "line-in" : undefined}
              style={{
                opacity: protocols.length && !visible ? 0.25 : 1,
                display: "grid",
                gridTemplateColumns: compact
                  ? "minmax(90px, 120px) 1fr auto"
                  : "minmax(100px, 130px) minmax(80px, 1fr) 1fr auto",
                gap: 10,
                alignItems: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
              }}
            >
              <span style={{ color: "var(--tx-hi)" }}>{p.protocol}</span>
              {!compact ? (
                <span style={{ color: "var(--tx-faint)", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.schema ?? p.family ?? "—"}
                </span>
              ) : null}
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: "var(--bg-inset)",
                  border: "1px solid var(--line)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: protocols.length && visible ? `${pct}%` : "0%",
                    height: "100%",
                    background: color,
                    transition: "width 280ms var(--ease)",
                  }}
                />
              </div>
              <span
                style={{
                  color,
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                  textAlign: "right",
                }}
              >
                {protocols.length && visible
                  ? `${ms}ms · ${p.rowCount ?? 0} rows · ${status === "empty" ? "honest empty" : status}`
                  : busy
                    ? "…"
                    : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {data?.fanOut ? (
        <p
          style={{
            ...muted,
            marginTop: 12,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {data.fanOut.rowCount ?? 0} rows · {data.fanOut.totalMs ?? "—"}ms total · ok{" "}
          {data.fanOut.protocolsOk ?? 0} · empty {data.fanOut.protocolsEmpty ?? 0} · err{" "}
          {data.fanOut.protocolsError ?? 0}
          {typeof data.adapterACount === "number"
            ? ` · adapter A ${data.adapterACount}`
            : ""}
          {data.fanOut.excluded?.length
            ? ` · excluded ${data.fanOut.excluded.join(", ")}`
            : ""}
        </p>
      ) : null}

      {signals.length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <Label>DETERMINISTIC SIGNALS</Label>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {signals.slice(0, 6).map((s, i) => (
              <li
                key={`${s.id}-${i}`}
                style={{
                  marginBottom: 6,
                  fontSize: 12,
                  color: "var(--tx)",
                  lineHeight: 1.4,
                }}
              >
                <strong style={{ color: "var(--sig-hi)" }}>{s.id}</strong>
                {s.class ? (
                  <span style={{ color: "var(--tx-faint)" }}> · {s.class}</span>
                ) : null}
                {s.detail ? (
                  <span style={{ display: "block", color: "var(--tx-lo)", marginTop: 2 }}>
                    {s.detail}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          {data?.signalStatus ? (
            <p style={{ ...muted, marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 11 }}>
              signal ceiling → {data.signalStatus} · AI cites ids only · validator decides
            </p>
          ) : null}
        </div>
      ) : data && !busy ? (
        <p style={{ ...muted, marginTop: 12, fontSize: 12 }}>
          No deterministic signals on this subject (honest empty — not an error).
        </p>
      ) : null}

      <p style={{ ...muted, marginTop: 12, fontSize: 11 }}>
        Adding a ninth protocol is one line in{" "}
        <code style={{ color: "var(--sig-hi)" }}>protocols.ts</code> — the query doesn&apos;t
        change.
      </p>
    </aside>
  );
}

const PLACEHOLDER: ProtocolRow[] = [
  "aave-v3",
  "compound-v3",
  "spark",
  "uniswap-v3",
  "sushiswap",
  "curve",
  "yearn-v2",
  "lido",
].map((protocol) => ({ protocol, status: "…" }));

const wrap: CSSProperties = {
  marginTop: 22,
  padding: "16px 16px",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-raise)",
  boxShadow: "var(--edge)",
};

const muted: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 13,
  color: "var(--tx-lo)",
  lineHeight: 1.45,
};

const ghostBtn: CSSProperties = {
  border: "1px solid var(--line)",
  background: "var(--bg-high)",
  color: "var(--tx)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  padding: "6px 10px",
  borderRadius: "var(--r-sm)",
  cursor: "pointer",
};
