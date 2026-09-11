"use client";

import type { CSSProperties } from "react";
import type { ScreenId } from "./AppShell";

/** ENDGAME film-order walkthrough — matches primary nav. */
export const TOUR_STEPS: {
  id: string;
  label: string;
  screen: ScreenId;
  hint: string;
}[] = [
  { id: "home", label: "1 · Home", screen: "home", hint: "danger · tracks" },
  { id: "live", label: "2 · Live", screen: "agents", hint: "Graph → ENS → $0" },
  { id: "shield", label: "3 · Shield", screen: "shield", hint: "decision first" },
  { id: "identity", label: "4 · Identity", screen: "identity", hint: "cast · EAC" },
  { id: "memory", label: "5 · Memory", screen: "registry", hint: "ledger" },
  { id: "build", label: "6 · Build", screen: "developers", hint: "SDK · Bazantic" },
];

export function ProductTourRail({
  screen,
  onScreen,
}: {
  screen: ScreenId;
  onScreen: (s: ScreenId) => void;
}) {
  const activeIdx = (() => {
    if (screen === "home") return 0;
    if (screen === "agents" || screen === "case") return 1;
    if (screen === "shield") return 2;
    if (screen === "identity") return 3;
    if (screen === "registry") return 4;
    if (screen === "developers" || screen === "docs") return 5;
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
        film order · ⌘K anytime · Docs at #docs
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
