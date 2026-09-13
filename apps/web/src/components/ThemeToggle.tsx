"use client";

import { useTheme } from "./ThemeProvider";

/** Theme control — lives in the chrome utilities cluster with write-state. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
  const nextName = isLight ? "Signal Room" : "Daylight";
  const nextKind = isLight ? "dark" : "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={`Theme · switch to ${nextName} (${nextKind})`}
      aria-label={`Switch to ${nextKind} theme (${nextName})`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? 0 : 6,
        width: compact ? 28 : undefined,
        height: compact ? 28 : 28,
        minWidth: compact ? 28 : undefined,
        flexShrink: 0,
        padding: compact ? 0 : "0 8px",
        border: "none",
        borderRadius: "var(--radius-chip, 6px)",
        background: "transparent",
        color: "var(--tx-lo)",
        cursor: "pointer",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.04em",
        transition:
          "color var(--fast) var(--ease), background var(--fast) var(--ease)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-high, var(--bg-inset))";
        e.currentTarget.style.color = "var(--tx-hi)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--tx-lo)";
      }}
    >
      {isLight ? <MoonIcon /> : <SunIcon />}
      {!compact ? (
        <span style={{ textTransform: "uppercase" }}>
          {isLight ? "Day" : "Signal"}
        </span>
      ) : null}
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
