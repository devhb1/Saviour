"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";

/**
 * Centered verdict / action popup — not a full-height side drawer.
 * Esc + backdrop + explicit close; body scroll stays available under a soft veil.
 */
export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
  width = 420,
  dense = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  eyebrow?: string;
  children: ReactNode;
  width?: number;
  /** Tighter chrome for film notifications that must fit without scroll. */
  dense?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : "Panel"}
      style={{ ...overlay, padding: dense ? 10 : 16 }}
      onClick={onClose}
    >
      <aside
        className="verdict-pop stamp-in"
        style={{
          ...panel,
          ...(dense ? panelDense : null),
          maxWidth: `min(${width}px, calc(100vw - 28px))`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            marginBottom: dense ? 6 : 14,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            {eyebrow ? (
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: dense ? 9 : 11,
                  letterSpacing: "0.12em",
                  color: "var(--sig)",
                  textTransform: "uppercase",
                }}
              >
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <p
                style={{
                  margin: eyebrow ? (dense ? "2px 0 0" : "8px 0 0") : 0,
                  fontFamily: "var(--font-display)",
                  fontSize: dense ? 18 : 28,
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                  color: "var(--tx-hi)",
                  lineHeight: 1.1,
                }}
              >
                {title}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="verdict-pop-close"
            style={{
              ...closeBtn,
              ...(dense
                ? { minWidth: 36, minHeight: 36, padding: "2px 6px", gap: 0 }
                : null),
            }}
          >
            <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>
              ×
            </span>
            <span style={{ fontSize: 10, letterSpacing: "0.06em" }}>ESC</span>
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 10000,
  background:
    "radial-gradient(ellipse at 50% 40%, rgba(8, 10, 14, 0.45), rgba(5, 7, 10, 0.72))",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const panel: CSSProperties = {
  width: "100%",
  maxHeight: "min(88vh, 720px)",
  overflowY: "auto",
  padding: "22px 22px 24px",
  background:
    "linear-gradient(165deg, color-mix(in srgb, var(--bg-raise) 92%, var(--sig) 8%), var(--bg-raise))",
  border: "1px solid color-mix(in srgb, var(--sig) 35%, var(--line-mid))",
  borderRadius: "var(--r-lg, 16px)",
  boxShadow:
    "0 24px 64px rgba(0, 0, 0, 0.45), 0 0 0 1px color-mix(in srgb, var(--sig) 18%, transparent), var(--lift)",
};

const panelDense: CSSProperties = {
  maxHeight: "min(72vh, 420px)",
  padding: "12px 14px 14px",
  overflowY: "auto",
};

const closeBtn: CSSProperties = {
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  minWidth: 44,
  minHeight: 44,
  border: "1px solid var(--line-mid)",
  background: "var(--bg-high)",
  color: "var(--tx-hi)",
  fontFamily: "var(--font-mono)",
  padding: "6px 10px",
  borderRadius: "var(--r-md)",
  cursor: "pointer",
  flexShrink: 0,
};
