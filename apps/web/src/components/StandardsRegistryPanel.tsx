"use client";

import { useState } from "react";
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

/** Static Messari registry (mirrors packages/core protocols.ts — keep in sync). */
const STANDARD_ROWS = [
  { slug: "aave-v3", family: "lending-cdp-3.1", subgraphId: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk", schema: "lending-cdp 3.1.0" },
  { slug: "compound-v3", family: "lending-cdp-3.1", subgraphId: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9", schema: "lending-cdp 3.1.0" },
  { slug: "spark", family: "lending-cdp-3.1", subgraphId: "GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si", schema: "lending-cdp 3.1.0" },
  { slug: "makerdao", family: "lending-cdp-2.0", subgraphId: "8sE6rTNkPhzZXZC6c8UQy2ghFTu5PPdGauwUBm4t7HZ1", schema: "lending-cdp 2.0.1" },
  { slug: "uniswap-v3", family: "dex-amm-ext-4.0", subgraphId: "4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6", schema: "dex-amm-ext 4.0.0" },
  { slug: "sushi", family: "dex-amm-1.3", subgraphId: "77jZ9KWeyi3CJ96zkkj5s1CojKPHt6XJKjLFzsDCd8Fd", schema: "dex-amm 1.3.2" },
  { slug: "curve", family: "dex-amm-1.3", subgraphId: "3fy93eAT56UJsRCEht8iFhfi6wjHWXtZ9dnnbQmvFopF", schema: "dex-amm 1.3.0" },
  { slug: "yearn-v2", family: "yield-1.3", subgraphId: "FDLuaz69DbMADuBjJDEcLnTuPnjhZqNbFVrkNiBLGkEg", schema: "yield-aggregator 1.3.0" },
] as const;

const EXCLUDED = [
  { slug: "balancer-v2", reason: "indexing_error" },
  { slug: "pancake-v3", reason: "no allocations" },
  { slug: "convex", reason: "indexing_error" },
] as const;

const ADAPTER_A = {
  slug: "uniswap-v3-community",
  family: "adapter-A",
  subgraphId: "5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV",
  schema: "community uni-v3",
};

function shortId(id: string): string {
  if (id.length <= 14) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

/**
 * Lisbon-style standards registry: 1 template × N pinned deployments.
 * Merges last fan-out status when available; otherwise static pins.
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
        {open ? "Hide standards registry ▴" : "Standards registry · 1 template × 8 pinned ids ▾"}
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
              {STANDARD_ROWS.map((row) => {
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
              {EXCLUDED.map((e) => (
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
