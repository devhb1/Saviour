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
  type ProvenanceEvidence,
} from "./ProvenanceGraph";
import { HeroAtomicCard, StandardsLeverageStrip } from "./HeroAtomicCard";
import { StandardsRegistryPanel } from "./StandardsRegistryPanel";
import type { FanOutProtocolChip } from "./StandardsRegistryPanel";
import { VerifiedRulePathsStrip } from "./VerifiedRulePathsStrip";
import { AttackTimeline } from "./AttackTimeline";
import { AiCitePanel } from "./AiCitePanel";
import { AskPanel } from "./AskPanel";
import { AttackBotContrast } from "./AttackBotContrast";
import { EnsIdentityCard } from "./EnsIdentityCard";
import { ReceiptStrip, costFromInvestigate } from "./ReceiptStrip";
import { NarrationBand } from "./NarrationBand";
import { AddressDisplay } from "./AddressDisplay";
import { CaseLayout } from "./CaseLayout";
import { CollapsibleSection } from "./CollapsibleSection";
import { StageRail, deriveCaseStage } from "./StageRail";
import { GraphExplorePanel } from "./GraphExplorePanel";
import {
  buildAttackTimeline,
  strongestAtomicHero,
} from "./provenanceBuild";
import { writeHeaders, clientWritesAllowed } from "../lib/writeGuard";
import { fetchJson } from "../lib/fetchJson";
import {
  getFirstEncounter,
  recordFirstEncounter,
  type EncounterCost,
} from "../lib/receiptStore";
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
  const [forceFresh, setForceFresh] = useState(false);
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
  const [receipt, setReceipt] = useState<{
    mode: "first" | "memory" | "fresh";
    now: EncounterCost;
    first: EncounterCost | null;
  } | null>(null);

  useEffect(() => {
    setResult(null);
    setEvidence([]);
    setLiveGraph(null);
    setEnsCard(null);
    setReceipt(null);
    setProgress(null);
    setShowLiveGraph(false);
    setEvidenceOpen(false);
    setFullGraphOpen(false);
    setCiteHighlight(null);
  }, [address]);

  // Auto-open evidence while a forceFresh investigation is in flight.
  useEffect(() => {
    if (busy && forceFresh) setEvidenceOpen(true);
  }, [busy, forceFresh]);

  async function fetchEvidence(): Promise<EvidencePayload> {
    return fetchJson<EvidencePayload>(
      `/api/evidence/1/${encodeURIComponent(address)}`,
    );
  }

  async function run(opts?: { forceFresh?: boolean }) {
    const target = address;
    const fresh = opts?.forceFresh ?? forceFresh;
    setBusy(true);
    setError(null);
    setShowLiveGraph(false);
    setEvidence([]);
    setLiveGraph(null);
    if (!fresh) setEvidenceOpen(false);
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

      let ev: EvidencePayload | null = null;
      let ens: typeof ensCard = null;
      if (!inv.memoryHit || fresh) {
        setProgress("Loading live Graph evidence…");
        ev = await fetchEvidence();
        setEvidenceOpen(true);
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
          // optional
        }
      } else {
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
          // optional
        }
      }

      const nowCost = inv.cost
        ? costFromInvestigate(inv.cost)
        : {
            graphQueries: 0,
            aiCalls: 0,
            latencyMs: inv.shield?.latencyMs ?? 0,
            at: new Date().toISOString(),
          };

      let firstStored = getFirstEncounter(target);
      if (!inv.memoryHit && inv.cost && (inv.cost.graphQueries > 0 || inv.cost.aiCalls > 0)) {
        firstStored = recordFirstEncounter(target, nowCost);
      }

      const receiptView = {
        mode: (inv.memoryHit
          ? "memory"
          : firstStored && firstStored.at === nowCost.at
            ? "first"
            : "fresh") as "first" | "memory" | "fresh",
        now: nowCost,
        first: firstStored,
      };

      startTransition(() => {
        setResult(inv);
        setLiveGraph(ev);
        setEvidence(ev?.evidence ?? []);
        setEnsCard(ens);
        setReceipt(receiptView);
        if (fresh) setForceFresh(true);
        setProgress(null);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Investigate failed");
      setResult(null);
      setReceipt(null);
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
  const realMemory =
    memoryHit &&
    (result?.shield?.source === "ens" || result?.shield?.source === "registry");
  const showGraphPanel =
    !memoryHit || showLiveGraph || Boolean(result?.banner);

  const displayBanner =
    result?.banner ?? (showLiveGraph ? liveGraph?.banner : null);
  const displayProtocols =
    result?.protocols && result.protocols.length > 0
      ? result.protocols
      : showLiveGraph
        ? liveGraph?.fanOut?.protocols
        : undefined;
  const displayExcluded =
    result?.excluded ??
    (showLiveGraph ? liveGraph?.fanOut?.excluded : undefined);
  const displaySignals =
    result?.signals && result.signals.length > 0
      ? result.signals
      : showLiveGraph
        ? (liveGraph?.signals ?? [])
        : [];
  const plain = plainSignalLine(displaySignals);
  const liveImplied = liveGraph?.signalStatus;
  const atomicHero =
    evidence.length > 0 ? strongestAtomicHero(evidence) : null;
  const timeline = buildAttackTimeline(atomicHero);
  const adapterACount = liveGraph?.adapterACount ?? 0;

  const okProtocols =
    displayProtocols?.filter((p) => p.status === "ok").length ?? 0;
  const evidenceSummary = displayBanner
    ? String(displayBanner).slice(0, 120)
    : `${displayProtocols?.length ?? 0} protocols · ${okProtocols} with rows · ${evidence.length} evidence rows`;

  const named =
    Boolean(result?.remember?.persisted) ||
    Boolean(ensCard?.hit && ensCard.records["saviours.status"]);
  const stage = deriveCaseStage({
    busy,
    forceFresh,
    hasResult: Boolean(result),
    hasExplanation: Boolean(result?.explanation) || Boolean(plain),
    named,
    memoryHit: realMemory,
  });

  const askPacket =
    result && (result.assessment || result.memoryHit)
      ? {
          address,
          status:
            result.assessment?.status ??
            ensCard?.records?.["saviours.status"] ??
            null,
          confidence: result.assessment?.confidence,
          signals: displaySignals,
          evidence: evidence.map((e) => ({
            id: e.id,
            claim: e.claim,
            protocol: e.protocol,
            kind: e.kind,
            txHash: e.txHash,
            amountUSD: e.amountUSD,
          })),
          explanation: result.explanation,
          threatTypes: result.assessment?.threatTypes,
          rulesVersion: result.assessment?.rulesVersion,
          evidenceHash: ensCard?.records?.["saviours.evidenceHash"] ?? null,
          atomicTx:
            ensCard?.records?.["saviours.atomicTx"] ??
            atomicHero?.txHash ??
            null,
          protocols:
            ensCard?.records?.["saviours.protocols"] ??
            displayProtocols
              ?.filter((p) => p.status === "ok")
              .map((p) => p.protocol)
              .join(" · ") ??
            null,
        }
      : null;

  const passport = ensCard ? (
    <EnsIdentityCard
      ensName={ensCard.ensName}
      parentName={ensCard.parentName}
      hit={ensCard.hit}
      source={ensCard.source}
      records={ensCard.records}
      permissionedResolver={ensCard.permissionedResolver}
      compact
      commitState={
        result?.remember?.persisted
          ? "committed"
          : !clientWritesAllowed()
            ? "readonly"
            : "idle"
      }
    />
  ) : null;

  const leftStory = fullGraphOpen && evidence.length > 0 ? (
    <GraphExplorePanel
      address={address}
      evidence={evidence}
      onClose={() => setFullGraphOpen(false)}
    />
  ) : (
    <>
      {realMemory && result?.shield ? (
        <div
          className="pulse-decision"
          style={{
            padding: "18px 20px",
            border: "2px solid var(--signal)",
            borderRadius: 4,
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
            MEMORY HIT · 0 Graph · 0 AI
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
            {result.shield.reason}
          </p>
          <NarrationBand
            status={ensCard?.records?.["saviours.status"]}
            lead={ensCard?.records?.["saviours.plainVerdict"]}
            signalIds={(ensCard?.records?.["saviours.threat"] ?? "")
              .split(/[·|,/\s]+/)
              .map((s) => s.trim())
              .filter(Boolean)}
            protocols={ensCard?.records?.["saviours.protocols"]}
            atomicTx={ensCard?.records?.["saviours.atomicTx"]}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run({ forceFresh: true })}
              style={{
                ...btnPrimary,
                padding: "8px 12px",
                fontSize: 13,
                borderRadius: 4,
              }}
            >
              Show Graph proof (forceFresh)
            </button>
            {!showLiveGraph ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void loadLiveGraphOnly()}
                style={{
                  ...btnGhost,
                  padding: "8px 12px",
                  fontSize: 13,
                  borderRadius: 4,
                }}
              >
                Show live Graph evidence
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {status && !realMemory ? (
        <div>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "var(--ink-muted)",
            }}
          >
            VERDICT · rules {result?.assessment?.rulesVersion ?? "—"}
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
          <div style={{ marginTop: 10 }}>
            <AddressDisplay
              address={address}
              status={status}
              ensName={ensCard?.ensName}
            />
          </div>
        </div>
      ) : null}

      {atomicHero && showGraphPanel ? (
        <div style={{ marginTop: status || realMemory ? 18 : 0 }}>
          <HeroAtomicCard hero={atomicHero} />
          <AttackTimeline
            steps={timeline}
            txHash={atomicHero.txHash}
            highlightId={citeHighlight}
            onSelect={setCiteHighlight}
          />
        </div>
      ) : null}

      {status && !realMemory ? (
        <NarrationBand
          status={status}
          lead={
            ensCard?.records?.["saviours.plainVerdict"] ?? plain ?? null
          }
          signalIds={displaySignals.map((s) => s.id)}
          protocols={
            ensCard?.records?.["saviours.protocols"] ??
            displayProtocols
              ?.filter((p) => p.status === "ok")
              .map((p) => p.protocol)
              .join(" · ")
          }
          atomicTx={
            ensCard?.records?.["saviours.atomicTx"] ??
            atomicHero?.txHash ??
            null
          }
          explanation={result?.explanation ?? null}
        />
      ) : null}

      {busy && !result?.explanation && !realMemory ? (
        <p
          style={{
            marginTop: 14,
            fontSize: 14,
            color: "var(--ink-muted)",
            fontStyle: "italic",
          }}
        >
          Explanation streaming in…
        </p>
      ) : null}

      {showGraphPanel &&
      (displayBanner || displaySignals.length > 0 || evidence.length > 0) ? (
        <CollapsibleSection
          title="Evidence · Graph fan-out"
          summary={evidenceSummary}
          open={evidenceOpen}
          onOpenChange={setEvidenceOpen}
        >
          <div style={{ paddingTop: 12 }}>
            <StandardsLeverageStrip
              protocolCount={displayProtocols?.length}
              adapterACount={adapterACount}
            />
            <VerifiedRulePathsStrip />

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
                      title={`${p.status} · ${p.rowCount} rows · ${p.ms}ms`}
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
                      <span style={{ color: "var(--ink-muted)" }}>
                        ({s.class})
                      </span>
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
                onCite={setCiteHighlight}
              />
            ) : null}

            {evidence.length > 0 ? (
              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setFullGraphOpen(true)}
                  style={{
                    ...btnGhost,
                    padding: "8px 12px",
                    fontSize: 13,
                    borderRadius: 4,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Explore graph →
                </button>
              </div>
            ) : null}
          </div>
        </CollapsibleSection>
      ) : null}
    </>
  );

  const rightTrust = (
    <>
      {receipt ? (
        <ReceiptStrip
          mode={receipt.mode}
          now={receipt.now}
          first={receipt.first}
          forceFresh={forceFresh}
        />
      ) : null}
      {passport}
      {askPacket ? (
        <button
          type="button"
          onClick={() => {
            document.getElementById("case-ask")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }}
          style={{
            ...btnGhost,
            width: "100%",
            padding: "10px 12px",
            fontSize: 13,
            fontFamily: "var(--font-mono)",
            textAlign: "left",
          }}
        >
          Ask about this finding ↓
        </button>
      ) : null}
    </>
  );

  return (
    <section className="rise">
      <input
        value={address}
        onChange={(e) => onAddress(e.target.value.trim())}
        spellCheck={false}
        style={fieldStyle}
        placeholder="Paste an address…"
      />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 12,
        }}
      >
        {DEMO_TARGETS.slice(0, 3).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onAddress(t.address)}
            style={{
              ...btnGhost,
              padding: "8px 12px",
              fontSize: 13,
              borderColor:
                address.toLowerCase() === t.address
                  ? "var(--signal)"
                  : "var(--line)",
            }}
          >
            {t.plain}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowExamples((v) => !v)}
          style={{
            ...btnGhost,
            padding: "8px 12px",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
          }}
        >
          {showExamples ? "Hide more" : "More…"}
        </button>
      </div>

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
              }}
            >
              {t.id} · {t.plain}
            </button>
          ))}
        </div>
      ) : null}

      <details style={{ marginTop: 12 }}>
        <summary
          style={{
            cursor: "pointer",
            fontSize: 12,
            color: "var(--ink-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Advanced · re-investigate live (forceFresh)
        </summary>
        <label
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: 13,
            color: "var(--ink-muted)",
            cursor: "pointer",
            marginTop: 10,
          }}
        >
          <input
            type="checkbox"
            checked={forceFresh}
            onChange={(e) => setForceFresh(e.target.checked)}
          />
          Force fresh (skip MEMORY HIT · Graph + AI)
        </label>
      </details>

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

      {result || busy ? (
        <div style={{ marginTop: 22 }}>
          <StageRail active={stage.active} completed={stage.completed} />
          <CaseLayout left={leftStory} right={rightTrust} />
          {askPacket ? <AskPanel packet={askPacket} /> : null}
        </div>
      ) : null}

      <AttackBotContrast />
      <CoverageStrip />
    </section>
  );
}
