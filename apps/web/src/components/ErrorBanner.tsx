"use client";

import { useState, type ReactNode } from "react";
import { humanRpcError } from "@saviours/core";

/**
 * Designed error surface — never dump raw JSON / RPC URLs into the product UI.
 */
export function ErrorBanner({
  title,
  detail,
  children,
}: {
  title: string;
  detail?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const safe = detail ? humanRpcError(detail) : undefined;
  return (
    <div
      role="alert"
      style={{
        padding: "12px 14px",
        border: "1px solid color-mix(in srgb, var(--warn) 45%, var(--line))",
        borderRadius: "var(--radius-md)",
        background: "color-mix(in srgb, var(--warn) 8%, var(--surface))",
        color: "var(--tx)",
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      <div style={{ fontWeight: 600, color: "var(--warn)" }}>⚠ {title}</div>
      {children ? (
        <div style={{ marginTop: 6 }}>{children}</div>
      ) : safe ? (
        <div style={{ marginTop: 6, color: "var(--tx-lo)" }}>{safe}</div>
      ) : null}
      {detail && detail !== safe ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            marginTop: 8,
            border: "none",
            background: "transparent",
            color: "var(--tx-lo)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {open ? "Details ▾" : "Details ▸"}
        </button>
      ) : null}
      {open && detail ? (
        <pre
          style={{
            marginTop: 8,
            maxHeight: 160,
            overflow: "auto",
            fontSize: 11,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "var(--tx-faint)",
          }}
        >
          {humanRpcError(detail)}
        </pre>
      ) : null}
    </div>
  );
}
