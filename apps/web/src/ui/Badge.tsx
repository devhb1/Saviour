"use client";

import type { CSSProperties, ReactNode } from "react";

export type StatusTone =
  | "TAINTED"
  | "BLOCK"
  | "WATCH"
  | "WARN"
  | "SAFE"
  | "ALLOW"
  | "UNKNOWN"
  | "ESCALATE"
  | "HIT"
  | "PAID"
  | "neutral";

function toneOf(status: string): {
  color: string;
  wash: string;
  line: string;
  rail: "red" | "amber" | "green" | "violet" | "sig" | "none";
} {
  const s = status.toUpperCase();
  if (s === "TAINTED" || s === "BLOCK")
    return { color: "var(--red)", wash: "var(--red-wash)", line: "var(--red-line)", rail: "red" };
  if (s === "WATCH" || s === "WARN")
    return { color: "var(--amber)", wash: "var(--amber-wash)", line: "var(--amber-line)", rail: "amber" };
  if (s === "SAFE" || s === "ALLOW" || s === "HIT")
    return { color: "var(--green)", wash: "var(--green-wash)", line: "var(--green-line)", rail: "green" };
  if (s === "PAID")
    return { color: "var(--violet)", wash: "var(--violet-wash)", line: "var(--violet-line)", rail: "violet" };
  if (s === "ESCALATE")
    return { color: "var(--sig-hi)", wash: "var(--sig-wash)", line: "var(--sig-line)", rail: "sig" };
  return { color: "var(--tx-lo)", wash: "var(--bg-high)", line: "var(--line)", rail: "none" };
}

export function Badge({
  status,
  children,
  style,
}: {
  status: string;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const t = toneOf(status);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: "var(--r-pill)",
        background: t.wash,
        border: `1px solid ${t.line}`,
        color: t.color,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children ?? status}
    </span>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.1em",
        color: "var(--sig)",
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Pill({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-pill)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.06em",
        color: "var(--tx-lo)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export { toneOf };
