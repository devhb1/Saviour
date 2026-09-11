"use client";

import type { CSSProperties } from "react";

type Tone = "ink" | "paper" | "glow";

/** Mark — white on the dark surface; `glow` adds a signal halo. */
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
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src="/brand/saviour-mark-white.png"
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
            ? "drop-shadow(0 0 14px color-mix(in srgb, var(--sig-hi) 60%, transparent))"
            : undefined,
        opacity: tone === "ink" ? 0.94 : 1,
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
