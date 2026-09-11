"use client";

import type { CSSProperties, ReactNode } from "react";

export function Card({
  children,
  style,
  rail,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  rail?: "red" | "amber" | "green" | "violet" | "sig" | "none";
  className?: string;
}) {
  const railColor =
    rail === "red"
      ? "var(--red)"
      : rail === "amber"
        ? "var(--amber)"
        : rail === "green"
          ? "var(--green)"
          : rail === "violet"
            ? "var(--violet)"
            : rail === "sig"
              ? "var(--sig)"
              : undefined;

  return (
    <div
      className={className}
      style={{
        padding: "16px 16px",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-raise)",
        boxShadow: "var(--edge)",
        borderLeft: railColor ? `2px solid ${railColor}` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 10,
        alignItems: "baseline",
        marginBottom: title || eyebrow ? 12 : 0,
      }}
    >
      <div>
        {eyebrow ? (
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              color: "var(--sig)",
            }}
          >
            {eyebrow}
          </p>
        ) : null}
        {title ? (
          <p
            style={{
              margin: eyebrow ? "6px 0 0" : 0,
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--tx-hi)",
            }}
          >
            {title}
          </p>
        ) : null}
      </div>
      {right}
    </div>
  );
}
