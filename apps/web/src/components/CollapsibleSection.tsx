"use client";

import { useEffect, useState, type ReactNode } from "react";

export type CollapsibleSectionProps = {
  title: string;
  summary: string;
  defaultOpen?: boolean;
  /** Controlled override (e.g. auto-open during forceFresh). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
};

/**
 * Collapse-by-default evidence/standards block. Closed = one clickable row.
 */
export function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  children,
}: CollapsibleSectionProps) {
  const [internal, setInternal] = useState(defaultOpen);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : internal;

  useEffect(() => {
    if (!controlled) setInternal(defaultOpen);
  }, [defaultOpen, controlled]);

  function toggle() {
    const next = !open;
    if (!controlled) setInternal(next);
    onOpenChange?.(next);
  }

  return (
    <div
      style={{
        marginTop: 16,
        border: "1px solid var(--line)",
        borderRadius: 4,
        background: "var(--bg-raise)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 14px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ minWidth: 0 }}>
          <span
            style={{
              display: "block",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
            }}
          >
            {title}
          </span>
          <span
            style={{
              display: "block",
              marginTop: 4,
              fontSize: 13,
              color: "var(--ink)",
              lineHeight: 1.4,
            }}
          >
            {summary}
          </span>
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--ink-muted)",
            flexShrink: 0,
            paddingTop: 2,
          }}
        >
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--line)" }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
