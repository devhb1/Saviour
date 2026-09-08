"use client";

import { startTransition, useState } from "react";
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
import { writeHeaders } from "../lib/writeGuard";
import { formatConfidencePct } from "@saviours/core";

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
  protocols?: Array<{
    protocol: string;
    status: string;
    ms: number;
    rowCount: number;
  }>;
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
  };
  remember?: { persisted: boolean; incidentLabel?: string; reason?: string };
  error?: string;
};

type EvidencePayload = {
  evidence?: ProvenanceEvidence[];
  banner?: string | null;
  signals?: Signal[];
  signalStatus?: { status: string; rule: string };
  fanOut?: {
    protocols?: Array<{
      protocol: string;
      status: string;
      ms: number;
      rowCount: number;
    }>;
    excluded?: Array<{ protocol: string; reason: string }>;
  };
  error?: string;
};

function verdictLabel(status: string): string {
  if (status === "TAINTED") return "THREAT VERIFIED";
  if (status === "WATCH") return "UNDER WATCH";
  if (status === "SAFE") return "NO KNOWN THREAT";
  return "UNKNOWN";
}

function chipColor(status: string): string {
  if (status === "ok") return "var(--signal)";
  if (status === "empty") return "var(--ink-muted)";
  return "var(--block)";
}

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
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InvestigateResult | null>(null);
  const [evidence, setEvidence] = useState<ProvenanceEvidence[]>([]);
  const [liveGraph, setLiveGraph] = useState<EvidencePayload | null>(null);
  const [forceFresh, setForceFresh] = useState(false);

  async function run(opts?: { forceFresh?: boolean }) {
    const fresh = opts?.forceFresh ?? forceFresh;
    setBusy(true);
    setError(null);
    try {
      const [invRes, evRes] = await Promise.all([
        fetch("/api/investigate", {
          method: "POST",
          headers: writeHeaders(),
          body: JSON.stringify({
            chainId: 1,
            address,
            persist: true,
            registryNetwork: "sepolia",
            forceFresh: fresh,
          }),
        }),
        fetch(`/api/evidence/1/${address}`),
      ]);
      const inv = (await invRes.json()) as InvestigateResult;
      const ev = (await evRes.json()) as EvidencePayload;
      if (!invRes.ok) throw new Error(inv.error ?? `HTTP ${invRes.status}`);
      if (inv.memoryHit) onMemoryHit();
      startTransition(() => {
        setResult(inv);
        setEvidence(ev.evidence ?? []);
        setLiveGraph(ev);
        if (fresh) setForceFresh(true);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Investigate failed");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  const status = result?.assessment?.status;
  const memoryHit = Boolean(result?.memoryHit);
  /** On MEMORY HIT, investigate skips Graph — surface live evidence panel instead. */
  const displayBanner = result?.banner ?? (memoryHit ? liveGraph?.banner : null);
  const displayProtocols =
    result?.protocols && result.protocols.length > 0
      ? result.protocols
      : memoryHit
        ? liveGraph?.fanOut?.protocols
        : undefined;
  const displayExcluded =
    result?.excluded ?? (memoryHit ? liveGraph?.fanOut?.excluded : undefined);
  const displaySignals =
    result?.signals && result.signals.length > 0
      ? result.signals
      : memoryHit
        ? (liveGraph?.signals ?? [])
        : [];
  const liveImplied = liveGraph?.signalStatus;

  return (
    <section className="rise">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
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
                address.toLowerCase() === t.address ? "var(--signal)" : "var(--line)",
            }}
          >
            {t.id}
          </button>
        ))}
      </div>

      <input
        value={address}
        onChange={(e) => onAddress(e.target.value.trim())}
        spellCheck={false}
        style={fieldStyle}
        placeholder="0x…"
      />

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
          style={{ ...btnPrimary, opacity: busy ? 0.7 : 1 }}
        >
          {busy ? "Investigating…" : forceFresh ? "Investigate fresh" : "Investigate"}
        </button>
      </div>

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
            padding: "16px 18px",
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
            MEMORY HIT
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: 28,
            }}
          >
            {result.shield.decision}
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--ink-muted)" }}>
            Investigate path: 0 Graph · 0 AI ·{" "}
            {result.cost?.ensResolutions ?? 1} ENS resolution
            {result.shield.latencyMs != null
              ? ` · ${result.shield.latencyMs}ms`
              : ""}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 13 }}>{result.shield.reason}</p>
          <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--ink-muted)" }}>
            Live Graph for the demo beat is loaded below (parallel evidence fetch).
            To re-run AI + Remember, use Force fresh.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run({ forceFresh: true })}
            style={{ ...btnGhost, marginTop: 12, padding: "8px 12px", fontSize: 13 }}
          >
            Force fresh investigation
          </button>
        </div>
      ) : null}

      {displayBanner ? (
        <p
          style={{
            margin: "18px 0 0",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--ink-muted)",
          }}
        >
          {memoryHit && !result?.banner ? "Live Graph · " : ""}
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
          {displayProtocols.map((p) => (
            <span
              key={p.protocol}
              title={`${p.status} · ${p.rowCount} rows · ${p.ms}ms`}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                padding: "4px 8px",
                border: `1px solid ${chipColor(p.status)}`,
                color: chipColor(p.status),
                borderRadius: 2,
              }}
            >
              {p.protocol}
            </span>
          ))}
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
                borderRadius: 2,
                opacity: 0.75,
              }}
            >
              {e.protocol}✗
            </span>
          ))}
        </div>
      ) : null}

      {evidence.length > 0 ? (
        <div style={{ marginTop: 18 }}>
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
            {memoryHit ? " · live Graph (MEMORY HIT overlay)" : ""}
          </p>
          <ProvenanceGraph address={address} evidence={evidence} height={400} />
        </div>
      ) : null}

      {displaySignals.length > 0 ? (
        <div style={{ marginTop: 22 }}>
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
            Proof tree
            {memoryHit && !(result?.signals?.length)
              ? " · from live Graph"
              : ""}
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
                <span style={{ color: "var(--ink-muted)" }}>({s.class})</span>
                <div style={{ color: "var(--ink-muted)", fontSize: 13 }}>
                  {s.detail}
                </div>
              </li>
            ))}
          </ul>
          {memoryHit && liveImplied ? (
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--ink-muted)" }}>
              Live implied · {liveImplied.status} · {liveImplied.rule}
            </p>
          ) : null}
        </div>
      ) : null}

      {status ? (
        <div style={{ marginTop: 20 }}>
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
              margin: "6px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: 34,
              fontWeight: 500,
            }}
          >
            {verdictLabel(status)}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--ink-muted)" }}>
            {status} · {formatConfidencePct(result?.assessment?.confidence)}
            {result?.remember?.persisted
              ? ` · named ${result.remember.incidentLabel ?? ""}`
              : ""}
          </p>
        </div>
      ) : null}

      {result?.explanation && !result.memoryHit ? (
        <div style={{ marginTop: 18 }}>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "var(--ink-muted)",
            }}
          >
            AI explanation (below proof tree)
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.5 }}>
            {result.explanation}
          </p>
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

      <CoverageStrip />
    </section>
  );
}
