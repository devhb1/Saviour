"use client";

import { startTransition, useEffect, useState } from "react";
import {
  CoverageStrip,
  DEMO_TARGETS,
  btnGhost,
  btnPrimary,
  fieldStyle,
} from "./AppShell";
import {
  ProvenanceGraph,
  type ProvenanceEvidence,
} from "./ProvenanceGraph";
import { HeroAtomicCard, StandardsLeverageStrip } from "./HeroAtomicCard";
import { StandardsRegistryPanel } from "./StandardsRegistryPanel";
import type { FanOutProtocolChip } from "./StandardsRegistryPanel";
import { VerifiedRulePathsStrip } from "./VerifiedRulePathsStrip";
import { AttackTimeline } from "./AttackTimeline";
import { AiCitePanel } from "./AiCitePanel";
import { AttackBotContrast } from "./AttackBotContrast";
import { EnsIdentityCard } from "./EnsIdentityCard";
import {
  buildAttackTimeline,
  strongestAtomicHero,
} from "./provenanceBuild";
import { writeHeaders, clientWritesAllowed } from "../lib/writeGuard";
import { fetchJson } from "../lib/fetchJson";
import { formatConfidencePct } from "@saviours/core/confidence";

type Signal = {
  id: string;
  class: string;
  detail: string;
  evidenceIds: string[];
};

type InvestigateResult = {
  assessment?: {
    status: string;
    confidence: number;
    evidence?: { id: string; claim?: string; txHash?: string }[];
    threatTypes?: string[];
    modelVersion?: string;
    rulesVersion?: string;
  };
  signals?: Signal[];
  banner?: string | null;
  protocols?: FanOutProtocolChip[];
  excluded?: Array<{ protocol: string; reason: string }>;
  explanation?: string | null;
  cost?: {
    graphQueries: number;
    aiCalls: number;
    shieldChecks: number;
    ensResolutions: number;
    latencyMs: number;
    usedAi: boolean;
    memoryHit: boolean;
  };
  memoryHit?: boolean;
  shield?: {
    decision: string;
    reason: string;
    source: string;
    usedAi: boolean;
    latencyMs?: number;
    ensName?: string;
  };
  remember?: { persisted: boolean; incidentLabel?: string; reason?: string };
  error?: string;
};

type EvidencePayload = {
  evidence?: ProvenanceEvidence[];
  banner?: string | null;
  signals?: Signal[];
  signalStatus?: { status: string; rule: string };
  adapterACount?: number;
  fanOut?: {
    protocols?: FanOutProtocolChip[];
    excluded?: Array<{ protocol: string; reason: string }>;
  };
  error?: string;
};

function verdictLabel(status: string): string {
  if (status === "TAINTED") return "THREAT VERIFIED";
  if (status === "WATCH") return "UNDER WATCH";
  if (status === "SAFE") return "NO KNOWN THREAT";
  return "INSUFFICIENT DATA";
}

function verdictColor(status: string): string {
  if (status === "TAINTED") return "var(--block)";
  if (status === "WATCH") return "var(--warn)";
  if (status === "SAFE") return "var(--signal)";
  return "var(--ink-muted)";
}

function plainSignalLine(signals: Signal[]): string | null {
  const ids = new Set(signals.map((s) => s.id));
  if (ids.has("FLASHLOAN_ONE_SHOT") && ids.has("ATOMIC_MULTI_PROTOCOL")) {
    return "Flashloan-funded activity across multiple protocols in the same transaction.";
  }
  if (ids.has("BOT_PROFILE")) {
    return "High-volume flashloan pattern — bot-like, not enough for a permanent TAINTED name.";
  }
  if (ids.has("REGISTRY_COOCCURRENCE")) {
    return "Shared Graph counterparty with an already-named threat.";
  }
  if (signals[0]) return signals[0].detail;
  return null;
}

function chipColor(status: string): string {
  if (status === "ok") return "var(--signal)";
  if (status === "empty") return "var(--ink-muted)";
  return "var(--block)";
}

const PROGRESS_STEPS = [
  "Resolving ENS / Shield…",
  "Querying 1 template × 8 Messari deployments…",
  "Deriving deterministic signals…",
  "AI explaining cited evidence…",
  "Validator deciding…",
];

export function InvestigateScreen({
  address,
  onAddress,
  onMemoryHit,
}: {
  address: string;
  onAddress: (a: string) => void;
  onMemoryHit: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InvestigateResult | null>(null);
  const [evidence, setEvidence] = useState<ProvenanceEvidence[]>([]);
  const [liveGraph, setLiveGraph] = useState<EvidencePayload | null>(null);
  const [forceFresh, setForceFresh] = useState(true);
  const [showExamples, setShowExamples] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [showLiveGraph, setShowLiveGraph] = useState(false);
  const [fullGraphOpen, setFullGraphOpen] = useState(false);
  const [citeHighlight, setCiteHighlight] = useState<string | null>(null);
  const [ensCard, setEnsCard] = useState<{
    ensName: string;
    parentName?: string;
    hit: boolean;
    source: string;
    records: Record<string, string>;
    permissionedResolver?: string;
  } | null>(null);

  // Clear stale investigation when the input address changes.
  useEffect(() => {
    setResult(null);
    setEvidence([]);
    setLiveGraph(null);
    setEnsCard(null);
    setError(null);
    setProgress(null);
    setShowLiveGraph(false);
    setEvidenceOpen(false);
    setFullGraphOpen(false);
    setCiteHighlight(null);
  }, [address]);

  async function fetchEvidence(): Promise<EvidencePayload> {
    return fetchJson<EvidencePayload>(`/api/evidence/1/${encodeURIComponent(address)}`);
  }

  async function run(opts?: { forceFresh?: boolean }) {
    const target = address;
    const fresh = opts?.forceFresh ?? forceFresh;
    setBusy(true);
    setError(null);
    setShowLiveGraph(false);
    setEvidence([]);
    setLiveGraph(null);
    setEvidenceOpen(false);
    setFullGraphOpen(false);
    setCiteHighlight(null);
    setEnsCard(null);
    setProgress(PROGRESS_STEPS[0]!);
    try {
      const invPromise = fetchJson<InvestigateResult>("/api/investigate", {
        method: "POST",
        headers: writeHeaders(),
        body: JSON.stringify({
          chainId: 1,
          address: target,
          persist: clientWritesAllowed(),
          registryNetwork: "sepolia",
          forceFresh: fresh,
        }),
      });

      // Narrate while waiting (best-effort)
      const tick = window.setInterval(() => {
        setProgress((p) => {
          const i = PROGRESS_STEPS.indexOf(p ?? "");
          if (i < 0 || i >= PROGRESS_STEPS.length - 1) return p;
          return PROGRESS_STEPS[i + 1]!;
        });
      }, 900);

      const inv = await invPromise;
      window.clearInterval(tick);
      if (inv.memoryHit) onMemoryHit();

      // Fresh / miss: load Graph for evidence fold. MEMORY HIT: do NOT auto-load Graph.
      let ev: EvidencePayload | null = null;
      let ens: typeof ensCard = null;
      if (!inv.memoryHit || fresh) {
        setProgress("Loading live Graph evidence…");
        ev = await fetchEvidence();
        setEvidenceOpen(true);
      } else {
        // Cheap ENS identity card for MEMORY HIT (no Graph)
        try {
          const j = await fetchJson<{
            ensName?: string;
            parentName?: string;
            hit?: boolean;
            source?: string;
            records?: Record<string, string>;
            permissionedResolver?: string;
          }>(`/api/resolve?address=${encodeURIComponent(target)}`);
          if (j.ensName) {
            ens = {
              ensName: j.ensName,
              parentName: j.parentName,
              hit: Boolean(j.hit),
              source: j.source ?? "ens",
              records: j.records ?? {},
              permissionedResolver: j.permissionedResolver,
            };
          }
        } catch {
          // optional card
        }
      }

      startTransition(() => {
        setResult(inv);
        setLiveGraph(ev);
        setEvidence(ev?.evidence ?? []);
        setEnsCard(ens);
        if (fresh) setForceFresh(true);
        setProgress(null);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Investigate failed");
      setResult(null);
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  async function loadLiveGraphOnly() {
    setBusy(true);
    setError(null);
    try {
      const ev = await fetchEvidence();
      startTransition(() => {
        setLiveGraph(ev);
        setEvidence(ev.evidence ?? []);
        setShowLiveGraph(true);
        setEvidenceOpen(true);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evidence fetch failed");
    } finally {
      setBusy(false);
    }
  }

  const status = result?.assessment?.status;
  const memoryHit = Boolean(result?.memoryHit);
  const showGraphPanel =
    !memoryHit || showLiveGraph || Boolean(result?.banner);

  const displayBanner = result?.banner ?? (showLiveGraph ? liveGraph?.banner : null);
  const displayProtocols =
    result?.protocols && result.protocols.length > 0
      ? result.protocols
      : showLiveGraph
        ? liveGraph?.fanOut?.protocols
        : undefined;
  const displayExcluded =
    result?.excluded ?? (showLiveGraph ? liveGraph?.fanOut?.excluded : undefined);
  const displaySignals =
    result?.signals && result.signals.length > 0
      ? result.signals
      : showLiveGraph
        ? (liveGraph?.signals ?? [])
        : [];
  const plain = plainSignalLine(displaySignals);
  const liveImplied = liveGraph?.signalStatus;
  const atomicHero = evidence.length > 0 ? strongestAtomicHero(evidence) : null;
  const timeline = buildAttackTimeline(atomicHero);
  const adapterACount = liveGraph?.adapterACount ?? 0;

  return (
    <section className="rise">
      <input
        value={address}
        onChange={(e) => onAddress(e.target.value.trim())}
        spellCheck={false}
        style={fieldStyle}
        placeholder="0x…"
      />

      <button
        type="button"
        onClick={() => setShowExamples((v) => !v)}
        style={{
          ...btnGhost,
          marginTop: 10,
          padding: "6px 10px",
          fontSize: 12,
          fontFamily: "var(--font-mono)",
        }}
      >
        {showExamples ? "Hide" : "Example addresses"} (demo set)
      </button>

      {showExamples ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 10,
          }}
        >
          {DEMO_TARGETS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onAddress(t.address)}
              style={{
                ...btnGhost,
                padding: "6px 10px",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                borderColor:
                  address.toLowerCase() === t.address
                    ? "var(--signal)"
                    : "var(--line)",
              }}
            >
              {t.id}
            </button>
          ))}
          <p
            style={{
              width: "100%",
              margin: "4px 0 0",
              fontSize: 12,
              color: "var(--ink-muted)",
            }}
          >
            Demo set for the walkthrough — not a claim of general detection coverage.
          </p>
        </div>
      ) : null}

      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <label
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: 13,
            color: "var(--ink-muted)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={forceFresh}
            onChange={(e) => setForceFresh(e.target.checked)}
          />
          Force fresh (skip MEMORY HIT · Graph + AI)
        </label>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run()}
          style={{ ...btnPrimary, opacity: busy ? 0.7 : 1, borderRadius: 4 }}
        >
          {busy ? "Working…" : forceFresh ? "Check fresh" : "Check this address"}
        </button>
      </div>

      {progress ? (
        <p
          style={{
            marginTop: 14,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--ink-muted)",
          }}
        >
          {progress}
        </p>
      ) : null}

      {error ? (
        <p role="alert" style={{ color: "var(--block)", marginTop: 16 }}>
          {error}
        </p>
      ) : null}

      {memoryHit && result?.shield ? (
        <div
          className="pulse-decision"
          style={{
            marginTop: 20,
            padding: "18px 20px",
            border: "2px solid var(--signal)",
            borderRadius: 6,
            background: "rgba(13,122,95,0.08)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "var(--signal)",
            }}
          >
            {result.shield.source === "ens" || result.shield.source === "registry"
              ? "MEMORY HIT · 0 Graph · 0 AI"
              : `NO MEMORY · source=${result.shield.source}`}
          </p>
          <p
            style={{
              margin: "8px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: 36,
              color:
                result.shield.decision === "BLOCK"
                  ? "var(--block)"
                  : result.shield.decision === "WARN"
                    ? "var(--warn)"
                    : "var(--ink)",
            }}
          >
            {result.shield.decision}
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--ink-muted)" }}>
            {result.cost?.ensResolutions ?? 1} ENS resolution
            {result.shield.latencyMs != null
              ? ` · ${result.shield.latencyMs}ms`
              : ""}{" "}
            · source={result.shield.source}
            {" · "}
            for {address}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 13 }}>{result.shield.reason}</p>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 12,
              color: "var(--ink-muted)",
              lineHeight: 1.45,
            }}
          >
            Graph Composable / AI tracks need{" "}
            <strong style={{ color: "var(--ink)" }}>Force fresh</strong> — memory
            path is 0 Graph · 0 AI by design.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run({ forceFresh: true })}
              style={{ ...btnPrimary, padding: "8px 12px", fontSize: 13, borderRadius: 4 }}
            >
              Show Graph proof (forceFresh)
            </button>
            {!showLiveGraph ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void loadLiveGraphOnly()}
                style={{ ...btnGhost, padding: "8px 12px", fontSize: 13, borderRadius: 4 }}
              >
                Show live Graph evidence
              </button>
            ) : null}
          </div>
          {ensCard ? (
            <div style={{ marginTop: 14 }}>
              <EnsIdentityCard
                ensName={ensCard.ensName}
                parentName={ensCard.parentName}
                hit={ensCard.hit}
                source={ensCard.source}
                records={ensCard.records}
                permissionedResolver={ensCard.permissionedResolver}
                compact
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {status && !memoryHit ? (
        <div style={{ marginTop: 22 }}>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "var(--ink-muted)",
            }}
          >
            Verdict · rules {result?.assessment?.rulesVersion ?? "—"} · model{" "}
            {result?.assessment?.modelVersion ?? "—"}
          </p>
          <p
            className="pulse-decision"
            style={{
              margin: "8px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: 40,
              fontWeight: 500,
              color: verdictColor(status),
            }}
          >
            {verdictLabel(status)}
          </p>
          {plain ? (
            <p style={{ margin: "10px 0 0", fontSize: 16, lineHeight: 1.45 }}>
              {plain}
            </p>
          ) : null}
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--ink-muted)" }}>
            {status} · {formatConfidencePct(result?.assessment?.confidence)}
            {result?.remember?.persisted
              ? ` · named ${result.remember.incidentLabel ?? ""}`
              : ""}
          </p>
        </div>
      ) : null}

      {showGraphPanel && (displayBanner || displaySignals.length > 0 || evidence.length > 0) ? (
        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            onClick={() => setEvidenceOpen((v) => !v)}
            style={{
              ...btnGhost,
              padding: "8px 12px",
              fontSize: 13,
              borderRadius: 4,
              fontFamily: "var(--font-mono)",
            }}
          >
            {evidenceOpen ? "Hide evidence ▴" : "See the evidence ▾"}
          </button>

          {evidenceOpen ? (
            <div style={{ marginTop: 14 }}>
              <StandardsLeverageStrip
                protocolCount={displayProtocols?.length}
                adapterACount={adapterACount}
              />
              <VerifiedRulePathsStrip />

              {displayBanner ? (
                <p
                  style={{
                    margin: "0 0 10px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--ink-muted)",
                  }}
                >
                  {displayBanner}
                </p>
              ) : null}

              {displayProtocols && displayProtocols.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginTop: 10,
                  }}
                >
                  {displayProtocols.map((p) => {
                    const idHint = p.subgraphId
                      ? ` · ${p.subgraphId.slice(0, 6)}…${p.subgraphId.slice(-4)}`
                      : "";
                    return (
                      <span
                        key={p.protocol}
                        title={`${p.status} · ${p.rowCount} rows · ${p.ms}ms${p.subgraphId ? ` · ${p.subgraphId}` : ""}${p.schema ? ` · ${p.schema}` : ""}`}
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          padding: "4px 8px",
                          border: `1px solid ${chipColor(p.status)}`,
                          color: chipColor(p.status),
                          borderRadius: 4,
                        }}
                      >
                        {p.protocol}
                        {idHint}
                      </span>
                    );
                  })}
                  {(displayExcluded ?? []).map((e) => (
                    <span
                      key={e.protocol}
                      title={e.reason}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        padding: "4px 8px",
                        border: "1px solid var(--block)",
                        color: "var(--block)",
                        borderRadius: 4,
                        opacity: 0.75,
                      }}
                    >
                      {e.protocol}✗
                    </span>
                  ))}
                  {adapterACount > 0 ? (
                    <span
                      title={`Adapter A · uniswap-v3-community · 5zvR82…VENFV · ${adapterACount} rows`}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        padding: "4px 8px",
                        border: "1px solid var(--signal)",
                        color: "var(--signal)",
                        borderRadius: 4,
                      }}
                    >
                      adapter-A·5zvR82…VENFV
                    </span>
                  ) : null}
                </div>
              ) : null}

              <StandardsRegistryPanel
                protocols={displayProtocols}
                adapterACount={adapterACount}
              />

              {displaySignals.length > 0 ? (
                <div style={{ marginTop: 18 }}>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                    }}
                  >
                    Proof tree · code decides
                  </p>
                  {plain ? (
                    <p style={{ margin: "8px 0 0", fontSize: 14 }}>{plain}</p>
                  ) : null}
                  <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                    {displaySignals.map((s) => (
                      <li key={s.id} style={{ marginBottom: 8, fontSize: 14 }}>
                        <strong
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 12,
                            color:
                              s.class === "threat"
                                ? "var(--block)"
                                : s.class === "counter"
                                  ? "var(--warn)"
                                  : "var(--signal)",
                          }}
                        >
                          {s.id}
                        </strong>{" "}
                        <span style={{ color: "var(--ink-muted)" }}>({s.class})</span>
                        <div style={{ color: "var(--ink-muted)", fontSize: 13 }}>
                          {s.detail}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {showLiveGraph && liveImplied ? (
                    <p
                      style={{
                        margin: "8px 0 0",
                        fontSize: 13,
                        color: "var(--ink-muted)",
                      }}
                    >
                      Live implied · {liveImplied.status} · {liveImplied.rule}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {atomicHero ? (
                <div style={{ marginTop: 18 }}>
                  <HeroAtomicCard hero={atomicHero} />
                  <AttackTimeline
                    steps={timeline}
                    txHash={atomicHero.txHash}
                    highlightId={citeHighlight}
                    onSelect={setCiteHighlight}
                  />
                </div>
              ) : null}

              {evidence.length > 0 ? (
                <div style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => setFullGraphOpen((v) => !v)}
                    style={{
                      ...btnGhost,
                      padding: "8px 12px",
                      fontSize: 13,
                      borderRadius: 4,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {fullGraphOpen
                      ? "Hide full graph ▴"
                      : "Explore full graph ▾"}
                  </button>
                  {fullGraphOpen ? (
                    <div style={{ marginTop: 12 }}>
                      <p
                        style={{
                          margin: "0 0 8px",
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "var(--ink-muted)",
                        }}
                      >
                        Provenance · same-tx edges highlighted
                      </p>
                      <ProvenanceGraph
                        address={address}
                        evidence={evidence}
                        height={400}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {result?.explanation && !result.memoryHit ? (
                <AiCitePanel
                  explanation={result.explanation}
                  evidenceIds={[
                    ...evidence.map((e) => e.id),
                    ...(result.assessment?.evidence?.map((e) => e.id) ?? []),
                    ...displaySignals.flatMap((s) => s.evidenceIds),
                  ]}
                  txHashes={[
                    ...(atomicHero ? [atomicHero.txHash] : []),
                    ...evidence
                      .map((e) => e.txHash)
                      .filter((t): t is string => Boolean(t)),
                  ]}
                  highlightId={citeHighlight}
                  onCite={(tok) => {
                    setCiteHighlight(tok);
                    const match = evidence.find(
                      (e) =>
                        e.id === tok ||
                        e.txHash?.toLowerCase() === tok.toLowerCase(),
                    );
                    if (match?.txHash && atomicHero?.txHash === match.txHash) {
                      // keep timeline open / highlighted
                    }
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {result?.cost ? (
        <p
          style={{
            marginTop: 16,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--ink-muted)",
          }}
        >
          cost · graph={result.cost.graphQueries} ai={result.cost.aiCalls} shield=
          {result.cost.shieldChecks} · {result.cost.latencyMs}ms
          {forceFresh ? " · forceFresh" : ""}
        </p>
      ) : null}

      <AttackBotContrast />

      <CoverageStrip />
    </section>
  );
}
