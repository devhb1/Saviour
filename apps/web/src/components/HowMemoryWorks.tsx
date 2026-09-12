"use client";

import type { CSSProperties } from "react";
import {
  HOW_MEMORY_EYEBROW,
  HOW_MEMORY_LEAD,
  HOW_MEMORY_TITLE,
  MEMORY_FOOTER,
  MEMORY_STAGES,
} from "../lib/productStory";

/**
 * SourceMark-style numbered stages — Signal Room tokens.
 * Step 05 is THE PRODUCT (name after validate).
 */
export function HowMemoryWorks({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <section
      aria-labelledby="how-memory-title"
      style={{
        marginTop: compact ? 0 : 28,
        paddingTop: compact ? 0 : 8,
      }}
    >
      <p style={eyebrow}>{HOW_MEMORY_EYEBROW}</p>
      <h2
        id="how-memory-title"
        style={{
          margin: "10px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: compact ? "clamp(22px, 3vw, 30px)" : "clamp(26px, 3.4vw, 36px)",
          fontWeight: 600,
          letterSpacing: "-0.03em",
          lineHeight: 1.15,
          color: "var(--tx-hi)",
          maxWidth: 640,
        }}
      >
        {HOW_MEMORY_TITLE}
      </h2>
      <p
        style={{
          margin: "12px 0 0",
          fontSize: "var(--t-sm)",
          lineHeight: 1.5,
          color: "var(--tx-lo)",
          maxWidth: 560,
        }}
      >
        {HOW_MEMORY_LEAD}
      </p>

      <div className="memory-stages-grid" style={grid}>
        {MEMORY_STAGES.map((s) => (
          <article
            key={s.n}
            className={s.product ? "memory-stage-product" : undefined}
            style={{
              ...cell,
              ...(s.product
                ? {
                    background:
                      "color-mix(in srgb, var(--sig) 12%, var(--bg-raise))",
                    borderColor:
                      "color-mix(in srgb, var(--sig) 45%, var(--line))",
                  }
                : null),
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 8,
              }}
            >
              <span style={num}>{s.n}</span>
              <span
                style={{
                  ...label,
                  color: s.product ? "var(--sig)" : "var(--tx-faint)",
                }}
              >
                {s.label}
              </span>
            </div>
            <h3
              style={{
                margin: "12px 0 0",
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: s.product ? "var(--sig)" : "var(--tx-hi)",
                ...(s.product
                  ? {
                      display: "inline",
                      boxDecorationBreak: "clone",
                      WebkitBoxDecorationBreak: "clone",
                      background:
                        "color-mix(in srgb, var(--sig) 22%, transparent)",
                      padding: "2px 6px",
                      borderRadius: 4,
                    }
                  : null),
              }}
            >
              {s.title}
            </h3>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 13,
                lineHeight: 1.45,
                color: "var(--tx-lo)",
              }}
            >
              {s.body}
            </p>
          </article>
        ))}
      </div>

      <p
        style={{
          margin: "22px 0 0",
          padding: "14px 16px",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-md, 8px)",
          borderLeft: "3px solid var(--safe, var(--green))",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: "0.02em",
          color: "var(--tx)",
          lineHeight: 1.45,
        }}
      >
        {MEMORY_FOOTER}
      </p>

      <style>{`
        .memory-stages-grid > article:nth-child(3n) {
          border-right: none;
        }
        .memory-stages-grid > article:nth-child(n + 4) {
          border-bottom: none;
        }
        @media (max-width: 900px) {
          .memory-stages-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .memory-stages-grid > article:nth-child(3n) {
            border-right: 1px solid var(--line);
          }
          .memory-stages-grid > article:nth-child(2n) {
            border-right: none;
          }
          .memory-stages-grid > article:nth-child(n + 4) {
            border-bottom: 1px solid var(--line);
          }
          .memory-stages-grid > article:nth-child(n + 5) {
            border-bottom: none;
          }
        }
        @media (max-width: 560px) {
          .memory-stages-grid {
            grid-template-columns: 1fr !important;
          }
          .memory-stages-grid > article {
            border-right: none !important;
            border-bottom: 1px solid var(--line) !important;
          }
          .memory-stages-grid > article:last-child {
            border-bottom: none !important;
          }
        }
      `}</style>
    </section>
  );
}

const eyebrow: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-floor, 11px)",
  letterSpacing: "0.08em",
  color: "var(--sig)",
};

const grid: CSSProperties = {
  marginTop: 24,
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 0,
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md, 8px)",
  overflow: "hidden",
  background: "var(--bg-raise)",
};

const cell: CSSProperties = {
  padding: "16px 16px 18px",
  borderRight: "1px solid var(--line)",
  borderBottom: "1px solid var(--line)",
  minHeight: 140,
};

const num: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--tx-faint)",
  letterSpacing: "0.04em",
};

const label: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};
