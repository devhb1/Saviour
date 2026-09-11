"use client";

import { useTheme } from "./ThemeProvider";

/** Two states, one control. Sits in the chrome utilities group. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "light" ? "Signal Room" : "Daylight";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={`Switch to ${next}`}
      aria-label={`Switch to ${next} theme`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 26,
        flexShrink: 0,
        padding: 0,
        border: "1px solid color-mix(in srgb, var(--line) 80%, transparent)",
        borderRadius: "var(--radius-chip, 8px)",
        background: "var(--surface)",
        color: "var(--tx-lo)",
        cursor: "pointer",
        transition: "color var(--fast) var(--ease), border-color var(--fast) var(--ease)",
      }}
    >
      {theme === "light" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.3" />
      <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <path d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6" />
        <path d="M3.2 3.2l1.15 1.15M11.65 11.65l1.15 1.15M12.8 3.2l-1.15 1.15M4.35 11.65L3.2 12.8" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M13.2 9.9A5.6 5.6 0 016.1 2.8a5.8 5.8 0 100 10.4 5.8 5.8 0 007.1-3.3z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
