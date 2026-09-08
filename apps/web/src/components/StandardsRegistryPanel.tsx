"use client";

import { useState } from "react";
import {
  EXCLUDED_PROTOCOLS,
  STANDARD_PROTOCOLS,
} from "@saviours/core/protocols";
import { btnGhost } from "./AppShell";

export type FanOutProtocolChip = {
  protocol: string;
  status: string;
  ms: number;
  rowCount: number;
  error?: string;
  subgraphId?: string;
  schema?: string;
  family?: string;
  displayName?: string;
};

/** Community uni-v3 — not Messari-standardized (Adapter A). */
const ADAPTER_A = {
  slug: "uniswap-v3-community",
  family: "adapter-A",
  subgraphId: "5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV",
} as const;

function shortId(id: string): string {
  if (id.length <= 14) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

/**
 * Lisbon-style standards registry: 1 template × N pinned deployments.
 * Rows come from @saviours/core/protocols (single source of truth).
 */
export function StandardsRegistryPanel({
  protocols,
  adapterACount,
}: {
  protocols?: FanOutProtocolChip[];
  adapterACount?: number;
}) {
  const [open, setOpen] = useState(false);
  const bySlug = new Map((protocols ?? []).map((p) => [p.protocol, p]));

  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          ...btnGhost,
          padding: "8px 12px",
          fontSize: 12,
          borderRadius: 4,
          fontFamily: "var(--font-mono)",
        }}
      >
        {open
          ? "Hide standards registry ▴"
          : `Standards registry · 1 template × ${STANDARD_PROTOCOLS.length} pinned ids ▾`}
      </button>
      {open ? (
        <div
          style={{
            marginTop: 10,
            overflowX: "auto",
            border: "1px solid var(--line)",
            borderRadius: 4,
            padding: 10,
          }}
        >
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 12,
              color: "var(--ink-muted)",
              lineHeight: 1.45,
            }}
          >
            Protocols are data rows — adding Spark was one table entry. Empty ≠
            error. ATOMIC needs shared <code>hash</code> across pinned
            deployments.
          </p>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              minWidth: 520,
            }}
          >
            <thead>
              <tr style={{ color: "var(--ink-muted)", textAlign: "left" }}>
                <th style={th}>slug</th>
                <th style={th}>family</th>
                <th style={th}>pinned id</th>
                <th style={th}>live</th>
              </tr>
            </thead>
            <tbody>
              {STANDARD_PROTOCOLS.map((row) => {
                const live = bySlug.get(row.slug);
                return (
                  <tr key={row.slug}>
                    <td style={td}>{row.slug}</td>
                    <td style={td}>{row.family}</td>
                    <td style={td} title={row.subgraphId}>
                      {shortId(row.subgraphId)}
                    </td>
                    <td style={td}>
                      {live
                        ? `${live.status} · ${live.rowCount}r · ${live.ms}ms`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td style={td}>{ADAPTER_A.slug}</td>
                <td style={td}>{ADAPTER_A.family}</td>
                <td style={td} title={ADAPTER_A.subgraphId}>
                  {shortId(ADAPTER_A.subgraphId)}
                </td>
                <td style={td}>
                  {adapterACount != null && adapterACount > 0
                    ? `ok · ${adapterACount} rows`
                    : "—"}
                </td>
              </tr>
              {EXCLUDED_PROTOCOLS.map((e) => (
                <tr key={e.slug} style={{ opacity: 0.65 }}>
                  <td style={td}>{e.slug}</td>
                  <td style={td}>excluded</td>
                  <td style={td}>—</td>
                  <td style={td}>{e.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

const th = {
  padding: "6px 4px",
  borderBottom: "1px solid var(--line)",
  fontWeight: 500,
} as const;

const td = {
  padding: "6px 4px",
  borderBottom: "1px solid var(--line)",
  verticalAlign: "top" as const,
};
