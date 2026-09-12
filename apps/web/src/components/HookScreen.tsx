"use client";

import { useEffect, useRef, useState } from "react";
import {
  btnGhost,
  btnPrimary,
  fieldStyle,
  HOME_CHIPS,
  DEMO_TARGETS,
  useRegistryHeadline,
} from "./AppShell";
import { VerdictCard } from "./VerdictCard";
import { HowMemoryWorks } from "./HowMemoryWorks";
import { SystemFlowBoard } from "./SystemFlowBoard";
import { HeroCastPill } from "./HeroCastPill";
import { useSavioursCheck } from "../lib/useSavioursCheck";
import {
  HERO_BODY,
  HERO_FRAMING,
  HERO_LINE_1,
  HERO_LINE_2,
  HERO_SOFT,
  PARTNER_STACK,
  heroBodySegments,
} from "../lib/productStory";

const DEFAULT = DEMO_TARGETS[0].address;

const CHIPS = HOME_CHIPS.map((c) => ({
  label: c.plain,
  address: c.address,
}));

/**
 * Hook first viewport:
 * Left = thesis + check. Right = live BLOCK + kill-switch proof docked under it.
 * Cast never sits above the headline — it proves the card, not the slogan.
 */
export function HookScreen({
  address,
  onAddress,
  onMemoryHit,
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
  const [draft, setDraft] = useState(address || DEFAULT);
  const active = (address || DEFAULT).trim().toLowerCase();
  const { result, error, loading, refetch } = useSavioursCheck(active);
  const registry = useRegistryHeadline();
  const bumpedKey = useRef<string | null>(null);
  const [msShown, setMsShown] = useState(0);

  useEffect(() => {
    setDraft(active);
  }, [active]);

  useEffect(() => {
    if (!result || !onMemoryHit) return;
    if (result.source !== "ens" && result.source !== "registry") return;
    const key = `${active}:${result.decision}:${result.source}`;
    if (bumpedKey.current === key) return;
    bumpedKey.current = key;
    onMemoryHit();
  }, [active, result, onMemoryHit]);

  useEffect(() => {
    const target = result?.latencyMs ?? 0;
    if (!target) {
      setMsShown(0);
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setMsShown(target);
      return;
    }
    let frame = 0;
    const frames = 18;
    let raf = 0;
    const tick = () => {
      frame += 1;
      setMsShown(Math.round((target * frame) / frames));
      if (frame < frames) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result?.latencyMs, result?.decision, active]);

  function runCheck(next?: string) {
    const a = (next ?? draft).trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(a)) return;
    onAddress(a);
    void refetch(a);
  }

  const plain =
    result?.reason ||
    (result?.status === "TAINTED"
      ? "flashloan-funded same-tx drain"
      : result?.status === "WATCH"
        ? "bot-like flashloan profile — not proven theft"
        : result?.decision === "ESCALATE"
          ? "no named memory — escalate if needed"
          : null);

  const memoryHit =
    result && (result.source === "ens" || result.source === "registry");

  return (
    <div className="app-content">
      <section
        className="rise hook-fold-1"
        style={{ paddingTop: 2, paddingBottom: 4 }}
      >
        {/* Quiet context pills — not the sell */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 6,
            marginBottom: 10,
          }}
        >
          {(
            [
              { label: "SEPOLIA", live: false },
              { label: "ENS = API", live: false },
              {
                label: loading
                  ? "RESOLVING…"
                  : error
                    ? "RECONNECTING…"
                    : "LIVE",
                live: !loading && !error,
                warn: Boolean(error),
              },
            ] as const
          ).map((p) => (
            <span
              key={p.label}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.06em",
                color: "warn" in p && p.warn ? "var(--amber)" : "var(--tx-lo)",
                border: "1px solid var(--line)",
                borderRadius: 999,
                padding: "3px 9px",
                background: "var(--bg-inset)",
              }}
            >
              {p.live ? (
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: "var(--safe, var(--green))",
                    boxShadow:
                      "0 0 0 3px color-mix(in srgb, var(--safe) 25%, transparent)",
                  }}
                />
              ) : null}
              {p.label}
            </span>
          ))}
        </div>

        <div
          className="hook-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 0.92fr)",
            gap: "clamp(20px, 3vw, 36px)",
            alignItems: "start",
          }}
        >
          {/* LEFT — thesis first */}
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.4,
                color: "var(--tx)",
                fontWeight: 500,
                maxWidth: 480,
              }}
            >
              {HERO_SOFT}
            </p>

            <h1
              style={{
                margin: "8px 0 0",
                fontFamily: "var(--font-display)",
                fontSize: "clamp(30px, 4.6vw, 46px)",
                fontWeight: 700,
                letterSpacing: "-0.04em",
                lineHeight: 1.08,
                color: "var(--tx-hi)",
                maxWidth: 560,
              }}
            >
              <span style={{ display: "block" }}>{HERO_LINE_1}</span>
              <span
                className="hero-highlight"
                style={{
                  display: "inline-block",
                  whiteSpace: "nowrap",
                  background: "color-mix(in srgb, var(--sig) 26%, transparent)",
                  padding: "2px 8px 2px 6px",
                  borderRadius: 4,
                  color: "var(--tx-hi)",
                  marginTop: 2,
                }}
              >
                {HERO_LINE_2}
                <span className="hero-cursor" aria-hidden>
                  |
                </span>
              </span>
            </h1>

            <p
              style={{
                margin: "10px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.5,
                color: "var(--tx)",
                maxWidth: 480,
              }}
            >
              {heroBodySegments(HERO_BODY).map((seg, i) =>
                seg.bold ? (
                  <strong key={i} style={{ color: "var(--tx-hi)", fontWeight: 700 }}>
                    {seg.text}
                  </strong>
                ) : (
                  <span key={i}>{seg.text}</span>
                ),
              )}
            </p>

            <div style={{ marginTop: 14, maxWidth: 500 }}>
              <p
                style={{
                  margin: "0 0 5px",
                  fontSize: 11,
                  color: "var(--tx-lo)",
                  lineHeight: 1.35,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {HERO_FRAMING}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runCheck();
                  }}
                  placeholder="0x…"
                  aria-label="Address to check"
                  style={{
                    ...fieldStyle,
                    flex: "1 1 200px",
                    maxWidth: "none",
                    padding: "8px 11px",
                    fontSize: 12,
                  }}
                />
                <button
                  type="button"
                  onClick={() => runCheck()}
                  disabled={loading}
                  style={{ ...btnPrimary, padding: "8px 14px" }}
                >
                  {loading ? "Checking…" : "CHECK"}
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 7,
                }}
              >
                {CHIPS.map((c) => {
                  const on = c.address.toLowerCase() === active;
                  return (
                    <button
                      key={c.address}
                      type="button"
                      onClick={() => {
                        setDraft(c.address);
                        runCheck(c.address);
                      }}
                      style={{
                        ...btnGhost,
                        padding: "4px 9px",
                        fontSize: 11,
                        borderColor: on ? "var(--sig)" : "var(--line)",
                        color: on ? "var(--tx-hi)" : "var(--tx-lo)",
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 12,
              }}
            >
              <button type="button" onClick={onOpenLoop} style={btnPrimary}>
                See the loop →
              </button>
              <button type="button" onClick={onOpenBuild} style={btnGhost}>
                Add to your agent
              </button>
            </div>

            {error ? (
              <p
                role="alert"
                style={{
                  marginTop: 8,
                  color: "var(--red)",
                  fontSize: "var(--t-sm)",
                }}
              >
                {error}
              </p>
            ) : null}
          </div>

          {/* RIGHT — live memory + kill-switch proof as one composition */}
          <div className="rise-delay-1 hook-verdict-col">
            <div
              className="hook-demo-stack"
              style={{
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--line)",
                background:
                  "linear-gradient(165deg, var(--hero-plane-a), var(--hero-plane-b), var(--bg-inset))",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: 10 }}>
                {result ? (
                  <VerdictCard
                    address={active}
                    decision={result.decision}
                    status={result.status}
                    plainVerdict={plain}
                    ensName={result.ensName}
                    source={result.source}
                    cost={{
                      graph: result.cost.graph,
                      ai: result.cost.ai,
                      usd: result.cost.usd,
                      latencyMs: result.latencyMs,
                    }}
                    size="hero"
                    /* Kill-switch lives in HeroCastPill below — avoid two cast CTAs */
                  />
                ) : (
                  <div
                    style={{
                      minHeight: 168,
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--line)",
                      background: "var(--bg-inset)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--tx-faint)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--t-floor)",
                    }}
                  >
                    {loading ? "Resolving memory…" : "Waiting for check"}
                  </div>
                )}
              </div>

              {/* Proof coda — proves the BLOCK without our server */}
              <div
                style={{
                  borderTop: "1px solid color-mix(in srgb, var(--safe) 35%, var(--line))",
                  padding: "10px 10px 12px",
                  background:
                    "color-mix(in srgb, var(--safe) 7%, var(--bg-raise))",
                }}
              >
                <HeroCastPill address={active} />
              </div>
            </div>

            <div
              className="hook-live-strip ticker-in"
              aria-live="polite"
              style={{
                marginTop: 8,
                display: "flex",
                flexWrap: "wrap",
                gap: "4px 10px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--tx-lo)",
                lineHeight: 1.35,
              }}
            >
              {result ? (
                <>
                  <span>
                    {msShown}
                    <span style={{ color: "var(--tx-faint)" }}>ms</span>
                  </span>
                  <span style={{ color: "var(--tx-faint)" }}>·</span>
                  <span>source={result.source || "none"}</span>
                  <span style={{ color: "var(--tx-faint)" }}>·</span>
                  <span style={{ color: "var(--tx-hi)" }}>
                    {String(result.decision || "").toUpperCase()}
                  </span>
                  <span style={{ color: "var(--tx-faint)" }}>·</span>
                  <span
                    style={{
                      color: memoryHit
                        ? "var(--safe, var(--green))"
                        : "var(--amber)",
                    }}
                  >
                    {memoryHit
                      ? "$0 · MEMORY HIT"
                      : `$${(result.cost.usd ?? 0).toFixed(2)}`}
                  </span>
                </>
              ) : (
                <span style={{ color: "var(--tx-faint)" }}>
                  {loading ? "reading Sepolia…" : "awaiting check"}
                </span>
              )}
              <span style={{ color: "var(--tx-faint)" }}>·</span>
              <span>
                {registry.loading
                  ? "·· named"
                  : registry.failed
                    ? "— named"
                    : `${registry.named} named · ${registry.graphVerified} Graph`}
              </span>
            </div>

            <div
              className="rise-delay-2"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 8,
              }}
              aria-label="Partner stack"
            >
              {PARTNER_STACK.map((p) => (
                <span
                  key={p}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.04em",
                    color: "var(--tx-lo)",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    padding: "3px 7px",
                    background: "var(--bg-inset)",
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how-memory" style={{ paddingTop: 18, paddingBottom: 28 }}>
        <HowMemoryWorks compact />
        <SystemFlowBoard compact />
        <div
          style={{
            marginTop: 14,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <button type="button" onClick={onOpenLoop} style={btnPrimary}>
            See the loop →
          </button>
          <button type="button" onClick={onOpenBuild} style={btnGhost}>
            Add to your agent
          </button>
        </div>
      </section>

      <style>{`
        @media (max-width: 860px) {
          .hook-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-in,
          .hero-cursor {
            animation: none !important;
          }
        }
        .hero-cursor {
          display: inline;
          margin-left: 1px;
          font-weight: 400;
          color: var(--sig);
          animation: cursor-blink 1.1s step-end infinite;
        }
        .hook-demo-stack .cast-pill-hero {
          max-width: none;
          box-shadow: none;
          border: none;
          background: transparent;
          padding: 0;
        }
      `}</style>
    </div>
  );
}
