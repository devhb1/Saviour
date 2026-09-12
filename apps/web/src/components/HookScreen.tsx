"use client";

import { useEffect, useRef, useState } from "react";
import {
  btnGhost,
  btnPrimary,
  fieldStyle,
  HOME_CHIPS,
  DEMO_TARGETS,
} from "./AppShell";
import { VerdictCard } from "./VerdictCard";
import { useSavioursCheck } from "../lib/useSavioursCheck";

const DEFAULT = DEMO_TARGETS[0].address;

/** Plain-language chip → address. Never show ATTACK-1 ids on the Hook. */
const CHIPS = HOME_CHIPS.map((c) => ({
  label: c.plain,
  address: c.address,
}));

const PARTNERS = ["The Graph", "ENSv2", "Bazantic"] as const;

/**
 * ENDGAME Phase 1 — The Hook.
 * One viewport. Preloaded BLOCK. USP in ≤10 seconds. No Graph/ENS/Bazantic essay.
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
  const bumpedKey = useRef<string | null>(null);

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

  return (
    <section
      className="app-content rise"
      style={{
        minHeight: "calc(100vh - 160px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        paddingBottom: 32,
      }}
    >
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
            Investigate once on The Graph. Name it on ENS. Every agent after you
            resolves it for $0.
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
              Example: a known exploiter — try your own
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

        <div className="rise-delay-1">
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
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 14,
            }}
            aria-label="Partner stack"
          >
            {PARTNERS.map((p) => (
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
          paddingTop: 40,
          textAlign: "center",
        }}
      >
        <button
          type="button"
          onClick={onOpenLoop}
          style={{
            background: "none",
            border: "none",
            color: "var(--sig)",
            fontFamily: "var(--font-body)",
            fontSize: "var(--t-sm)",
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: 4,
          }}
        >
          See the loop →
        </button>
      </p>

      <style>{`
        @media (max-width: 860px) {
          .hook-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
