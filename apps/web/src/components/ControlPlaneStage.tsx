"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { HERO_ASSESS_PREVIEW } from "../lib/productStory";

/**
 * Full-bleed night control plane — Privilege Diff preview (static illustration).
 * Edge-to-edge under landing copy; not an inset marketing card.
 */
export function ControlPlaneStage() {
  const [reveal, setReveal] = useState(false);
  const p = HERO_ASSESS_PREVIEW;

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setReveal(true);
      return;
    }
    const t = window.setTimeout(() => setReveal(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      className="cp-stage"
      aria-hidden={false}
      aria-label="Illustrative Privilege Diff preview"
      style={{
        ...stage,
        opacity: reveal ? 1 : 0,
        transform: reveal ? "none" : "translateY(12px)",
      }}
    >
      <div className="cp-stage-glow" aria-hidden />
      <div style={stageInner}>
        <div style={stageTop}>
          <span style={monoLo}>TREASURY CONTROL PLANE</span>
          <span style={badge}>
            {p.decision} · {p.coverage}
          </span>
        </div>
        <p style={headline}>{p.headline}</p>
        <p style={vault}>Affected Safe · {p.vault}</p>

        <dl style={rows}>
          {p.rows.map((r) => (
            <div key={r.k} className="cp-stage-row" style={row}>
              <dt style={monoLo}>{r.k}</dt>
              <dd style={rowVal}>{r.v}</dd>
            </div>
          ))}
        </dl>

        <p style={{ ...monoLo, marginTop: 18, letterSpacing: "0.08em" }}>
          WHY FLAGGED
        </p>
        <ul style={whyList}>
          {p.why.map((w) => (
            <li key={w} style={{ marginBottom: 6 }}>
              {w}
            </li>
          ))}
        </ul>
        <p style={{ ...monoLo, marginTop: 16, lineHeight: 1.4 }}>
          Evidence · {p.evidence}
          <br />
          Illustrative interface — not a live finding
        </p>
      </div>
    </div>
  );
}

const stage: CSSProperties = {
  position: "relative",
  background: "var(--night, #06090e)",
  color: "var(--mark-on-night, #f2f5f9)",
  minHeight: "min(72vh, 640px)",
  display: "flex",
  alignItems: "stretch",
  transition: "opacity 650ms ease, transform 650ms ease",
  overflow: "hidden",
};

const stageInner: CSSProperties = {
  position: "relative",
  zIndex: 1,
  width: "100%",
  maxWidth: 560,
  marginLeft: "auto",
  padding: "clamp(28px, 5vw, 48px) clamp(20px, 4vw, 40px)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const stageTop: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
  marginBottom: 14,
};

const monoLo: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.08em",
  color: "color-mix(in srgb, var(--mark-on-night) 55%, transparent)",
};

const badge: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.06em",
  color: "var(--amber, #ffb224)",
  border: "1px solid color-mix(in srgb, var(--amber) 50%, transparent)",
  padding: "3px 8px",
};

const headline: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: "clamp(18px, 2.4vw, 24px)",
  fontWeight: 600,
  letterSpacing: "-0.03em",
  lineHeight: 1.25,
};

const vault: CSSProperties = {
  margin: "8px 0 0",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "color-mix(in srgb, var(--mark-on-night) 65%, transparent)",
};

const rows: CSSProperties = {
  margin: "18px 0 0",
  display: "grid",
  gap: 0,
};

const row: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "110px 1fr",
  gap: 8,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  borderBottom: "1px solid color-mix(in srgb, var(--mark-on-night) 12%, transparent)",
  padding: "8px 0",
};

const rowVal: CSSProperties = {
  margin: 0,
  color: "var(--mark-on-night)",
};

const whyList: CSSProperties = {
  margin: "8px 0 0",
  padding: "0 0 0 16px",
  fontSize: 12,
  lineHeight: 1.45,
  color: "color-mix(in srgb, var(--mark-on-night) 88%, transparent)",
};
