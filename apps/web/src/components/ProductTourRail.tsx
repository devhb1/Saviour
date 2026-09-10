"use client";

import type { CSSProperties } from "react";
import type { ScreenId } from "./AppShell";

export const TOUR_STEPS: {
  id: string;
  label: string;
  screen: ScreenId;
  hint: string;
}[] = [
  { id: "problem", label: "1 · Problem", screen: "home", hint: "USP · tracks" },
  { id: "agents", label: "2 · Agents", screen: "agents", hint: "Graph → ENS → $0" },
  { id: "ens", label: "3 · ENS", screen: "identity", hint: "passport · cast" },
  { id: "memory", label: "4 · Memory", screen: "registry", hint: "ledger · EAC" },
  { id: "build", label: "5 · Build", screen: "developers", hint: "Bazantic · MCP" },
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
    if (screen === "identity" || screen === "shield") return 2;
    if (screen === "registry") return 3;
    if (screen === "developers") return 4;
    return -1;
  })();

  return (
    <div
      style={{
        maxWidth: 1400,
        margin: "0 auto 14px",
        padding: "10px 12px",
        border: "1px solid color-mix(in srgb, var(--line) 75%, transparent)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface)",
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
      }}
      aria-label="Product walkthrough"
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "var(--signal)",
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
                ? "var(--signal)"
                : done
                  ? "color-mix(in srgb, var(--signal) 35%, var(--line))"
                  : "var(--line)",
              color: active ? "var(--signal)" : "var(--ink-muted)",
              fontWeight: active ? 700 : 500,
              background: active
                ? "color-mix(in srgb, var(--signal) 10%, var(--surface))"
                : "transparent",
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
          color: "var(--ink-muted)",
        }}
      >
        one product · five beats
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
  borderRadius: "var(--radius-chip, 4px)",
  background: "transparent",
  cursor: "pointer",
};
