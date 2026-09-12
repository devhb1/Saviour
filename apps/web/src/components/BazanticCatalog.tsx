"use client";

import type { CSSProperties } from "react";
import {
  BAZANTIC_PUBLISH_KIT,
  BAZANTIC_RECIPES,
  BAZANTIC_TIERS,
  MCP_TOOL_COUNT,
} from "../lib/bazanticGateway";

/**
 * Compact Free / Standard / Complex table — shared Build · Docs · Gateway.
 */
export function BazanticTiersTable({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div style={wrap}>
      <p style={eyebrow}>
        Pricing tiers · MCP {MCP_TOOL_COUNT} tools · memory hit $0 forever
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact
            ? "1fr"
            : "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 10,
        }}
      >
        {BAZANTIC_TIERS.map((t) => (
          <div key={t.id} style={tierCard}>
            <p style={tierLabel}>
              {t.label}{" "}
              <span style={{ color: "var(--ok, #3dd68c)" }}>{t.price}</span>
            </p>
            <p style={tierRoutes}>{t.routes}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Five published Bazantic recipes — handle · role · spend.
 */
export function BazanticRecipesList({
  showPaste = true,
}: {
  showPaste?: boolean;
}) {
  return (
    <div style={wrap}>
      <p style={eyebrow}>Published recipes · 5 live on Bazantic</p>
      <ul style={list}>
        {BAZANTIC_RECIPES.map((r) => (
          <li key={r.handle} style={row}>
            <code style={handle}>{r.handle}</code>
            <span style={role}>{r.role}</span>
            <span style={spend}>{r.spend}</span>
            {showPaste ? (
              <span style={paste}>
                paste: <code>{r.paste}</code>
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <p style={kitHint}>
        Full paste kit: <code>{BAZANTIC_PUBLISH_KIT}</code>
        {" · "}
        <a
          href="https://bazantic.com/dashboard/recipes"
          target="_blank"
          rel="noreferrer"
          style={link}
        >
          Bazantic dashboard ↗
        </a>
      </p>
    </div>
  );
}

const wrap: CSSProperties = {
  marginTop: 16,
  marginBottom: 8,
};

const eyebrow: CSSProperties = {
  margin: "0 0 10px",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-floor, 11px)",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--sig)",
};

const tierCard: CSSProperties = {
  padding: "12px 14px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md, 8px)",
  background: "var(--bg-inset, var(--surface))",
};

const tierLabel: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--tx-hi)",
};

const tierRoutes: CSSProperties = {
  margin: "6px 0 0",
  fontSize: 12,
  lineHeight: 1.4,
  color: "var(--tx-lo)",
};

const list: CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const row: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(140px, 1.4fr) minmax(90px, 0.8fr) minmax(120px, 1fr)",
  gap: "4px 12px",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md, 8px)",
  fontSize: 12,
  alignItems: "baseline",
};

const handle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  color: "var(--tx-hi)",
  fontSize: 12,
  gridColumn: "1 / -1",
};

const role: CSSProperties = {
  color: "var(--tx-lo)",
};

const spend: CSSProperties = {
  fontFamily: "var(--font-mono)",
  color: "var(--ok, #3dd68c)",
  fontSize: 11,
};

const paste: CSSProperties = {
  gridColumn: "1 / -1",
  color: "var(--tx-faint)",
  fontSize: 11,
};

const kitHint: CSSProperties = {
  margin: "10px 0 0",
  fontSize: 12,
  color: "var(--tx-lo)",
  lineHeight: 1.45,
};

const link: CSSProperties = {
  color: "var(--sig)",
  textDecoration: "none",
};
