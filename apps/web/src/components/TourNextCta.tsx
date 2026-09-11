"use client";

import type { CSSProperties } from "react";
import { btnPrimary } from "./AppShell";
import type { ScreenId } from "./AppShell";

/** Single next-step CTA so the walkthrough feels like one product. */
export function TourNextCta({
  label,
  onNext,
  hint,
}: {
  label: string;
  onNext: () => void;
  hint?: string;
}) {
  return (
    <div
      style={{
        marginTop: 28,
        padding: "16px 18px",
        border: "1px solid color-mix(in srgb, var(--signal) 35%, var(--line))",
        borderRadius: "var(--radius-md)",
        background: "color-mix(in srgb, var(--signal) 6%, var(--surface))",
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: 720,
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.1em",
            color: "var(--signal)",
          }}
        >
          NEXT IN WALKTHROUGH
        </p>
        {hint ? (
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ink-muted)" }}>
            {hint}
          </p>
        ) : null}
      </div>
      <button type="button" onClick={onNext} style={btnPrimary}>
        {label}
      </button>
    </div>
  );
}

/** Must stay identical to STEPS order in AppShell: 01 → 05 → Build. */
export function nextScreenAfter(screen: ScreenId): ScreenId | null {
  if (screen === "home") return "agents";
  if (screen === "agents" || screen === "case") return "identity";
  if (screen === "identity") return "shield";
  if (screen === "shield") return "registry";
  if (screen === "registry") return "developers";
  if (screen === "docs") return "developers";
  return null;
}

export const tourNextStyle: CSSProperties = {};
