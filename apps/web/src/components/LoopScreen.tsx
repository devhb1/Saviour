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
import { EnsPassport } from "./EnsPassport";
import { BazanticPayPanel } from "./BazanticPayPanel";
import { AgentClientConsole } from "./AgentClientConsole";
import { Sheet } from "../ui";
import { useSavioursCheck } from "../lib/useSavioursCheck";
import { fetchJson } from "../lib/fetchJson";
import { writeHeaders } from "../lib/writeGuard";

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
  onOpenPlayground,
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
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [eac, setEac] = useState<{
    reverted?: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [eacBusy, setEacBusy] = useState(false);
  const playRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      onMemoryHit?.();
    }
  }, [stage, result, onMemoryHit]);

  const playAll = useCallback(() => {
    setStage(0);
    setPlaying(true);
    setEac(null);
    setEvidenceOpen(false);
  }, []);

  async function probeEac() {
    setEacBusy(true);
    setEac(null);
    try {
      const json = await fetchJson<{
        reverted?: boolean;
        message?: string;
        error?: string;
      }>("/api/govern/eac-probe", {
        method: "POST",
        headers: { "content-type": "application/json", ...writeHeaders() },
        body: JSON.stringify({ address: HERO }),
      });
      setEac(json);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "EAC probe failed";
      setEac({ reverted: /revert/i.test(msg), message: msg, error: msg });
    } finally {
      setEacBusy(false);
    }
  }

  const meta = STAGES[stage];

  return (
    <section
      className="app-content rise"
      style={{
        minHeight: "calc(100vh - 180px)",
        display: "flex",
        flexDirection: "column",
        paddingBottom: 72,
      }}
    >
      {/* Stepper */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 24,
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
                  padding: "10px 14px",
                  border: "none",
                  borderBottom: on
                    ? "2px solid var(--sig)"
                    : done
                      ? "2px solid var(--safe)"
                      : "2px solid transparent",
                  background: "transparent",
                  cursor: "pointer",
                  minWidth: 100,
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
                    marginTop: 4,
                    fontSize: 11,
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
          margin: "0 0 20px",
          fontFamily: "var(--font-display)",
          fontSize: "var(--t-h2)",
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
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(240px, 0.9fr)",
            gap: 24,
          }}
        >
          <div>
            <AgentClientConsole address={HERO} />
            <div style={{ marginTop: 16 }}>
              <BazanticPayPanel
                demoAddress={HERO}
                evidenceAddress={HERO}
                variant="compact"
              />
            </div>
          </div>
          <aside style={asideCard}>
            <p style={asideEyebrow}>WHAT JUST HAPPENED</p>
            <AsideRow k="ENS read" v="MISS (first encounter)" />
            <AsideRow k="HTTP" v="402 Payment Required" />
            <AsideRow k="Price" v="$0.01 USDC" />
            <AsideRow k="Network" v="Base" />
            <AsideRow k="Payer" v="the agent — not this website" />
            <p style={{ ...asideLine, marginTop: 16 }}>{meta.line}</p>
          </aside>
        </div>
      ) : null}

      {stage === 1 ? (
        <div
          className="loop-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(240px, 0.9fr)",
            gap: 24,
          }}
        >
          <div>
            <FanOutConsole address={HERO} auto compact />
            <button
              type="button"
              onClick={() => setEvidenceOpen(true)}
              style={{ ...btnGhost, marginTop: 12 }}
            >
              View evidence →
            </button>
          </div>
          <aside style={asideCard}>
            <p style={asideEyebrow}>STANDARDS LEVERAGE</p>
            <p
              style={{
                margin: "8px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--t-floor)",
                lineHeight: 1.55,
                color: "var(--tx-hi)",
              }}
            >
              5 templates → 8 live deployments → 3 excluded → 1 adapter
            </p>
            <p style={{ margin: "12px 0 0", fontSize: "var(--t-sm)", lineHeight: 1.5, color: "var(--tx-lo)" }}>
              <code style={{ color: "var(--sig)" }}>ATOMIC_MULTI_PROTOCOL</code>{" "}
              is a set intersection on the shared Messari <code>hash</code>.
              Without the standard it is eight integrations. AI explains and
              cites. Validator decides.
            </p>
            <p style={{ ...asideLine, marginTop: 16 }}>{meta.line}</p>
          </aside>
        </div>
      ) : null}

      {stage === 2 ? (
        <div
          className="loop-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(240px, 0.9fr)",
            gap: 24,
          }}
        >
          <div>
            <NamingCeremony
              address={HERO}
              status="TAINTED"
              threat="FLASHLOAN_ONE_SHOT,ATOMIC_MULTI_PROTOCOL"
              featured
              auto
            />
            <div style={{ marginTop: 16 }}>
              <EnsPassport
                address={HERO}
                status="TAINTED"
                threat="FLASHLOAN_ONE_SHOT,ATOMIC_MULTI_PROTOCOL"
                ensName={`${HERO}.saviours.eth`}
              />
            </div>
          </div>
          <aside style={asideCard}>
            <p style={asideEyebrow}>EAC · ROLE SEPARATION</p>
            <p style={{ margin: "8px 0 12px", fontSize: "var(--t-sm)", lineHeight: 1.5, color: "var(--tx-lo)" }}>
              Investigator may write verdict texts. Investigator may{" "}
              <strong style={{ color: "var(--tx-hi)" }}>not</strong> write{" "}
              <code>saviours.dispute</code>.
            </p>
            <button
              type="button"
              onClick={() => void probeEac()}
              disabled={eacBusy}
              style={btnPrimary}
            >
              {eacBusy ? "Probing…" : "Watch it revert →"}
            </button>
            {eac ? (
              <p
                style={{
                  marginTop: 12,
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--t-floor)",
                  color: eac.reverted ? "var(--safe)" : "var(--warn)",
                  lineHeight: 1.45,
                }}
              >
                {eac.reverted
                  ? "✓ Reverted as expected"
                  : eac.message || eac.error || JSON.stringify(eac)}
              </p>
            ) : null}
            <p style={{ ...asideLine, marginTop: 16 }}>{meta.line}</p>
          </aside>
        </div>
      ) : null}

      {stage === 3 ? (
        <div
          className="loop-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 0.9fr)",
            gap: 24,
            alignItems: "start",
          }}
        >
          <aside style={asideCard}>
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
                size="hero"
                onCast={() => {
                  window.dispatchEvent(
                    new CustomEvent("saviours:open-kill-switch"),
                  );
                }}
              />
            ) : (
              <div
                style={{
                  minHeight: 240,
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
            <p
              style={{
                margin: "20px 0 0",
                fontFamily: "var(--font-display)",
                fontSize: "var(--t-h3)",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "var(--safe)",
                lineHeight: 1.25,
              }}
            >
              The first agent paid one cent. Every agent after it pays nothing.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              {onOpenBuild ? (
                <button type="button" onClick={onOpenBuild} style={btnPrimary}>
                  Add to your agent →
                </button>
              ) : null}
              {onOpenPlayground ? (
                <button type="button" onClick={onOpenPlayground} style={btnGhost}>
                  Open Playground
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Sticky prev / next */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          marginTop: "auto",
          paddingTop: 20,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          background:
            "linear-gradient(transparent, color-mix(in srgb, var(--bg-base) 92%, transparent) 30%, var(--bg-base))",
          paddingBottom: 8,
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
            alignSelf: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--t-floor)",
            color: "var(--tx-faint)",
          }}
        >
          {stage + 1} / 4
        </span>
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

      <Sheet
        open={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
        eyebrow="EVIDENCE"
        title="Graph fan-out rows"
        width={520}
      >
        <FanOutConsole address={HERO} auto={false} />
      </Sheet>

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
