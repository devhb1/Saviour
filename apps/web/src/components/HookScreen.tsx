"use client";

import { useEffect, useState } from "react";
import { btnGhost, btnPrimary } from "./AppShell";
import { HowMemoryWorks } from "./HowMemoryWorks";
import { SystemFlowBoard } from "./SystemFlowBoard";
import {
  BRAND,
  HERO_ASSESS_PREVIEW,
  HERO_BODY,
  HERO_LINE_1,
  HERO_LINE_2,
  HERO_SOFT,
  heroBodySegments,
} from "../lib/productStory";

/**
 * V3 Hook — transaction assessment first.
 * Brand + one headline + one support + CTA group + dominant assess preview.
 * Address resolve is secondary (below the fold / secondary CTA).
 */
export function HookScreen({
  onOpenLoop,
  onOpenBuild,
}: {
  address: string;
  onAddress: (a: string) => void;
  onMemoryHit?: () => void;
  onOpenLoop: () => void;
  onOpenBuild: () => void;
  onOpenCast?: (a: string) => void;
}) {
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setReveal(true);
      return;
    }
    const t = window.setTimeout(() => setReveal(true), 80);
    return () => window.clearTimeout(t);
  }, []);

  const preview = HERO_ASSESS_PREVIEW;

  return (
    <div className="app-content">
      <section
        className="hook-v3-hero"
        style={{
          position: "relative",
          margin: "0 -4px",
          padding: "8px 4px 28px",
          minHeight: "min(72vh, 640px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          aria-hidden
          className="hook-v3-atmosphere"
          style={{
            position: "absolute",
            inset: "-8% -6% auto",
            height: "120%",
            background:
              "radial-gradient(ellipse 70% 55% at 18% 20%, color-mix(in srgb, var(--sig) 18%, transparent), transparent 60%), radial-gradient(ellipse 50% 40% at 88% 30%, color-mix(in srgb, var(--amber) 12%, transparent), transparent 55%)",
            pointerEvents: "none",
            opacity: reveal ? 1 : 0,
            transition: "opacity 700ms ease",
          }}
        />

        <div
          className="hook-grid"
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.05fr) minmax(280px, 0.95fr)",
            gap: "clamp(20px, 3vw, 40px)",
            alignItems: "center",
          }}
        >
          <div
            style={{
              opacity: reveal ? 1 : 0,
              transform: reveal ? "none" : "translateY(10px)",
              transition: "opacity 500ms ease, transform 500ms ease",
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 700,
                letterSpacing: "-0.045em",
                lineHeight: 1,
                color: "var(--tx-hi)",
              }}
            >
              {BRAND}
            </p>

            <p
              style={{
                margin: "14px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.04em",
                color: "var(--tx-lo)",
                maxWidth: 420,
                lineHeight: 1.45,
              }}
            >
              {HERO_SOFT}
            </p>

            <h1
              style={{
                margin: "12px 0 0",
                fontFamily: "var(--font-display)",
                fontSize: "clamp(26px, 4.2vw, 40px)",
                fontWeight: 700,
                letterSpacing: "-0.035em",
                lineHeight: 1.1,
                color: "var(--tx-hi)",
                maxWidth: 520,
              }}
            >
              <span style={{ display: "block" }}>{HERO_LINE_1}</span>
              <span
                className="hero-highlight"
                style={{
                  display: "inline-block",
                  marginTop: 4,
                  background:
                    "color-mix(in srgb, var(--amber) 22%, transparent)",
                  padding: "2px 8px 2px 6px",
                  borderRadius: 4,
                }}
              >
                {HERO_LINE_2}
              </span>
            </h1>

            <p
              style={{
                margin: "14px 0 0",
                fontSize: 14,
                lineHeight: 1.5,
                color: "var(--tx)",
                maxWidth: 460,
              }}
            >
              {heroBodySegments(HERO_BODY).map((seg, i) =>
                seg.bold ? (
                  <strong key={i} style={{ color: "var(--tx-hi)", fontWeight: 650 }}>
                    {seg.text}
                  </strong>
                ) : (
                  <span key={i}>{seg.text}</span>
                ),
              )}
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 22,
              }}
            >
              <a
                href="/review"
                style={{ ...btnPrimary, textDecoration: "none", padding: "11px 16px" }}
              >
                Review a transaction →
              </a>
              <a
                href="/watch"
                style={{ ...btnGhost, textDecoration: "none", padding: "11px 14px" }}
              >
                Watch for CRITICAL
              </a>
            </div>

            <p
              style={{
                margin: "14px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.05em",
                color: "var(--tx-faint)",
              }}
            >
              PRIVILEGE GUARD · STATIC DECODE ≠ FULL SIMULATION · SIGNER DECIDES
            </p>
          </div>

          {/* Dominant product visual — illustrative assess composition */}
          <div
            className="hook-v3-preview rise-delay-1"
            style={{
              opacity: reveal ? 1 : 0,
              transform: reveal ? "none" : "translateY(14px)",
              transition: "opacity 650ms ease 80ms, transform 650ms ease 80ms",
              borderTop: "1px solid var(--line-mid)",
              borderBottom: "1px solid var(--line-mid)",
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--bg-raise) 88%, var(--amber)), var(--bg-inset))",
              padding: "18px 16px 16px",
              minHeight: 320,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  color: "var(--tx-faint)",
                }}
              >
                TREASURY TRANSACTION REVIEW
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  color: "var(--amber)",
                  border: "1px solid color-mix(in srgb, var(--amber) 50%, var(--line))",
                  padding: "3px 8px",
                }}
              >
                {preview.decision} · {preview.coverage}
              </span>
            </div>

            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "clamp(18px, 2.2vw, 22px)",
                fontWeight: 600,
                letterSpacing: "-0.03em",
                lineHeight: 1.25,
                color: "var(--tx-hi)",
              }}
            >
              {preview.headline}
            </p>

            <p
              style={{
                margin: "8px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--tx-lo)",
              }}
            >
              Affected Safe · {preview.vault}
            </p>

            <dl
              style={{
                margin: "16px 0 0",
                display: "grid",
                gap: 8,
              }}
            >
              {preview.rows.map((r) => (
                <div
                  key={r.k}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "110px 1fr",
                    gap: 8,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    borderBottom: "1px solid var(--line)",
                    paddingBottom: 7,
                  }}
                >
                  <dt style={{ color: "var(--tx-faint)" }}>{r.k}</dt>
                  <dd style={{ margin: 0, color: "var(--tx-hi)" }}>{r.v}</dd>
                </div>
              ))}
            </dl>

            <p
              style={{
                margin: "14px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.06em",
                color: "var(--tx-faint)",
              }}
            >
              WHY FLAGGED
            </p>
            <ul
              style={{
                margin: "6px 0 0",
                padding: "0 0 0 16px",
                color: "var(--tx)",
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              {preview.why.map((w) => (
                <li key={w} style={{ marginBottom: 4 }}>
                  {w}
                </li>
              ))}
            </ul>

            <p
              style={{
                margin: "14px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--tx-faint)",
                lineHeight: 1.4,
              }}
            >
              Evidence · {preview.evidence}
              <br />
              Illustrative interface — not a live finding
            </p>
          </div>
        </div>
      </section>

      <section
        id="workflows"
        style={{
          padding: "28px 0 8px",
          borderTop: "1px solid var(--line)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.08em",
            color: "var(--tx-faint)",
          }}
        >
          TWO WORKFLOWS · SAME ENGINE
        </p>
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
          className="hook-v3-workflows"
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: 20,
                letterSpacing: "-0.03em",
                color: "var(--tx-hi)",
              }}
            >
              Review a transaction
            </h2>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 13,
                lineHeight: 1.5,
                color: "var(--tx)",
                maxWidth: 360,
              }}
            >
              Import Safe JSON or calldata. Verify hash integrity. Decode
              supported actions. See risk, coverage, and evidence — then sign
              elsewhere.
            </p>
            <a
              href="/review"
              style={{
                ...btnPrimary,
                display: "inline-block",
                marginTop: 12,
                textDecoration: "none",
              }}
            >
              Open review →
            </a>
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: 20,
                letterSpacing: "-0.03em",
                color: "var(--tx-hi)",
              }}
            >
              Monitor governance
            </h2>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 13,
                lineHeight: 1.5,
                color: "var(--tx)",
                maxWidth: 360,
              }}
            >
              Discover queued proposals, link vaults via AuthorityLink, write
              WATCH, resolve independently. Cancel, expire, and 72h quarantine.
            </p>
            <a
              href="/watch"
              style={{
                ...btnGhost,
                display: "inline-block",
                marginTop: 12,
                textDecoration: "none",
              }}
            >
              Start Watch →
            </a>
          </div>
        </div>
      </section>

      <section id="how-memory" style={{ paddingTop: 20, paddingBottom: 24 }}>
        <HowMemoryWorks compact />
        <SystemFlowBoard compact />
        <div
          style={{
            marginTop: 16,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <a href="/review" style={{ ...btnPrimary, textDecoration: "none" }}>
            Review a transaction →
          </a>
          <a href="/watch" style={{ ...btnGhost, textDecoration: "none" }}>
            Watch
          </a>
          <a href="/queues" style={{ ...btnGhost, textDecoration: "none" }}>
            Queue health
          </a>
          <button type="button" onClick={onOpenLoop} style={btnGhost}>
            Legacy investigate
          </button>
          <button type="button" onClick={onOpenBuild} style={btnGhost}>
            Build
          </button>
        </div>
      </section>

      <style>{`
        @media (max-width: 860px) {
          .hook-grid,
          .hook-v3-workflows {
            grid-template-columns: 1fr !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .hook-v3-atmosphere,
          .hook-v3-preview {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
