"use client";

import type { CSSProperties } from "react";
import { SectionMark } from "./Mark";
import { HOME_CHIPS } from "./AppShell";

type Receipt = {
  title: string;
  provenance: string;
  body: string;
  href?: string;
  hrefLabel?: string;
};

/**
 * Atlas-style receipts — every claim labelled with what produced it.
 * Sits on 01 Threat next to "What isn't built".
 */
export function Receipts({
  graphCount,
  caseCount,
}: {
  graphCount?: number | null;
  caseCount?: number | null;
}) {
  const attack = HOME_CHIPS[0]?.address ?? "0x935bfb495e33f74d2e9735df1da66ace442ede48";
  const bot = HOME_CHIPS[1]?.address ?? "0x352423e2fa5d5c99343d371c9e3bc56c87723cc7";

  const rows: Receipt[] = [
    {
      title: "The fan-out",
      provenance: "live · Messari 1 template × 8 pinned deployments + Adapter A",
      body: "Investigate runs Promise.allSettled across Aave, Compound, Spark, Maker, Uniswap, Sushi, Curve, Yearn — honest empties shown, never hidden.",
    },
    {
      title: "The negative control",
      provenance: "the half that proves anything",
      body: `BOT-1 ${bot.slice(0, 10)}… → BOT_PROFILE → WATCH, not TAINTED. A detector that can only say TAINTED has not shown it can stay quiet.`,
      href: `#loop`,
      hrefLabel: "Open BOT-1 in Loop →",
    },
    {
      title: "The name",
      provenance: "read live from Sepolia · not from our database",
      body: `${attack.slice(0, 10)}….saviours.eth → saviours.status = TAINTED`,
      href: `#loop`,
      hrefLabel: "Run cast equivalent →",
    },
    {
      title: "Who pays",
      provenance: "GET /api/agent/stream · live ENS + live HTTP 402",
      body: "swap-router-agent settles the miss from its own Base account. vault-keeper — different account, never paid us — resolves the same memory for $0.",
      href: `#loop`,
      hrefLabel: "Run agent client →",
    },
    {
      title: "The kill switch",
      provenance: "viem → public Sepolia RPC · bypasses our /api",
      body: "Our server can go down. The verdict still resolves. That is the point of putting memory in ENS.",
    },
    {
      title: "Memory counts",
      provenance: "GET /api/incidents · this host",
      body: `Graph-verified ${graphCount ?? "—"} · indexed cases ${caseCount ?? "—"} · seeds never counted as Graph detections.`,
      href: `#registry`,
      hrefLabel: "Open Registry →",
    },
  ];

  return (
    <aside style={{ marginTop: 48 }} aria-label="Receipts">
      <SectionMark>EVERYTHING BELOW IS CHECKABLE</SectionMark>
      <h2
        style={{
          margin: "12px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: "clamp(22px, 2.8vw, 30px)",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
        }}
      >
        Each figure labelled with what produced it.
      </h2>
      <div
        style={{
          marginTop: 18,
          display: "grid",
          gap: 0,
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          background: "var(--surface)",
        }}
      >
        {rows.map((r, i) => (
          <div
            key={r.title}
            style={{
              padding: "16px 18px",
              borderTop: i === 0 ? "none" : "1px solid var(--line)",
              display: "grid",
              gridTemplateColumns: "minmax(140px, 200px) minmax(0, 1fr)",
              gap: 16,
            }}
            className="honesty-row"
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--ink)",
                }}
              >
                {r.title}
              </p>
              <p style={prov}>{r.provenance}</p>
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "var(--ink-muted)",
                  lineHeight: 1.5,
                }}
              >
                {r.body}
              </p>
              {r.href ? (
                <a
                  href={r.href}
                  style={{
                    display: "inline-block",
                    marginTop: 8,
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--signal)",
                  }}
                >
                  {r.hrefLabel ?? r.href}
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

const prov: CSSProperties = {
  margin: "6px 0 0",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.04em",
  color: "var(--signal)",
  lineHeight: 1.4,
};
