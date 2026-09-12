"use client";

import type { CSSProperties } from "react";
import { useTheme } from "./ThemeProvider";

type Tone = "auto" | "ink" | "paper" | "glow";

const SRC: Record<"ink" | "paper" | "glow", string> = {
  /** Black modular S on light — Daylight chrome */
  ink: "/brand/saviours-mark-ink.png",
  /** White modular S on black — Night chrome / watermarks */
  paper: "/brand/saviours-mark-on-dark.png",
  /** Cyan glow mark — hero / signal moments */
  glow: "/brand/saviours-mark-glow.png",
};

function resolveTone(
  tone: Tone,
  theme: "light" | "dark",
): "ink" | "paper" | "glow" {
  if (tone === "auto") return theme === "light" ? "ink" : "paper";
  return tone;
}

/** Modular S mark from the designer set — theme-aware by default. */
export function BrandMark({
  size = 36,
  tone = "auto",
  style,
  className,
}: {
  size?: number;
  tone?: Tone;
  style?: CSSProperties;
  className?: string;
}) {
  const { theme } = useTheme();
  const resolved = resolveTone(tone, theme);
  const src = SRC[resolved];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={src}
      alt=""
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        display: "block",
        flexShrink: 0,
        borderRadius: size >= 48 ? 10 : size >= 28 ? 6 : 4,
        filter:
          resolved === "glow"
            ? "drop-shadow(0 0 14px color-mix(in srgb, var(--sig-hi, var(--signal)) 55%, transparent))"
            : undefined,
        opacity: resolved === "ink" ? 0.96 : 1,
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
        saviours
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
      aria-label="saviours home"
    >
      {inner}
    </button>
  );
}
