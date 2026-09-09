"use client";

import type { CSSProperties } from "react";

type Variant = "light" | "inverse" | "glow";

const SRC: Record<Variant, string> = {
  light: "/brand/saviour-mark.jpg",
  inverse: "/brand/saviour-mark-inverse.jpg",
  glow: "/brand/saviour-mark-glow.jpg",
};

/** Modular S mark — primary is black-on-light for nav / favicon. */
export function BrandMark({
  size = 36,
  variant = "light",
  style,
}: {
  size?: number;
  variant?: Variant;
  style?: CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={SRC[variant]}
      alt=""
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: "cover",
        borderRadius: Math.max(6, Math.round(size * 0.18)),
        display: "block",
        flexShrink: 0,
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
