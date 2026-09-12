"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { EmptyState, Label } from "../ui";

/** Web-safe mirror of packages/core STANDARD_PROTOCOLS slugs — never import core in client. */
const STANDARD_PROTOCOL_SLUGS = [
  "aave-v3",
  "compound-v3",
  "spark",
  "makerdao",
  "uniswap-v3",
  "sushi",
  "curve",
  "yearn-v2",
] as const;

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
  /** API returns `{ status, rule }` from statusFromSignals — not a bare string. */
  signalStatus?: string | { status?: string; rule?: string };
};

function asText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.status === "string" && typeof o.rule === "string") {
      return `${o.status} (${o.rule})`;
    }
    if (typeof o.status === "string") return o.status;
    try {
      return JSON.stringify(v);
    } catch {
      return "";
    }
  }
  return "";
}

/**
 * Live Graph fan-out console — 1 Messari template × 8 deployments with real ms/rows.
 */
export function FanOutConsole({
  address,
  auto = true,
  compact = false,
  onData,
}: {
  address: string;
  auto?: boolean;
  compact?: boolean;
  onData?: (payload: {
    protocols: Array<{
      protocol: string;
      status: string;
      ms: number;
      rowCount: number;
    }>;
    signals: Array<{ id?: string; class?: string; detail?: string }>;
  }) => void;
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
      const protocols = (json.fanOut?.protocols ?? []).map((p) => ({
        protocol: p.protocol,
        status: p.status,
        ms: p.ms ?? 0,
        rowCount: p.rowCount ?? 0,
      }));
      onData?.({ protocols, signals: json.signals ?? [] });
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

      {!busy && !error && data && protocols.length === 0 ? (
        <EmptyState title="NO DEPLOYMENT ROWS" style={{ marginTop: 14 }}>
          Fan-out returned an empty protocols list. Refresh or try another address.
        </EmptyState>
      ) : null}

      {data?.banner ? (
        <p style={{ ...muted, marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 11 }}>
          {data.banner}
        </p>
      ) : null}

      <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
        {(busy && !data
          ? PLACEHOLDER
          : error
            ? []
            : protocols
        ).map((p, i) => {
          const visible = protocols.length ? i < revealed : busy && !data;
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
                <strong style={{ color: "var(--sig-hi)" }}>{asText(s.id)}</strong>
                {s.class ? (
                  <span style={{ color: "var(--tx-faint)" }}> · {asText(s.class)}</span>
                ) : null}
                {s.detail ? (
                  <span style={{ display: "block", color: "var(--tx-lo)", marginTop: 2 }}>
                    {asText(s.detail)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          {data?.signalStatus ? (
            <p style={{ ...muted, marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 11 }}>
              signal ceiling → {asText(data.signalStatus)} · AI cites ids only · validator
              decides
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

const PLACEHOLDER: ProtocolRow[] = STANDARD_PROTOCOL_SLUGS.map((protocol) => ({
  protocol,
  status: "…",
}));

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
