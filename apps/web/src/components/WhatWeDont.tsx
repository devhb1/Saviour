"use client";

import type { CSSProperties } from "react";
import { HONESTY_BOUNDS } from "./AppShell";
import { SectionMark } from "./Mark";

/**
 * SourceMark-style honesty panel — production trust compounds when we refuse hype.
 * Copy is single-sourced from HONESTY_BOUNDS.refusals.
 */
export function WhatWeDont({ compact }: { compact?: boolean }) {
  const items = HONESTY_BOUNDS.refusals;

  return (
    <aside
      style={{
        marginTop: compact ? 20 : 36,
        padding: compact ? "14px 16px" : "18px 20px",
        border: "1px solid var(--line)",
        borderRadius: 2,
        background: "var(--surface)",
      }}
      aria-label="What this does not do"
    >
      <SectionMark>{HONESTY_BOUNDS.title.toUpperCase()}</SectionMark>
      <p
        style={{
          margin: "10px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: compact ? 20 : 24,
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
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: compact
            ? "1fr"
            : "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {items.map((it) => (
          <div
            key={it.title}
            style={{
              paddingTop: 10,
              borderTop: "1px solid var(--line)",
            }}
          >
            <p style={itemTitle}>{it.title}</p>
            <p style={itemBody}>{it.body}</p>
          </div>
        ))}
      </div>
      {!compact ? (
        <p
          style={{
            margin: "16px 0 0",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-muted)",
            lineHeight: 1.5,
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
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: "0.04em",
  color: "var(--ink)",
  fontWeight: 600,
};

const itemBody: CSSProperties = {
  margin: "6px 0 0",
  fontSize: 13,
  color: "var(--ink-muted)",
  lineHeight: 1.45,
};
