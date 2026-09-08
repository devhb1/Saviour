"use client";

/**
 * Demo console — thin shell over real APIs:
 * POST /api/investigate  (mainnet Graph → AI → validate → optional Remember)
 * POST /api/shield/check (Sepolia/Anvil registry Tier-1 — never AI)
 * GET  /api/evidence/:chain/:addr (live Graph for provenance graph)
 */

import { useState, startTransition } from "react";
import {
  ProvenanceGraph,
  type ProvenanceEvidence,
} from "./ProvenanceGraph";

type InvestigateResponse = {
  assessment?: {
    status: string;
    confidence: number;
    evidence?: unknown[];
    incidentId?: string;
    threatTypes?: string[];
  };
  remember?: {
    persisted: boolean;
    reason?: string;
    incidentLabel?: string;
    reused?: boolean;
  };
  error?: string;
};

type ShieldResponse = {
  check?: {
    decision: string;
    reason: string;
    usedAi: boolean;
    source: string;
    targetChainId: number;
    registryNetwork: string;
  };
  error?: string;
};

type EvidenceApiResponse = {
  evidence?: ProvenanceEvidence[];
  banner?: string;
  count?: number;
  error?: string;
};

const DEFAULT_ADDRESS = "0x935bfb495e33f74d2e9735df1da66ace442ede48";

function decisionColor(decision: string): string {
  if (decision === "BLOCK") return "var(--block)";
  if (decision === "WARN") return "var(--warn)";
  if (decision === "ALLOW") return "var(--signal)";
  return "var(--ink-muted)";
}

export function DemoConsole() {
  const [address, setAddress] = useState(DEFAULT_ADDRESS);
  const [busy, setBusy] = useState<
    "investigate" | "shield" | "evidence" | null
  >(null);
  const [investigate, setInvestigate] = useState<InvestigateResponse | null>(
    null,
  );
  const [shield, setShield] = useState<ShieldResponse | null>(null);
  const [evidence, setEvidence] = useState<ProvenanceEvidence[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadEvidence(target: string) {
    setBusy("evidence");
    setError(null);
    try {
      const res = await fetch(`/api/evidence/1/${target}`);
      const data = (await res.json()) as EvidenceApiResponse;
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      startTransition(() => {
        setEvidence(data.evidence ?? []);
        setBanner(data.banner ?? null);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evidence load failed");
      setEvidence([]);
      setBanner(null);
    } finally {
      setBusy(null);
    }
  }

  async function runInvestigate() {
    setBusy("investigate");
    setError(null);
    setShield(null);
    try {
      const res = await fetch("/api/investigate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chainId: 1,
          address,
          persist: true,
          registryNetwork: "sepolia",
        }),
      });
      const data = (await res.json()) as InvestigateResponse;
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      startTransition(() => setInvestigate(data));
      // Refresh provenance from live Graph (not AI-filtered cites)
      void loadEvidence(address);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Investigate failed");
      setInvestigate(null);
      setBusy(null);
    }
  }

  async function runShield() {
    setBusy("shield");
    setError(null);
    try {
      const res = await fetch("/api/shield/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chainId: 1,
          address,
          registryNetwork: "sepolia",
        }),
      });
      const data = (await res.json()) as ShieldResponse;
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      startTransition(() => setShield(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Shield check failed");
      setShield(null);
    } finally {
      setBusy(null);
    }
  }

  const status = investigate?.assessment?.status;
  const decision = shield?.check?.decision;

  return (
    <div style={{ width: "100%" }}>
      <label
        htmlFor="target"
        style={{
          display: "block",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          marginBottom: 10,
        }}
      >
        Mainnet target
      </label>
      <input
        id="target"
        value={address}
        onChange={(e) => setAddress(e.target.value.trim())}
        spellCheck={false}
        autoComplete="off"
        placeholder="0x…"
        style={{
          width: "100%",
          maxWidth: 560,
          padding: "14px 16px",
          border: "1px solid var(--line)",
          borderRadius: 2,
          background: "rgba(255,255,255,0.55)",
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          color: "var(--ink)",
          outline: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 16,
        }}
      >
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void loadEvidence(address)}
          style={{
            padding: "12px 20px",
            border: "1px solid var(--ink)",
            borderRadius: 2,
            background: "transparent",
            color: "var(--ink)",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: 14,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {busy === "evidence" ? "Loading graph…" : "Load provenance"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void runInvestigate()}
          style={{
            padding: "12px 20px",
            border: "none",
            borderRadius: 2,
            background: "var(--ink)",
            color: "var(--paper)",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: 14,
            cursor: busy ? "wait" : "pointer",
            opacity: busy && busy !== "investigate" ? 0.5 : 1,
          }}
        >
          {busy === "investigate" ? "Investigating…" : "Investigate"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void runShield()}
          style={{
            padding: "12px 20px",
            border: "1px solid var(--ink)",
            borderRadius: 2,
            background: "transparent",
            color: "var(--ink)",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: 14,
            cursor: busy ? "wait" : "pointer",
            opacity: busy && busy !== "shield" ? 0.5 : 1,
          }}
        >
          {busy === "shield" ? "Checking…" : "Shield check"}
        </button>
      </div>

      {error ? (
        <p
          className="rise"
          role="alert"
          style={{ marginTop: 20, color: "var(--block)", fontSize: 14 }}
        >
          {error}
        </p>
      ) : null}

      {banner ? (
        <p
          className="rise"
          style={{
            margin: "20px 0 0",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--ink-muted)",
          }}
        >
          {banner}
        </p>
      ) : null}

      {evidence.length > 0 ? (
        <div className="rise" style={{ marginTop: 16 }}>
          <p
            style={{
              margin: "0 0 10px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
            }}
          >
            Provenance · {evidence.length} rows · click a node
          </p>
          <ProvenanceGraph address={address} evidence={evidence} height={440} />
        </div>
      ) : null}

      {(status || decision) && (
        <div
          className="rise"
          style={{
            marginTop: 28,
            paddingTop: 24,
            borderTop: "1px solid var(--line)",
            maxWidth: 560,
          }}
        >
          {status ? (
            <div style={{ marginBottom: decision ? 20 : 0 }}>
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
                Investigation
              </p>
              <p
                className="pulse-decision"
                style={{
                  margin: "6px 0 0",
                  fontFamily: "var(--font-display)",
                  fontSize: 36,
                  fontWeight: 500,
                  lineHeight: 1.1,
                }}
              >
                {status}
              </p>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 14,
                  color: "var(--ink-muted)",
                }}
              >
                confidence{" "}
                {investigate?.assessment?.confidence != null
                  ? Math.round(investigate.assessment.confidence * 100)
                  : "—"}
                %
                {investigate?.assessment?.evidence
                  ? ` · ${investigate.assessment.evidence.length} evidence`
                  : ""}
                {investigate?.remember?.persisted
                  ? ` · remembered ${investigate.remember.incidentLabel ?? ""}`
                  : investigate?.remember?.reason
                    ? ` · remember: ${investigate.remember.reason}`
                    : ""}
              </p>
            </div>
          ) : null}

          {decision && shield?.check ? (
            <div>
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
                Shield · usedAi={String(shield.check.usedAi)}
              </p>
              <p
                className="pulse-decision"
                style={{
                  margin: "6px 0 0",
                  fontFamily: "var(--font-display)",
                  fontSize: 36,
                  fontWeight: 500,
                  lineHeight: 1.1,
                  color: decisionColor(decision),
                }}
              >
                {decision}
              </p>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 14,
                  color: "var(--ink-muted)",
                }}
              >
                {shield.check.reason}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
