"use client";

import { SectionMark } from "./Mark";

/**
 * Atlas-style "What isn't built" — adjacent to Receipts so the honesty costs
 * something and makes every other claim believable.
 */
const ITEMS = [
  {
    title: "Memory is Sepolia, not mainnet ENS",
    body: "Evidence is mainnet Graph. Memory is Sepolia ENSv2. Stated ceiling — not a hidden one.",
  },
  {
    title: "One live TAINTED class",
    body: "Flashloan-atomic patterns are live-proven. We are not a general detector.",
  },
  {
    title: "DRAIN_FANIN ships as a rule, never filmed as a detection",
    body: "It has not fired on live data. We will not pretend it has.",
  },
  {
    title: "EAC is permissioned operators, not a dispute court",
    body: "Multi-investigator is V4. Wrong-role revert is real today.",
  },
  {
    title: "Paid settle needs a funded agent account",
    body: "On the public host, Shield's $0 path is live. The paid path settles from the agent's own Base account (local bazantic grant for film).",
  },
  {
    title: "No browser extension yet · wagmi package deferred",
    body: "@saviours/check is on npm (0.1.3). A signed browser extension and a first-class wagmi helper are not shipped — pre-sign gates use the SDK or raw shield/check today.",
  },
] as const;

export function WhatIsntBuilt() {
  return (
    <aside style={{ marginTop: 36 }} aria-label="What isn't built">
      <SectionMark>WHAT ISN&apos;T BUILT</SectionMark>
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
        Limits, stated at the same weight as claims.
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
        {ITEMS.map((it, i) => (
          <div
            key={it.title}
            className="honesty-row"
            style={{
              padding: "14px 18px",
              borderTop: i === 0 ? "none" : "1px solid var(--line)",
              display: "grid",
              gridTemplateColumns: "minmax(160px, 240px) minmax(0, 1fr)",
              gap: 16,
            }}
          >
            <strong
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                letterSpacing: "0.02em",
                color: "var(--ink)",
                lineHeight: 1.4,
              }}
            >
              {it.title}
            </strong>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: "var(--ink-muted)",
                lineHeight: 1.5,
              }}
            >
              {it.body}
            </p>
          </div>
        ))}
      </div>
    </aside>
  );
}
