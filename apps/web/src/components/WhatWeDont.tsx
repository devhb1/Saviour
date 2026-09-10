"use client";

import type { CSSProperties } from "react";
import { HONESTY_BOUNDS } from "./AppShell";
import { SectionMark } from "./Mark";

/**
 * Sourcemark-style honesty — two-column label/body rows from HONESTY_BOUNDS.
 */
export function WhatWeDont({ compact }: { compact?: boolean }) {
  const items = HONESTY_BOUNDS.refusals;

  return (
    <aside
      style={{
        marginTop: compact ? 20 : 48,
        padding: compact ? "16px 16px" : "22px 22px",
        border: "1px solid color-mix(in srgb, var(--line) 75%, transparent)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface)",
      }}
      aria-label="What this does not do"
    >
      <SectionMark>{HONESTY_BOUNDS.title.toUpperCase()}</SectionMark>
      <p
        style={{
          margin: "10px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: compact ? 22 : 28,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
        }}
      >
        Stated plainly.
      </p>
      <p
        style={{
          margin: "8px 0 0",
          fontSize: 14,
          color: "var(--ink-muted)",
          maxWidth: 560,
          lineHeight: 1.5,
        }}
      >
        The refusal rule is worth little if we oversell everything else.
      </p>
      <div style={{ marginTop: 18 }}>
        {items.map((it, i) => {
          const n = String(i + 1).padStart(2, "0");
          const accent = it.title.includes("SAFE");
          return (
            <div
              key={it.title}
              className="honesty-row"
              style={{
                display: "grid",
                gridTemplateColumns: compact
                  ? "1fr"
                  : "minmax(180px, 260px) minmax(0, 1fr)",
                gap: compact ? 6 : 20,
                padding: "14px 0",
                borderTop: "1px solid color-mix(in srgb, var(--line) 70%, transparent)",
                background: accent
                  ? "color-mix(in srgb, var(--signal) 6%, transparent)"
                  : undefined,
                marginLeft: accent ? -8 : 0,
                marginRight: accent ? -8 : 0,
                paddingLeft: accent ? 8 : 0,
                paddingRight: accent ? 8 : 0,
                borderRadius: accent ? "var(--radius-sm)" : undefined,
              }}
            >
              <strong
                style={{
                  ...itemTitle,
                  color: accent ? "var(--signal)" : "var(--ink)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    color: accent ? "var(--signal)" : "var(--ink-faint)",
                    marginRight: 8,
                  }}
                >
                  {n}
                </span>
                ◇ {it.title}
              </strong>
              <p style={itemBody}>{it.body}</p>
            </div>
          );
        })}
      </div>
      {!compact ? (
        <p
          style={{
            margin: "8px 0 0",
            paddingTop: 14,
            borderTop: "1px solid color-mix(in srgb, var(--line) 70%, transparent)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-muted)",
            lineHeight: 1.55,
          }}
        >
          DETECTS: {HONESTY_BOUNDS.detects}
          <br />
          DOES NOT: {HONESTY_BOUNDS.doesNot}
        </p>
      ) : null}
    </aside>
  );
}

const itemTitle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-body)",
  fontSize: 14,
  fontWeight: 600,
  color: "var(--ink)",
  lineHeight: 1.4,
};

const itemBody: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--ink-muted)",
  lineHeight: 1.55,
};
