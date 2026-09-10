"use client";

import type { CSSProperties } from "react";
import { useTheme } from "./ThemeProvider";

type Tone = "ink" | "paper" | "glow";

/**
 * Modular S mark — textured PNG.
 * Auto-flips to white mark on Night (and any dark paper theme).
 */
export function BrandMark({
  size = 36,
  tone = "ink",
  style,
  className,
}: {
  size?: number;
  tone?: Tone;
  style?: CSSProperties;
  className?: string;
}) {
  const { theme } = useTheme();
  const darkPaper = theme === "night";
  const useWhite = tone === "paper" || tone === "glow" || (tone === "ink" && darkPaper);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={
        useWhite
          ? "/brand/saviour-mark-white.png"
          : "/brand/saviour-mark.png"
      }
      alt=""
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        display: "block",
        flexShrink: 0,
        filter:
          tone === "glow"
            ? "drop-shadow(0 0 12px color-mix(in srgb, var(--signal-bright) 55%, transparent))"
            : undefined,
        ...style,
      }}
    />
  );
}

export function BrandLockup({
  onClick,
  size = 32,
}: {
  onClick?: () => void;
  size?: number;
}) {
  const inner = (
    <>
      <BrandMark size={size} />
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: size >= 36 ? 26 : 20,
          fontWeight: 500,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          color: "var(--ink)",
          textTransform: "lowercase",
        }}
      >
        saviour
      </span>
    </>
  );

  if (!onClick) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        {inner}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        margin: 0,
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        textAlign: "left",
      }}
      aria-label="saviour home"
    >
      {inner}
    </button>
  );
}
