"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  btnGhost,
  btnPrimary,
  DEMO_TARGETS,
  HOME_CHIPS,
  fieldStyle,
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
import { ColdOpenPaint } from "./ColdOpenPaint";
import { PARTNER_LINES } from "../lib/productStory";
import { fetchJson } from "../lib/fetchJson";
import { clientWritesAllowed, writeHeaders } from "../lib/writeGuard";
import { HeroAtomicCard } from "./HeroAtomicCard";
import { GraphExplorePanel } from "./GraphExplorePanel";
import {
  strongestAtomicHero,
  type ProvenanceEvidence,
} from "./provenanceBuild";

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

type PersistOutcome = {
  persisted: boolean;
  reused?: boolean;
  status: string;
  ensName: string | null;
  reason?: string;
  incidentLabel?: string;
  ensTxHash?: string | null;
};

type InvestigatePersistJson = {
  assessment?: { status?: string };
  remember?: {
    persisted?: boolean;
    reason?: string;
    ensName?: string | null;
    incidentLabel?: string;
    ensTxHash?: string | null;
  };
  memoryHit?: boolean;
  shield?: { ensName?: string | null; source?: string };
  error?: string;
};

function asEnsTx(h?: string | null): string | null {
  return h && /^0x[a-fA-F0-9]{64}$/.test(h) ? h : null;
}

async function fetchNamedTx(address: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/resolve?address=${encodeURIComponent(address)}`);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      namedTx?: string | null;
      records?: Record<string, string>;
    };
    return (
      asEnsTx(json.namedTx) ?? asEnsTx(json.records?.["saviours.namedTx"] ?? null)
    );
  } catch {
    return null;
  }
}

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
  const [evidenceChips, setEvidenceChips] = useState<FanOutProtocolChip[]>([]);
  const [evidenceRows, setEvidenceRows] = useState<ProvenanceEvidence[]>([]);
  const [showProvenance, setShowProvenance] = useState(false);
  const [evidenceSignals, setEvidenceSignals] = useState<
    AskPacketClient["signals"]
  >([]);
  const [signalCeiling, setSignalCeiling] = useState<string | null>(null);
  const [impliedStatus, setImpliedStatus] = useState<string>("UNKNOWN");
  const [persistBusy, setPersistBusy] = useState(false);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [persistOutcome, setPersistOutcome] = useState<PersistOutcome | null>(
    null,
  );
  const persistKey = useRef<string | null>(null);
  const playRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bumpedStage = useRef<string | null>(null);

  const active = (address || HERO).trim().toLowerCase() || HERO;
  const [draft, setDraft] = useState(active);
  const atomicHero =
    evidenceRows.length > 0 ? strongestAtomicHero(evidenceRows) : null;
  const { result, loading, refetch } = useSavioursCheck(
    stage === 3 ? active : null,
  );

  useEffect(() => {
    if (!playing) return;
    if (stage === 2 && persistBusy) return;
    if (playRef.current) clearTimeout(playRef.current);
    playRef.current = setTimeout(() => {
      setStage((s) => {
        if (s >= 3) {
          setPlaying(false);
          return 3;
        }
        return (s + 1) as StageId;
      });
    }, stage === 1 ? 5500 : stage === 2 ? 4200 : 3200);
    return () => {
      if (playRef.current) clearTimeout(playRef.current);
    };
  }, [playing, stage, persistBusy]);

  useEffect(() => {
    setDraft(active);
    setPlaying(false);
    setStage(0);
    setShowProvenance(false);
    setEvidenceChips([]);
    setEvidenceRows([]);
    setEvidenceSignals([]);
    setSignalCeiling(null);
    setImpliedStatus("UNKNOWN");
    setPersistBusy(false);
    setPersistError(null);
    setPersistOutcome(null);
    persistKey.current = null;
  }, [active]);

  useEffect(() => {
    if (stage === 3) {
      void refetch(active);
    }
  }, [stage, active, refetch]);

  useEffect(() => {
    if (
      stage === 3 &&
      result &&
      (result.source === "ens" || result.source === "registry")
    ) {
      const key = `${active}:${result.decision}:${result.source}:stage3`;
      if (bumpedStage.current === key) return;
      bumpedStage.current = key;
      onMemoryHit?.();
    }
  }, [stage, result, onMemoryHit, active]);

  const playAll = useCallback(() => {
    setStage(0);
    setPlaying(true);
  }, []);

  const persistName = useCallback(async () => {
    const a = active;
    if (!/^0x[a-f0-9]{40}$/.test(a)) return;
    if (persistKey.current === a) return;
    persistKey.current = a;
    setPersistError(null);

    if (!clientWritesAllowed()) {
      setPersistOutcome({
        persisted: false,
        status: impliedStatus,
        ensName: null,
        reason: "writes_closed",
      });
      return;
    }

    setPersistBusy(true);
    try {
      const json = await fetchJson<InvestigatePersistJson>("/api/investigate", {
        method: "POST",
        headers: writeHeaders(),
        timeoutMs: 180_000,
        body: JSON.stringify({
          chainId: 1,
          address: a,
          persist: true,
          forceFresh: true,
          registryNetwork: "sepolia",
        }),
      });
      const status = json.assessment?.status ?? impliedStatus;
      if (json.remember?.persisted) {
        const ensTxHash =
          asEnsTx(json.remember.ensTxHash) ?? (await fetchNamedTx(a));
        setPersistOutcome({
          persisted: true,
          status,
          ensName: json.remember.ensName ?? `${a}.saviours.eth`,
          incidentLabel: json.remember.incidentLabel,
          ensTxHash,
        });
        window.dispatchEvent(new CustomEvent("saviours:headline-refresh"));
        return;
      }
      if (json.memoryHit) {
        const ensTxHash =
          asEnsTx(json.remember?.ensTxHash) ?? (await fetchNamedTx(a));
        setPersistOutcome({
          persisted: true,
          reused: true,
          status,
          ensName: json.shield?.ensName ?? `${a}.saviours.eth`,
          ensTxHash,
        });
        return;
      }
      setPersistOutcome({
        persisted: false,
        status,
        ensName: null,
        reason: json.remember?.reason ?? "not_named",
      });
    } catch (e) {
      try {
        const res = await fetch("/api/shield/check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chainId: 1,
            address: a,
            registryNetwork: "sepolia",
          }),
        });
        const json = (await res.json()) as {
          check?: {
            source?: string;
            ensName?: string | null;
            records?: Record<string, string>;
            decision?: string;
          };
        };
        const src = json.check?.source;
        if (src === "ens" || src === "registry") {
          const status =
            json.check?.records?.["saviours.status"]?.trim() ||
            (json.check?.decision === "BLOCK"
              ? "TAINTED"
              : json.check?.decision === "WARN"
                ? "WATCH"
                : impliedStatus);
          const ensTxHash =
            asEnsTx(json.check?.records?.["saviours.namedTx"] ?? null) ??
            (await fetchNamedTx(a));
          setPersistOutcome({
            persisted: true,
            status,
            ensName: json.check?.ensName ?? `${a}.saviours.eth`,
            ensTxHash,
          });
          window.dispatchEvent(new CustomEvent("saviours:headline-refresh"));
          return;
        }
      } catch {
        // fall through to error
      }
      persistKey.current = null;
      setPersistError(e instanceof Error ? e.message : "Remember failed");
      setPersistOutcome({
        persisted: false,
        status: impliedStatus,
        ensName: null,
        reason: "error",
      });
    } finally {
      setPersistBusy(false);
    }
  }, [active, impliedStatus]);

  useEffect(() => {
    if (stage !== 2) return;
    void persistName();
  }, [stage, persistName]);

  function commitAddress(next?: string) {
    const a = (next ?? draft).trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(a)) return;
    setDraft(a);
    setPlaying(false);
    setStage(0);
    setShowProvenance(false);
    if (a === active) {
      setEvidenceChips([]);
      setEvidenceRows([]);
      setEvidenceSignals([]);
      setSignalCeiling(null);
      setImpliedStatus("UNKNOWN");
      setPersistBusy(false);
      setPersistError(null);
      setPersistOutcome(null);
      persistKey.current = null;
      return;
    }
    onAddress(a);
  }

  const meta = STAGES[stage];

  return (
    <section
      className="app-content rise loop-stage"
      style={{
        position: "relative",
        minHeight: "auto",
        display: "flex",
        flexDirection: "column",
        paddingBottom: 12,
      }}
    >
      <ColdOpenPaint label="Loop" />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitAddress();
          }}
          placeholder="0x… paste any address — unnamed starts at MISS"
          aria-label="Address to run through the loop"
          spellCheck={false}
          style={{
            ...fieldStyle,
            flex: "1 1 240px",
            maxWidth: 480,
            padding: "8px 11px",
            fontSize: 12,
          }}
        />
        <button
          type="button"
          onClick={() => commitAddress()}
          style={{ ...btnPrimary, padding: "8px 14px" }}
        >
          Load into loop
        </button>
        {HOME_CHIPS.map((c) => {
          const on = c.address.toLowerCase() === active;
          return (
            <button
              key={c.address}
              type="button"
              onClick={() => commitAddress(c.address)}
              style={{
                ...btnGhost,
                padding: "4px 9px",
                fontSize: 11,
                borderColor: on ? "var(--sig)" : "var(--line)",
                color: on ? "var(--tx-hi)" : "var(--tx-lo)",
              }}
            >
              {c.plain}
            </button>
          );
        })}
      </div>
      <p
        style={{
          margin: "0 0 10px",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--tx-faint)",
          letterSpacing: "0.02em",
          wordBreak: "break-all",
        }}
      >
        {active}
        {active === HERO.toLowerCase()
          ? " · film hero"
          : " · custom target · starts at ① MISS"}
      </p>
      {/* Stepper */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: stage === 1 ? 8 : 12,
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
          margin: stage === 1 ? "0 0 8px" : "0 0 12px",
          fontFamily: "var(--font-display)",
          fontSize:
            stage === 1
              ? "clamp(18px, 2vw, 22px)"
              : "clamp(20px, 2.2vw, 26px)",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--tx-hi)",
          maxWidth: 640,
          lineHeight: 1.15,
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
            <AgentClientConsole key={active} address={active} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            <BazanticPayPanel
              key={active}
              demoAddress={active}
              evidenceAddress={active}
              variant="rail"
            />
            <aside style={asideCard}>
              <p style={asideEyebrow}>WHAT JUST HAPPENED</p>
              <AsideRow k="Target" v={`${active.slice(0, 8)}…${active.slice(-4)}`} />
              <AsideRow
                k="ENS read"
                v={
                  active === HERO.toLowerCase()
                    ? "film replay"
                    : "MISS (unnamed)"
                }
              />
              <AsideRow k="HTTP" v="402 Payment Required" />
              <AsideRow k="Price" v="$0.01 USDC" />
              <AsideRow k="Payer" v="the agent — not this site" />
              <p style={{ ...asideLine, marginTop: 12 }}>{meta.line}</p>
            </aside>
          </div>
        </div>
      ) : null}

      {stage === 1 ? (
        showProvenance && evidenceRows.length > 0 ? (
          <div style={{ maxWidth: 960 }}>
            {atomicHero ? (
              <div style={{ marginBottom: 8 }}>
                <HeroAtomicCard hero={atomicHero} compact />
              </div>
            ) : null}
            <GraphExplorePanel
              address={active}
              evidence={evidenceRows}
              onClose={() => setShowProvenance(false)}
              closeLabel="← Back to fan-out"
              dense
              height={340}
            />
          </div>
        ) : (
        <div
          className="loop-grid loop-investigate"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(260px, 0.8fr)",
            gap: 10,
            alignItems: "start",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--tx-faint)",
                  letterSpacing: "0.04em",
                  lineHeight: 1.35,
                }}
              >
                {evidenceRows.length > 0
                  ? `${evidenceRows.length} evidence · same-tx ready`
                  : "Fan-out live · provenance after rows land"}
                {signalCeiling ? (
                  <>
                    {" · "}
                    <strong style={{ color: "var(--block)" }}>{signalCeiling}</strong>
                  </>
                ) : null}
              </p>
              <button
                type="button"
                disabled={evidenceRows.length === 0}
                onClick={() => setShowProvenance(true)}
                style={{
                  ...btnPrimary,
                  padding: "6px 11px",
                  fontSize: 12,
                  opacity: evidenceRows.length === 0 ? 0.45 : 1,
                }}
              >
                View provenance →
              </button>
            </div>

            {atomicHero ? (
              <div style={{ marginBottom: 6 }}>
                <HeroAtomicCard hero={atomicHero} compact />
              </div>
            ) : null}

            <div
              className="loop-investigate-split"
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 0.95fr) minmax(0, 1.05fr)",
                gap: 8,
                alignItems: "stretch",
              }}
            >
              {evidenceChips.length > 0 ? (
                <GraphFanOutSvg protocols={evidenceChips} compact />
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--tx-faint)",
                    padding: "8px 0",
                    border: "1px solid var(--sig-line)",
                    borderRadius: "var(--radius-md)",
                    minHeight: 168,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Fan-out loading…
                </p>
              )}
              <FanOutConsole
                key={active}
                address={active}
                auto
                compact
                dense
                onData={(payload) => {
                  setEvidenceChips(
                    payload.protocols.map((p) => ({
                      protocol: p.protocol,
                      status: p.status,
                      ms: p.ms,
                      rowCount: p.rowCount,
                    })),
                  );
                  setEvidenceRows(
                    (payload.evidence ?? []).map((e) => ({
                      id: String(e.id ?? ""),
                      source: String(e.source ?? "graph"),
                      claim: String(e.claim ?? ""),
                      protocol: e.protocol ? String(e.protocol) : undefined,
                      kind: e.kind ? String(e.kind) : undefined,
                      txHash: e.txHash ? String(e.txHash) : undefined,
                      subgraphId: e.subgraphId
                        ? String(e.subgraphId)
                        : undefined,
                      amountUSD:
                        typeof e.amountUSD === "number"
                          ? e.amountUSD
                          : undefined,
                      timestamp:
                        typeof e.timestamp === "number" ? e.timestamp : 0,
                      counterparty: e.counterparty
                        ? String(e.counterparty)
                        : undefined,
                    })),
                  );
                  setEvidenceSignals(
                    (payload.signals ?? []).map((s) => ({
                      id: String(s.id ?? ""),
                      class: s.class ? String(s.class) : undefined,
                      detail: s.detail ? String(s.detail) : undefined,
                    })),
                  );
                  const fromApi = payload.signalStatus;
                  const ceiling =
                    fromApi?.rule ||
                    (payload.signals?.[0]
                      ? payload.signals
                          .map((s) => String(s.id ?? ""))
                          .filter(Boolean)
                          .slice(0, 2)
                          .join(" ∧ ")
                      : null);
                  setSignalCeiling(ceiling);
                  setImpliedStatus(fromApi?.status || "UNKNOWN");
                }}
              />
            </div>
            <style>{`
              @media (max-width: 900px) {
                .loop-investigate-split { grid-template-columns: 1fr !important; }
              }
            `}</style>
          </div>
          <aside style={{ ...asideCard, padding: "10px 12px" }}>
            <p style={asideEyebrow}>REASON · IN PLACE</p>
            <p
              style={{
                margin: "4px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                lineHeight: 1.35,
                color: "var(--tx-hi)",
              }}
            >
              Signal ceiling →{" "}
              <strong
                style={{
                  color:
                    impliedStatus === "TAINTED"
                      ? "var(--block)"
                      : impliedStatus === "WATCH"
                        ? "var(--amber)"
                        : "var(--tx-hi)",
                }}
              >
                {impliedStatus}
                {signalCeiling ? ` (${signalCeiling})` : ""}
              </strong>
            </p>
            <p
              style={{
                margin: "6px 0 8px",
                fontSize: 11,
                lineHeight: 1.35,
                color: "var(--tx-lo)",
              }}
            >
              AI cites evidence only.{" "}
              <strong style={{ color: "var(--tx-hi)" }}>View provenance</strong>{" "}
              for same-tx edges.
            </p>
            <AskPanel
              compact
              packet={{
                address: active,
                status:
                  impliedStatus === "UNKNOWN" ? null : impliedStatus,
                signals: evidenceSignals,
                protocols: evidenceChips
                  .filter((c) => c.status === "ok")
                  .map((c) => c.protocol)
                  .join(", "),
              }}
            />
          </aside>
        </div>
        )
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
          <div>
            <div
              style={{
                marginBottom: 10,
                padding: "10px 12px",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-md)",
                background: persistBusy
                  ? "color-mix(in srgb, var(--sig) 8%, var(--surface))"
                  : persistOutcome?.persisted
                    ? "color-mix(in srgb, var(--safe) 8%, var(--surface))"
                    : "var(--surface)",
              }}
            >
              <p style={{ ...asideEyebrow, marginBottom: 4 }}>
                {persistBusy
                  ? "REMEMBER · WRITING SEPOLIA"
                  : persistOutcome?.persisted
                    ? persistOutcome.reused
                      ? "ALREADY NAMED"
                      : "NAMED ON ENS"
                    : "REMEMBER"}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: "var(--tx)",
                }}
              >
                {persistBusy
                  ? "Graph + validator → register <addr>.saviours.eth. This is the write — Shield cannot HIT until it lands."
                  : persistOutcome?.persisted
                    ? `${persistOutcome.status} · ${persistOutcome.ensName ?? `${active}.saviours.eth`}`
                    : persistOutcome?.reason === "writes_closed"
                      ? "This host is read-only. Open writes (SAVIOURS_ALLOW_WRITES=1) to Remember."
                      : persistOutcome?.reason === "status_not_persistable"
                        ? `Live Graph ceiling is ${persistOutcome.status || impliedStatus} — not WATCH/TAINTED, so we do not invent a name.`
                        : persistError
                          ? persistError
                          : "Waiting to name this address on ENSv2."}
              </p>
              {!persistBusy && persistOutcome?.persisted && persistOutcome.ensTxHash ? (
                <p
                  style={{
                    margin: "8px 0 0",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    lineHeight: 1.5,
                    color: "var(--tx-lo)",
                    wordBreak: "break-all",
                  }}
                >
                  Sepolia ENS tx{" "}
                  <a
                    href={`https://sepolia.etherscan.io/tx/${persistOutcome.ensTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--sig)" }}
                  >
                    {persistOutcome.ensTxHash}
                  </a>
                </p>
              ) : null}
              {!persistBusy &&
              persistOutcome &&
              !persistOutcome.persisted &&
              persistOutcome.reason !== "status_not_persistable" &&
              persistOutcome.reason !== "writes_closed" ? (
                <button
                  type="button"
                  onClick={() => {
                    persistKey.current = null;
                    void persistName();
                  }}
                  style={{ ...btnPrimary, marginTop: 8, padding: "7px 12px" }}
                >
                  Retry Remember →
                </button>
              ) : null}
            </div>
            <NamingCeremony
              key={`${active}:${persistOutcome?.persisted ? "named" : persistBusy ? "writing" : "pre"}`}
              address={active}
              status={
                persistOutcome?.status &&
                persistOutcome.status !== "UNKNOWN" &&
                persistOutcome.status !== "SAFE"
                  ? persistOutcome.status
                  : impliedStatus === "UNKNOWN" || impliedStatus === "SAFE"
                    ? undefined
                    : impliedStatus
              }
              featured
              auto
              graphProtocols={evidenceChips}
              namedTxHint={persistOutcome?.ensTxHash ?? null}
              onJumpInvestigate={() => {
                setPlaying(false);
                setStage(1);
              }}
            />
          </div>
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
            <p
              style={{
                margin: "10px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                lineHeight: 1.4,
                color: "var(--tx-faint)",
              }}
            >
              Graph-verified only if FLASHLOAN_ONE_SHOT ∧ ATOMIC → TAINTED on
              live fan-out. WATCH still names; it does not pad the Graph count.
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
                address={active}
                decision={result.decision}
                status={result.status}
                plainVerdict={
                  result.reason ||
                  (result.status === "UNKNOWN"
                    ? "no named memory — investigate first"
                    : result.status)
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
                      color:
                        result.source === "ens" || result.source === "registry"
                          ? "var(--safe)"
                          : "var(--amber)",
                      lineHeight: 1.3,
                    }}
                  >
                    {result.source === "ens" || result.source === "registry"
                      ? "First agent paid one cent. Every agent after pays nothing."
                      : persistBusy
                        ? "Name still writing — Shield cannot HIT until ENS lands."
                        : "Still unnamed. Stage ③ Remember must write ENS before this card is a HIT."}
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
          {stage === 3 ? (
            <>
              {onOpenPlayground ? (
                <button
                  type="button"
                  onClick={onOpenPlayground}
                  style={btnGhost}
                  title="Wallet gate · Graph · EAC · fleet — live power tools"
                >
                  Try Playground →
                </button>
              ) : null}
              {onOpenBuild ? (
                <button type="button" onClick={onOpenBuild} style={btnPrimary}>
                  Add to your agent →
                </button>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              disabled={stage === 2 && persistBusy}
              onClick={() => {
                setPlaying(false);
                setStage((s) => Math.min(3, s + 1) as StageId);
              }}
              style={{
                ...btnPrimary,
                opacity: stage === 2 && persistBusy ? 0.5 : 1,
              }}
            >
              {stage === 2 && persistBusy ? "Naming…" : "Next →"}
            </button>
          )}
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
