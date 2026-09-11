"use client";

import type { CSSProperties } from "react";
import type { ScreenId } from "./AppShell";

/** Four-beat walkthrough matching primary nav. Home / Identity stay deep links. */
export const TOUR_STEPS: {
  id: string;
  label: string;
  screen: ScreenId;
  hint: string;
}[] = [
  { id: "live", label: "1 · Live", screen: "agents", hint: "story · Graph → ENS → $0" },
  { id: "registry", label: "2 · Registry", screen: "registry", hint: "ledger · EAC" },
  { id: "docs", label: "3 · Docs", screen: "docs", hint: "why · proof" },
  { id: "build", label: "4 · Build", screen: "developers", hint: "SDK · Bazantic" },
];

export function ProductTourRail({
  screen,
  onScreen,
}: {
  screen: ScreenId;
  onScreen: (s: ScreenId) => void;
}) {
  const activeIdx = (() => {
    if (screen === "agents" || screen === "home" || screen === "case") return 0;
    if (screen === "registry" || screen === "identity" || screen === "shield") return 1;
    if (screen === "docs") return 2;
    if (screen === "developers") return 3;
    return -1;
  })();

  return (
    <div
      style={{
        maxWidth: 1400,
        margin: "0 auto 14px",
        padding: "10px 12px",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-raise)",
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        boxShadow: "var(--edge)",
      }}
      aria-label="Product walkthrough"
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "var(--sig)",
          marginRight: 4,
        }}
      >
        WALKTHROUGH
      </span>
      {TOUR_STEPS.map((step, i) => {
        const active = activeIdx === i;
        const done = activeIdx > i;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onScreen(step.screen)}
            title={step.hint}
            style={{
              ...chip,
              borderColor: active
                ? "var(--sig)"
                : done
                  ? "var(--sig-line)"
                  : "var(--line)",
              color: active ? "var(--sig-hi)" : "var(--tx-lo)",
              fontWeight: active ? 700 : 500,
              background: active ? "var(--sig-wash)" : "transparent",
            }}
          >
            {step.label}
          </button>
        );
      })}
      <span
        style={{
          marginLeft: "auto",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--tx-faint)",
        }}
      >
        one product · four beats · ⌘K anytime
      </span>
    </div>
  );
}

const chip: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.04em",
  padding: "6px 10px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-chip)",
  background: "transparent",
  cursor: "pointer",
};
