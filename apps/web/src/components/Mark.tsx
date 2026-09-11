"use client";

import type { CSSProperties, ReactNode } from "react";
import { BrandMark } from "./BrandMark";

/** Section label: // TITLE */
export function SectionMark({ children }: { children: string }) {
  return (
    <p
      style={{
        margin: 0,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--ink-muted)",
      }}
    >
      // {children}
    </p>
  );
}

export function StatusPill({
  live = true,
  children,
}: {
  live?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
        alignSelf: "center",
        position: "relative",
        padding: "6px 12px",
        borderRadius: 2,
        border: "1px solid var(--line)",
        background: "var(--surface)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--ink)",
        whiteSpace: "nowrap",
        maxWidth: "100%",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          flexShrink: 0,
          borderRadius: "50%",
          background: live ? "var(--signal-bright)" : "var(--warn)",
        }}
      />
      {children}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        padding: "16px 14px",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-chip, 4px)",
        background: "var(--surface)",
        minWidth: 0,
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "10px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: 28,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: accent ? "var(--signal)" : "var(--ink)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </p>
      <p
        style={{
          margin: "8px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-muted)",
          lineHeight: 1.4,
        }}
      >
        {hint}
      </p>
    </div>
  );
}

export function StageCard({
  n,
  category,
  title,
  body,
  highlight,
}: {
  n: string;
  category: string;
  title: string;
  body: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        padding: 16,
        border: highlight ? "1px solid var(--signal)" : "1px solid var(--line)",
        borderRadius: 4,
        background: highlight ? "var(--bg-high)" : "var(--bg-raise)",
        boxShadow: highlight ? "var(--glow-sig)" : "var(--edge)",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "baseline",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--ink-muted)",
          }}
        >
          {n}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
          }}
        >
          {category}
        </span>
      </div>
      <p
        style={{
          margin: "12px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: "-0.02em",
        }}
      >
        {highlight ? (
          <span
            style={{
              background: "var(--sig)",
              color: "var(--bg-void)",
              padding: "2px 8px",
              borderRadius: "var(--r-sm)",
            }}
          >
            {title}
          </span>
        ) : (
          title
        )}
      </p>
      <p
        style={{
          margin: "10px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--ink-muted)",
          lineHeight: 1.5,
        }}
      >
        {body}
      </p>
    </div>
  );
}

export function DarkThesis({
  headline,
  body,
  pills,
}: {
  headline: ReactNode;
  body: ReactNode;
  pills: string[];
}) {
  return (
    <div
      className="on-night"
      style={{
        marginTop: 28,
        padding: "28px 24px",
        borderRadius: 8,
        background: "var(--night)",
        color: "var(--mark-on-night)",
        backgroundImage:
          "radial-gradient(color-mix(in srgb, var(--signal-bright) 18%, transparent) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -12,
          top: -12,
          opacity: 0.14,
          pointerEvents: "none",
        }}
      >
        {/* large watermark — paper tone so it reads on night */}
        <BrandMark size={180} tone="paper" />
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "clamp(22px, 3.5vw, 32px)",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          maxWidth: 720,
          position: "relative",
        }}
      >
        {headline}
      </p>
      <p
        style={{
          margin: "16px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          lineHeight: 1.6,
          color: "color-mix(in srgb, var(--mark-on-night) 72%, transparent)",
          maxWidth: 640,
          position: "relative",
        }}
      >
        {body}
      </p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 20,
          position: "relative",
        }}
      >
        {pills.map((p) => (
          <span
            key={p}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "6px 10px",
              border: "1px solid var(--night-line)",
              borderRadius: 6,
              color: "var(--mark-on-night)",
            }}
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}

export function HonestyRow({
  label,
  detail,
}: {
  label: string;
  detail: string;
}) {
  return (
    <div
      className="honesty-row"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(140px, 220px) minmax(0, 1fr)",
        gap: 16,
        padding: "14px 0",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <strong
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {label}
      </strong>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--ink-muted)",
          lineHeight: 1.5,
        }}
      >
        {detail}
      </p>
    </div>
  );
}

export function MarkMark({ children }: { children: ReactNode }) {
  return (
    <mark
      style={{
        background: "var(--sig)",
        color: "var(--bg-void)",
        padding: "0 6px",
        borderRadius: "var(--r-sm)",
        fontStyle: "normal",
      }}
    >
      {children}
    </mark>
  );
}

export const markGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 12,
};

export const stageGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  marginTop: 18,
};
