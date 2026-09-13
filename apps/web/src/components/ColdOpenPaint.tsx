/**
 * Cold-open paint — CSS-only bars so Loop / Playground / Docs never flash blank white.
 * No fake protocol rows or verdicts.
 */
"use client";

import { useEffect, useState } from "react";

export function ColdOpenPaint({
  label = "Loading surface…",
}: {
  label?: string;
}) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(false), 280);
    return () => window.clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 2,
        pointerEvents: "none",
        padding: "24px 20px",
        background: "var(--bg, #0c0c0c)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <span
        className="skeleton"
        style={{ width: 96, height: 10, opacity: 0.7 }}
      />
      <span
        className="skeleton"
        style={{ width: "42%", height: 22, maxWidth: 280 }}
      />
      <span
        className="skeleton"
        style={{ width: "68%", height: 14, maxWidth: 420, opacity: 0.85 }}
      />
      <span
        className="skeleton"
        style={{
          width: "100%",
          height: 120,
          maxWidth: 640,
          marginTop: 8,
          opacity: 0.55,
        }}
      />
      <span
        style={{
          fontSize: 11,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--tx-lo)",
          marginTop: 4,
        }}
      >
        {label}
      </span>
    </div>
  );
}
