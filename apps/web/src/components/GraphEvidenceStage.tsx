"use client";

import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { GraphFanOutSvg } from "./GraphFanOutSvg";
import { VerifiedRulePathsStrip } from "./VerifiedRulePathsStrip";
import { StandardsRegistryPanel } from "./StandardsRegistryPanel";
import type { FanOutProtocolChip } from "./StandardsRegistryPanel";
import { FanOutConsole } from "./FanOutConsole";
import { GraphExplorePanel } from "./GraphExplorePanel";
import { HeroAtomicCard } from "./HeroAtomicCard";
import {
  strongestAtomicHero,
  type ProvenanceEvidence,
} from "./provenanceBuild";
import {
  btnGhost,
  btnPrimary,
  DEMO_TARGETS,
  fieldStyle,
} from "./AppShell";
import { resolveTargetClient } from "../lib/resolveTargetClient";

type StageTab = "live" | "rules";

/**
 * Playground Graph sell surface — paste a contract / wallet / ENS name,
 * investigate live across 8 Messari deployments. Dense: fan-out + protocols
 * share one viewport; provenance opens full-bleed in-column.
 */
export function GraphEvidenceStage({
  address,
  onAddress,
}: {
  address?: string;
  onAddress?: (a: string) => void;
}) {
  const defaultAddr =
    (address || DEMO_TARGETS[0].address).trim().toLowerCase() ||
    DEMO_TARGETS[0].address;

  const [tab, setTab] = useState<StageTab>("live");
  const [input, setInput] = useState(defaultAddr);
  const [target, setTarget] = useState(defaultAddr);
  const [resolvedLabel, setResolvedLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chips, setChips] = useState<FanOutProtocolChip[]>([]);
  const [signalIds, setSignalIds] = useState<string[]>([]);
  const [evidence, setEvidence] = useState<ProvenanceEvidence[]>([]);
  const [showProvenance, setShowProvenance] = useState(false);
  const [runKey, setRunKey] = useState(0);

  const placeholderChips = useMemo(
    (): FanOutProtocolChip[] =>
      [
        "aave-v3",
        "compound-v3",
        "spark",
        "makerdao",
        "uniswap-v3",
        "sushi",
        "curve",
        "yearn-v2",
      ].map((protocol) => ({
        protocol,
        status: "pending",
        ms: 0,
        rowCount: 0,
      })),
    [],
  );

  const displayChips = chips.length > 0 ? chips : placeholderChips;
  const atomicHero =
    evidence.length > 0 ? strongestAtomicHero(evidence) : null;

  async function investigate(raw?: string) {
    const q = (raw ?? input).trim();
    if (!q) {
      setError("Paste a 0x address, wallet, or ENS name");
      return;
    }
    setBusy(true);
    setError(null);
    setChips([]);
    setSignalIds([]);
    setEvidence([]);
    setShowProvenance(false);
    try {
      const r = await resolveTargetClient(q);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setTarget(r.address);
      setInput(r.ensName || r.address);
      setResolvedLabel(
        r.via === "hex"
          ? null
          : r.ensName
            ? `${r.ensName} → ${r.address.slice(0, 10)}…`
            : `resolved via ${r.via}`,
      );
      onAddress?.(r.address);
      setRunKey((k) => k + 1);
      setTab("live");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void investigate();
  }

  if (showProvenance && evidence.length > 0) {
    return (
      <div style={{ maxWidth: 1040 }}>
        {atomicHero ? (
          <div style={{ marginBottom: 8 }}>
            <HeroAtomicCard hero={atomicHero} compact />
          </div>
        ) : null}
        <GraphExplorePanel
          address={target}
          evidence={evidence}
          onClose={() => setShowProvenance(false)}
          closeLabel="← Back to fan-out"
          dense
          height={360}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1040 }}>
      <div style={hero}>
        <div style={heroTop}>
          <div style={{ minWidth: 0, flex: "1 1 220px" }}>
            <p style={heroEyebrow}>The Graph · evidence</p>
            <h2 style={heroTitle}>
              One Messari template. Eight live deployments.
            </h2>
          </div>
          <p style={metricInline}>
            1 template · 8 pinned · mainnet
          </p>
        </div>
        <p style={heroBody}>
          Paste address or ENS — fan-out hits 8 subgraphs, then open same-tx
          provenance when edges exist.
        </p>

        <form onSubmit={onSubmit} style={investigateRow}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="0x… · vitalik.eth · &lt;addr&gt;.saviours.eth"
            aria-label="Address or ENS name to investigate"
            style={{
              ...fieldStyle,
              flex: "1 1 200px",
              minWidth: 0,
              maxWidth: "100%",
              marginBottom: 0,
              padding: "8px 10px",
              fontSize: 13,
            }}
          />
          <button
            type="submit"
            disabled={busy}
            style={{ ...btnPrimary, flexShrink: 0, padding: "8px 14px" }}
          >
            {busy ? "Resolving…" : "Investigate →"}
          </button>
        </form>

        <div style={chipRow}>
          {DEMO_TARGETS.slice(0, 4).map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setInput(d.address);
                void investigate(d.address);
              }}
              style={quickChip}
            >
              {d.label}
            </button>
          ))}
          <span style={targetHint}>
            {error ? (
              <span role="alert" style={{ color: "var(--red)" }}>
                {error}
              </span>
            ) : resolvedLabel ? (
              resolvedLabel
            ) : (
              <>
                {target.slice(0, 10)}…{target.slice(-4)}
              </>
            )}
          </span>
        </div>
      </div>

      <div style={tabRow} role="tablist" aria-label="Graph evidence">
        {(
          [
            { id: "live" as const, label: "Live fan-out" },
            { id: "rules" as const, label: "Signals · rules" },
          ] as const
        ).map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.id)}
              style={{
                ...tabBtn,
                borderColor: on ? "var(--sig)" : "var(--line-mid)",
                background: on ? "var(--sig-wash)" : "var(--bg-raise)",
                color: on ? "var(--tx-hi)" : "var(--tx-lo)",
                fontWeight: on ? 600 : 500,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "live" ? (
        <div style={stageCard}>
          <div style={toolbar}>
            <p style={toolbarMeta}>
              {evidence.length > 0
                ? `${evidence.length} evidence · same-tx ready`
                : "Waiting on fan-out…"}
              {signalIds.length > 0 ? (
                <>
                  {" · "}
                  <strong style={{ color: "var(--block)" }}>
                    {signalIds.slice(0, 2).join(" ∧ ")}
                  </strong>
                </>
              ) : null}
            </p>
            <button
              type="button"
              disabled={evidence.length === 0}
              onClick={() => setShowProvenance(true)}
              style={{
                ...btnPrimary,
                padding: "7px 12px",
                fontSize: 12,
                opacity: evidence.length === 0 ? 0.45 : 1,
              }}
            >
              View provenance →
            </button>
          </div>

          {atomicHero ? (
            <div style={{ marginBottom: 10 }}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  alignItems: "stretch",
                }}
              >
                <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                  <HeroAtomicCard hero={atomicHero} compact />
                </div>
                <button
                  type="button"
                  onClick={() => setShowProvenance(true)}
                  style={{
                    ...btnGhost,
                    padding: "8px 12px",
                    fontSize: 12,
                    background: "var(--bg-high)",
                    alignSelf: "center",
                  }}
                >
                  Full graph ↓
                </button>
              </div>
            </div>
          ) : null}

          <div className="ge-split" style={split}>
            <div style={splitPane}>
              <GraphFanOutSvg protocols={displayChips} featured dense />
            </div>
            <div style={splitPane}>
              <FanOutConsole
                key={`${target}-${runKey}`}
                address={target}
                auto
                compact={false}
                featuredList
                onData={(payload) => {
                  setChips(
                    payload.protocols.map((p) => ({
                      protocol: p.protocol,
                      status: p.status,
                      ms: p.ms,
                      rowCount: p.rowCount,
                    })),
                  );
                  setSignalIds(
                    (payload.signals ?? [])
                      .map((s) => String(s.id ?? ""))
                      .filter(Boolean),
                  );
                  setEvidence(payload.evidence ?? []);
                }}
              />
            </div>
          </div>
          <style>{`
            @media (max-width: 860px) {
              .ge-split { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      ) : (
        <div style={stageCard}>
          <VerifiedRulePathsStrip />
          <StandardsRegistryPanel />
        </div>
      )}
    </div>
  );
}

const hero: CSSProperties = {
  marginBottom: 10,
  padding: "12px 14px",
  border: "1px solid var(--sig-line)",
  borderRadius: "var(--radius-md)",
  background: "var(--bg-raise)",
  boxShadow: "var(--edge), var(--lift)",
};

const heroTop: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 8,
};

const heroEyebrow: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--sig)",
};

const heroTitle: CSSProperties = {
  margin: "4px 0 0",
  fontFamily: "var(--font-display)",
  fontSize: "clamp(17px, 2.2vw, 22px)",
  fontWeight: 600,
  letterSpacing: "-0.03em",
  color: "var(--tx-hi)",
  lineHeight: 1.2,
};

const heroBody: CSSProperties = {
  margin: "6px 0 0",
  fontSize: 12,
  lineHeight: 1.4,
  color: "var(--tx-lo)",
  maxWidth: 540,
};

const metricInline: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.04em",
  color: "var(--tx-faint)",
  padding: "5px 8px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line-mid)",
  background: "var(--bg-high)",
  whiteSpace: "nowrap",
};

const investigateRow: CSSProperties = {
  marginTop: 10,
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

const chipRow: CSSProperties = {
  marginTop: 8,
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  alignItems: "center",
};

const quickChip: CSSProperties = {
  ...btnGhost,
  padding: "4px 8px",
  fontSize: 11,
  background: "var(--bg-high)",
};

const targetHint: CSSProperties = {
  marginLeft: 4,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "var(--tx-lo)",
  wordBreak: "break-all",
};

const tabRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginBottom: 8,
};

const tabBtn: CSSProperties = {
  padding: "5px 10px",
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  borderRadius: "var(--radius-chip)",
  border: "1px solid var(--line)",
  cursor: "pointer",
};

const stageCard: CSSProperties = {
  padding: "10px 12px",
  border: "1px solid var(--line-mid)",
  borderRadius: "var(--radius-md)",
  background: "var(--bg-raise)",
  boxShadow: "var(--edge), var(--lift)",
};

const toolbar: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "center",
  marginBottom: 10,
  paddingBottom: 8,
  borderBottom: "1px solid var(--line)",
};

const toolbarMeta: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--tx-lo)",
  lineHeight: 1.35,
};

const split: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
  gap: 12,
  alignItems: "start",
};

const splitPane: CSSProperties = {
  minWidth: 0,
};
