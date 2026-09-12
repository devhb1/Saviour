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
import { useSavioursCheck } from "../lib/useSavioursCheck";
import {
  HERO_FRAMING,
  HERO_MECHANISM,
  HERO_STATUS_PILL,
  PARTNER_STACK,
} from "../lib/productStory";

const DEFAULT = DEMO_TARGETS[0].address;

/** Plain-language chip → address. Never show ATTACK-1 ids on the Hook. */
const CHIPS = HOME_CHIPS.map((c) => ({
  label: c.plain,
  address: c.address,
}));

/**
 * ENDGAME Phase 1 — The Hook.
 * Fold 1: live memory theater. Fold 2: how memory works + system board.
 */
export function HookScreen({
  address,
  onAddress,
  onMemoryHit,
  onOpenLoop,
  onOpenBuild,
  onOpenCast,
}: {
  address: string;
  onAddress: (a: string) => void;
  onMemoryHit?: () => void;
  onOpenLoop: () => void;
  onOpenBuild: () => void;
  onOpenCast: (a: string) => void;
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
      {/* ── Fold 1: live theater ── */}
      <section
        className="rise hook-fold-1"
        style={{
          minHeight: "calc(100vh - 160px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingBottom: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <span
            className="hook-live-pill"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "var(--tx)",
              border: "1px solid var(--line)",
              borderRadius: 999,
              padding: "5px 12px",
              background: "var(--bg-inset)",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: "var(--safe, var(--green))",
                boxShadow: "0 0 0 3px color-mix(in srgb, var(--safe) 25%, transparent)",
              }}
            />
            {HERO_STATUS_PILL}
          </span>
        </div>

        <div
          className="hook-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.15fr) minmax(280px, 0.85fr)",
            gap: "clamp(24px, 4vw, 48px)",
            alignItems: "start",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "var(--t-hero)",
                fontWeight: 600,
                letterSpacing: "-0.035em",
                lineHeight: 1.08,
                color: "var(--tx-hi)",
                maxWidth: 640,
              }}
            >
              Your agent is about to sign with an address that already drained a
              protocol.
            </h1>

            <p
              style={{
                margin: "18px 0 0",
                fontSize: "var(--t-body)",
                lineHeight: 1.5,
                color: "var(--tx)",
                maxWidth: 520,
                fontWeight: 500,
              }}
            >
              Somebody proved it. Nobody wrote it down.
            </p>

            <p
              style={{
                margin: "14px 0 0",
                fontSize: "var(--t-sm)",
                lineHeight: 1.55,
                color: "var(--tx)",
                maxWidth: 480,
              }}
            >
              {HERO_MECHANISM}
            </p>

            <div style={{ marginTop: 28, maxWidth: 520 }}>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 12,
                  color: "var(--tx-lo)",
                  lineHeight: 1.4,
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
                  style={{ ...fieldStyle, flex: "1 1 220px", maxWidth: "none" }}
                />
                <button
                  type="button"
                  onClick={() => runCheck()}
                  disabled={loading}
                  style={btnPrimary}
                >
                  {loading ? "Checking…" : "CHECK"}
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 12,
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
                        padding: "7px 12px",
                        fontSize: 12,
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
                gap: 10,
                marginTop: 22,
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
                  marginTop: 16,
                  color: "var(--red)",
                  fontSize: "var(--t-sm)",
                }}
              >
                {error}
              </p>
            ) : null}
          </div>

          <div className="rise-delay-1 hook-verdict-col">
            <div
              className="hook-verdict-stage"
              style={{
                padding: 12,
                borderRadius: "var(--radius-md)",
                background:
                  "linear-gradient(160deg, var(--hero-plane-a), var(--hero-plane-b), var(--bg-inset))",
                border: "1px solid var(--line)",
              }}
            >
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
                  onCast={() => onOpenCast(active)}
                />
              ) : (
                <div
                  style={{
                    minHeight: 280,
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

            <div
              className="hook-live-strip ticker-in"
              aria-live="polite"
              style={{
                marginTop: 12,
                display: "flex",
                flexWrap: "wrap",
                gap: "6px 12px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--tx-lo)",
                lineHeight: 1.4,
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
                        : "var(--violet, #a89bff)",
                    }}
                  >
                    {memoryHit ? "$0 · MEMORY HIT" : `$${(result.cost.usd ?? 0).toFixed(2)}`}
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
                  ? "registry…"
                  : registry.failed
                    ? "— named"
                    : `${registry.named} named · ${registry.graphVerified} Graph-verified`}
              </span>
            </div>

            <div
              className="rise-delay-2"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 14,
              }}
              aria-label="Partner stack"
            >
              {PARTNER_STACK.map((p) => (
                <span
                  key={p}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.04em",
                    color: "var(--tx-lo)",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    padding: "5px 10px",
                    background: "var(--bg-inset)",
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p
          style={{
            marginTop: "auto",
            paddingTop: 36,
            textAlign: "center",
          }}
        >
          <a
            href="#how-memory"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("how-memory")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            style={{
              color: "var(--sig)",
              fontFamily: "var(--font-body)",
              fontSize: "var(--t-sm)",
              textDecoration: "underline",
              textUnderlineOffset: 4,
            }}
          >
            How memory works ↓
          </a>
        </p>
      </section>

      {/* ── Fold 2: stages + system board ── */}
      <section id="how-memory" style={{ paddingBottom: 48 }}>
        <HowMemoryWorks />
        <SystemFlowBoard />
        <div
          style={{
            marginTop: 28,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
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
          .hook-live-pill span[aria-hidden],
          .ticker-in {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
