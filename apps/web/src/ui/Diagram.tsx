"use client";

import type { CSSProperties, ReactNode } from "react";

/** Caption + legend wrapper for precise line-art diagrams. */
export function Diagram({
  title,
  caption,
  legend,
  children,
}: {
  title: string;
  caption?: string;
  legend?: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure style={fig}>
      <figcaption style={cap}>{title}</figcaption>
      <div style={{ marginTop: 12, overflowX: "auto" }}>{children}</div>
      {caption ? <p style={note}>{caption}</p> : null}
      {legend ? <div style={{ marginTop: 10 }}>{legend}</div> : null}
    </figure>
  );
}

const fig: CSSProperties = {
  margin: 0,
  padding: "16px 16px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  background: "var(--bg-inset, var(--surface))",
};

const cap: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.1em",
  color: "var(--sig)",
};

const note: CSSProperties = {
  margin: "12px 0 0",
  fontSize: 12,
  color: "var(--tx-lo)",
  lineHeight: 1.45,
};
