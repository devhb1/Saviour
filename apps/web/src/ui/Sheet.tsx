"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";

/**
 * Right slide-over panel for verdicts / command results.
 */
export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
  width = 420,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  eyebrow?: string;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : "Panel"}
      style={overlay}
      onClick={onClose}
    >
      <aside
        className="stamp-in"
        style={{ ...panel, width: `min(${width}px, 100vw)` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            marginBottom: 18,
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
                  margin: eyebrow ? "8px 0 0" : 0,
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                  color: "var(--tx-hi)",
                  lineHeight: 1.15,
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
            style={closeBtn}
          >
            Esc
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
  background: "rgba(5, 7, 10, 0.62)",
  backdropFilter: "blur(4px)",
  display: "flex",
  justifyContent: "flex-end",
};

const panel: CSSProperties = {
  height: "100%",
  maxWidth: "100%",
  overflowY: "auto",
  padding: "22px 20px 32px",
  background: "var(--bg-raise)",
  borderLeft: "1px solid var(--line-mid)",
  boxShadow: "var(--lift)",
};

const closeBtn: CSSProperties = {
  border: "1px solid var(--line)",
  background: "var(--bg-high)",
  color: "var(--tx-lo)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.06em",
  padding: "6px 10px",
  borderRadius: "var(--r-sm)",
  cursor: "pointer",
};
