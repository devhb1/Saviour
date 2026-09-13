"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  btnGhost,
  btnPrimary,
  DEMO_TARGETS,
} from "./AppShell";
import { VerdictCard } from "./VerdictCard";
import { FanOutConsole } from "./FanOutConsole";
import { NamingCeremony } from "./NamingCeremony";
import { BazanticPayPanel } from "./BazanticPayPanel";
import { AgentClientConsole } from "./AgentClientConsole";
import { useSavioursCheck } from "../lib/useSavioursCheck";
import { GraphFanOutSvg } from "./GraphFanOutSvg";
import { AskPanel, type AskPacketClient } from "./AskPanel";
import type { FanOutProtocolChip } from "./StandardsRegistryPanel";
import { EacRoleBenches } from "./EacRoleBenches";
import { PARTNER_LINES } from "../lib/productStory";

type StageId = 0 | 1 | 2 | 3;

const STAGES: {
  id: StageId;
  n: string;
  title: string;
  subtitle: string;
  line: string;
}[] = [
  {
    id: 0,
    n: "①",
    title: "MISS",
    subtitle: "$0.01 · the agent pays",
    line: "The agent pays. Not the website.",
  },
  {
    id: 1,
    n: "②",
    title: "INVESTIGATE",
    subtitle: "The Graph · 1 template × 8",
    line: "A set intersection on a shared hash. Without the standard it's eight integrations.",
  },
  {
    id: 2,
    n: "③",
    title: "NAME",
    subtitle: "ENSv2 · the product",
    line: "The investigator key physically cannot write a dispute. Watch it revert.",
  },
  {
    id: 3,
    n: "④",
    title: "RESOLVE",
    subtitle: "$0 · memory hit",
    line: "Free because the first one paid.",
  },
];

const HERO = DEMO_TARGETS[0].address;

/**
 * ENDGAME Phase 2 — The Loop.
 * Four stages, one viewport each. ▶ Play auto-advances the film.
 */
export function LoopScreen({
  address,
  onAddress,
  onMemoryHit,
  onOpenPlayground: _onOpenPlayground,
  onOpenBuild,
}: {
  address: string;
  onAddress: (a: string) => void;
  onMemoryHit?: () => void;
  onOpenPlayground?: () => void;
  onOpenBuild?: () => void;
}) {
  const [stage, setStage] = useState<StageId>(0);
  const [playing, setPlaying] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);
  const [evidenceChips, setEvidenceChips] = useState<FanOutProtocolChip[]>([]);
  const [evidenceSignals, setEvidenceSignals] = useState<
    AskPacketClient["signals"]
  >([]);
  const [signalCeiling, setSignalCeiling] = useState<string | null>(null);
  const playRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bumpedStage = useRef<string | null>(null);

  const active = (address || HERO).trim().toLowerCase() || HERO;
  const { result, loading, refetch } = useSavioursCheck(
    stage === 3 ? active : null,
  );

  useEffect(() => {
    if (!playing) return;
    if (playRef.current) clearTimeout(playRef.current);
    playRef.current = setTimeout(() => {
      setStage((s) => {
        if (s >= 3) {
          setPlaying(false);
          return 3;
        }
        return (s + 1) as StageId;
      });
    }, stage === 1 ? 5500 : 3200);
    return () => {
      if (playRef.current) clearTimeout(playRef.current);
    };
  }, [playing, stage]);

  useEffect(() => {
    if (stage === 3) {
      onAddress(HERO);
      void refetch(HERO);
    }
  }, [stage, onAddress, refetch]);

  useEffect(() => {
    if (
      stage === 3 &&
      result &&
      (result.source === "ens" || result.source === "registry")
    ) {
      const key = `${HERO}:${result.decision}:${result.source}:stage3`;
      if (bumpedStage.current === key) return;
      bumpedStage.current = key;
      onMemoryHit?.();
    }
  }, [stage, result, onMemoryHit]);

  const playAll = useCallback(() => {
    setStage(0);
    setPlaying(true);
    setRawOpen(false);
  }, []);

  const meta = STAGES[stage];

  return (
    <section
      className="app-content rise loop-stage"
      style={{
        minHeight: "auto",
        display: "flex",
        flexDirection: "column",
        paddingBottom: 12,
      }}
    >
      {/* Stepper */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <nav
          aria-label="Loop stages"
          style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
        >
          {STAGES.map((s) => {
            const on = s.id === stage;
            const done = s.id < stage;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setStage(s.id);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  padding: "6px 10px",
                  border: "none",
                  borderBottom: on
                    ? "2px solid var(--sig)"
                    : done
                      ? "2px solid var(--safe)"
                      : "2px solid transparent",
                  background: "transparent",
                  cursor: "pointer",
                  minWidth: 88,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--t-floor)",
                    color: on ? "var(--sig)" : "var(--tx-faint)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {s.n} {s.title}
                </span>
                <span
                  style={{
                    marginTop: 2,
                    fontSize: 10,
                    color: "var(--tx-lo)",
                  }}
                >
                  {s.subtitle}
                </span>
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={playAll}
          disabled={playing}
          style={btnPrimary}
        >
          {playing ? "Playing…" : "▶ Play the whole loop"}
        </button>
      </div>

      <p
        style={{
          margin: "0 0 12px",
          fontFamily: "var(--font-display)",
          fontSize: "clamp(20px, 2.2vw, 26px)",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--tx-hi)",
          maxWidth: 640,
        }}
      >
        {meta.title === "MISS"
          ? "An address with no memory"
          : meta.title === "INVESTIGATE"
            ? "What the cent bought"
            : meta.title === "NAME"
              ? "The name is the product"
              : "The second agent"}
      </p>

      {/* Stage bodies */}
      {stage === 0 ? (
        <div
          className="loop-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.25fr) minmax(220px, 0.75fr)",
            gap: 16,
            alignItems: "start",
            minWidth: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <AgentClientConsole address={HERO} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            <BazanticPayPanel
              demoAddress={HERO}
              evidenceAddress={HERO}
              variant="rail"
            />
            <aside style={asideCard}>
              <p style={asideEyebrow}>WHAT JUST HAPPENED</p>
              <AsideRow k="ENS read" v="MISS (first encounter)" />
              <AsideRow k="HTTP" v="402 Payment Required" />
              <AsideRow k="Price" v="$0.01 USDC" />
              <AsideRow k="Payer" v="the agent — not this site" />
              <p style={{ ...asideLine, marginTop: 12 }}>{meta.line}</p>
            </aside>
          </div>
        </div>
      ) : null}

      {stage === 1 ? (
        <div
          className="loop-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.15fr) minmax(280px, 0.95fr)",
            gap: 14,
            alignItems: "start",
          }}
        >
          <div>
            {evidenceChips.length > 0 ? (
              <GraphFanOutSvg protocols={evidenceChips} compact />
            ) : (
              <p
                style={{
                  margin: "0 0 8px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--tx-faint)",
                }}
              >
                Fan-out loading… 1 Messari template → 8 deployments
              </p>
            )}
            <FanOutConsole
              address={HERO}
              auto
              compact
              onData={(payload) => {
                setEvidenceChips(
                  payload.protocols.map((p) => ({
                    protocol: p.protocol,
                    status: p.status,
                    ms: p.ms,
                    rowCount: p.rowCount,
                  })),
                );
                setEvidenceSignals(
                  (payload.signals ?? []).map((s) => ({
                    id: String(s.id ?? ""),
                    class: s.class ? String(s.class) : undefined,
                    detail: s.detail ? String(s.detail) : undefined,
                  })),
                );
                const ceiling = payload.signals?.[0]
                  ? payload.signals
                      .map((s) => String(s.id ?? ""))
                      .filter(Boolean)
                      .slice(0, 2)
                      .join(" ∧ ")
                  : null;
                setSignalCeiling(ceiling);
              }}
            />
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 12,
                lineHeight: 1.45,
                color: "var(--tx-lo)",
                maxWidth: 520,
              }}
            >
              <strong style={{ color: "var(--sig)" }}>The Graph · </strong>
              {PARTNER_LINES.graph}
            </p>
            <button
              type="button"
              onClick={() => setRawOpen((v) => !v)}
              style={{ ...btnGhost, marginTop: 8, padding: "6px 10px", fontSize: 12 }}
            >
              {rawOpen ? "Hide raw rows ↑" : "Expand raw ms / rows ↓"}
            </button>
            {rawOpen ? (
              <p
                style={{
                  margin: "8px 0 0",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--tx-lo)",
                  lineHeight: 1.5,
                }}
              >
                {evidenceChips
                  .map(
                    (c) =>
                      `${c.protocol}: ${c.ms ?? "—"}ms · ${c.rowCount ?? 0} rows · ${c.status}`,
                  )
                  .join(" · ") || "No rows yet"}
              </p>
            ) : null}
          </div>
          <aside style={{ ...asideCard, padding: "14px 14px" }}>
            <p style={asideEyebrow}>REASON · IN PLACE</p>
            <p
              style={{
                margin: "6px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                lineHeight: 1.45,
                color: "var(--tx-hi)",
              }}
            >
              5 templates → 8 live · 3 excluded · signal ceiling →{" "}
              <strong style={{ color: "var(--block)" }}>
                {signalCeiling ? `TAINTED (${signalCeiling})` : "TAINTED"}
              </strong>
            </p>
            <p
              style={{
                margin: "8px 0 12px",
                fontSize: 12,
                lineHeight: 1.4,
                color: "var(--tx-lo)",
              }}
            >
              AI cites evidence ids only.{" "}
              <code style={{ color: "var(--sig)" }}>validateAssessment</code>{" "}
              decides. Ask stays on this stage — never leaves the Loop.
            </p>
            <AskPanel
              compact
              packet={{
                address: HERO,
                status: "TAINTED",
                signals: evidenceSignals,
                protocols: evidenceChips
                  .filter((c) => c.status === "ok")
                  .map((c) => c.protocol)
                  .join(", "),
              }}
            />
          </aside>
        </div>
      ) : null}

      {stage === 2 ? (
        <div
          className="loop-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.15fr) minmax(220px, 0.85fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <NamingCeremony
            address={HERO}
            featured
            auto
            graphProtocols={evidenceChips}
            onJumpInvestigate={() => {
              setPlaying(false);
              setStage(1);
            }}
          />
          <aside style={asideCard}>
            <EacRoleBenches compact />
            <p style={{ ...asideLine, marginTop: 16 }}>{meta.line}</p>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 12,
                lineHeight: 1.45,
                color: "var(--tx-lo)",
              }}
            >
              <strong style={{ color: "var(--sig)" }}>ENS · </strong>
              {PARTNER_LINES.ens}
            </p>
          </aside>
        </div>
      ) : null}

      {stage === 3 ? (
        <div
          className="loop-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(200px, 0.75fr) minmax(0, 1.15fr)",
            gap: 14,
            alignItems: "start",
          }}
        >
          <aside style={{ ...asideCard, padding: "12px 12px" }}>
            <p style={asideEyebrow}>① FIRST AGENT · PAID</p>
            <AsideRow k="Path" v="MISS → 402 → investigate" />
            <AsideRow k="Cost" v="$0.01 USDC on Base" />
            <AsideRow k="Graph" v="8 deployments" />
            <AsideRow k="AI" v="1 explain call" />
          </aside>
          <div>
            {result ? (
              <VerdictCard
                address={HERO}
                decision={result.decision}
                status={result.status}
                plainVerdict={
                  result.reason || "flashloan-funded same-tx drain"
                }
                ensName={result.ensName}
                source={result.source}
                cost={{
                  graph: result.cost.graph,
                  ai: result.cost.ai,
                  usd: result.cost.usd,
                  latencyMs: result.latencyMs,
                }}
                size="inline"
                onCast={() => {
                  window.dispatchEvent(
                    new CustomEvent("saviours:open-kill-switch"),
                  );
                }}
                extra={
                  <p
                    style={{
                      margin: "10px 0 0",
                      fontFamily: "var(--font-display)",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--safe)",
                      lineHeight: 1.3,
                    }}
                  >
                    First agent paid one cent. Every agent after pays nothing.
                  </p>
                }
              />
            ) : (
              <div
                style={{
                  minHeight: 120,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--tx-faint)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--t-floor)",
                }}
              >
                {loading ? "Resolving…" : "Waiting"}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Sticky prev / next */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          marginTop: 16,
          paddingTop: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          background:
            "linear-gradient(transparent, color-mix(in srgb, var(--bg-base) 92%, transparent) 28%, var(--bg-base))",
          paddingBottom: 4,
          zIndex: 5,
        }}
      >
        <button
          type="button"
          disabled={stage === 0}
          onClick={() => {
            setPlaying(false);
            setStage((s) => Math.max(0, s - 1) as StageId);
          }}
          style={{
            ...btnGhost,
            opacity: stage === 0 ? 0.4 : 1,
          }}
        >
          ← Previous
        </button>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--t-floor)",
            color: "var(--tx-faint)",
          }}
        >
          {stage + 1} / 4
        </span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {stage === 3 && onOpenBuild ? (
            <button type="button" onClick={onOpenBuild} style={btnPrimary}>
              Add to your agent →
            </button>
          ) : null}
          <button
            type="button"
            disabled={stage === 3}
            onClick={() => {
              setPlaying(false);
              setStage((s) => Math.min(3, s + 1) as StageId);
            }}
            style={{
              ...btnPrimary,
              opacity: stage === 3 ? 0.4 : 1,
            }}
          >
            Next →
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .loop-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

function AsideRow({ k, v }: { k: string; v: string }) {
  return (
    <p
      style={{
        margin: "8px 0 0",
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        fontFamily: "var(--font-mono)",
        fontSize: "var(--t-floor)",
        lineHeight: 1.4,
      }}
    >
      <span style={{ color: "var(--tx-faint)" }}>{k}</span>
      <span style={{ color: "var(--tx-hi)", textAlign: "right" }}>{v}</span>
    </p>
  );
}

const asideCard = {
  padding: "18px 16px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  background: "var(--surface)",
  alignSelf: "start" as const,
};

const asideEyebrow = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-floor)",
  letterSpacing: "0.1em",
  color: "var(--sig)",
};

const asideLine = {
  margin: 0,
  fontSize: "var(--t-sm)",
  lineHeight: 1.45,
  color: "var(--tx)",
  fontWeight: 500,
};
