"use client";

import { EnsIdentityCard } from "./EnsIdentityCard";
import { fetchJson } from "../lib/fetchJson";
import { ReceiptStrip } from "./ReceiptStrip";
import { getFirstEncounter } from "../lib/receiptStore";
import { startTransition, useEffect, useState } from "react";
import {
  DEMO_TARGETS,
  btnGhost,
  btnPrimary,
  fieldStyle,
} from "./AppShell";

type ResolveData = {
  ensName: string;
  parentName?: string;
  hit: boolean;
  source: string;
  records: Record<string, string>;
  cast: string;
  permissionedResolver: string;
  registry: {
    incidentId: string;
    status: string;
    evidenceHash: string;
    confidenceBucket: number;
    expiresAt: number;
  } | null;
  error?: string;
};

type FingerprintData = {
  match?: boolean;
  verdict?: string;
  dossierUrl?: string;
  dossierEvidenceHash?: string;
  registryEvidenceHash?: string | null;
  ensEvidenceHash?: string | null;
  keccakOfCanonicalDossier?: string;
  error?: string;
};

type ShieldView = {
  decision: string;
  source: string;
  usedAi: boolean;
  latencyMs?: number;
  /** Address this shield result was computed for (bind fix). */
  forAddress: string;
};

function isMemorySource(source: string): boolean {
  return source === "ens" || source === "registry";
}

function expiryLabel(expiresAt: number | undefined): string {
  if (!expiresAt) return "—";
  const left = expiresAt - Math.floor(Date.now() / 1000);
  if (left <= 0) return "expired";
  const days = Math.floor(left / 86400);
  if (days > 365) return `${Math.floor(days / 365)}y left`;
  if (days > 0) return `${days}d left`;
  return `${Math.floor(left / 3600)}h left`;
}

export function ResolveScreen({
  address,
  onAddress,
  onMemoryHit,
}: {
  address: string;
  onAddress: (a: string) => void;
  onMemoryHit: () => void;
}) {
  const [busy, setBusy] = useState<"resolve" | "shield" | "fp" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<(ResolveData & { forAddress: string }) | null>(
    null,
  );
  const [fp, setFp] = useState<(FingerprintData & { forAddress: string }) | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [shield, setShield] = useState<ShieldView | null>(null);

  // Clear stale cards when the input address changes (input↔card bind).
  useEffect(() => {
    setData(null);
    setShield(null);
    setFp(null);
    setError(null);
  }, [address]);

  async function loadResolve() {
    const target = address;
    setBusy("resolve");
    setError(null);
    setFp(null);
    try {
      const json = await fetchJson<ResolveData>(
        `/api/resolve?address=${encodeURIComponent(target)}`,
      );
      if (json.hit && isMemorySource(json.source)) onMemoryHit();
      startTransition(() => setData({ ...json, forAddress: target }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resolve failed");
      setData(null);
    } finally {
      setBusy(null);
    }
  }

  async function runShield() {
    const target = address;
    setBusy("shield");
    setError(null);
    try {
      const json = await fetchJson<{
        check?: {
          decision: string;
          source: string;
          usedAi: boolean;
          latencyMs?: number;
        };
        error?: string;
      }>("/api/shield/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chainId: 1,
          address: target,
          registryNetwork: "sepolia",
        }),
      });
      const check = json.check;
      if (!check) throw new Error("Shield returned no check");
      if (isMemorySource(check.source)) onMemoryHit();
      startTransition(() =>
        setShield({
          decision: check.decision,
          source: check.source,
          usedAi: check.usedAi,
          latencyMs: check.latencyMs,
          forAddress: target,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Shield failed");
    } finally {
      setBusy(null);
    }
  }

  async function recompute() {
    const target = address;
    setBusy("fp");
    setError(null);
    try {
      const json = await fetchJson<FingerprintData>("/api/fingerprint/recompute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: target }),
      });
      startTransition(() => setFp({ ...json, forAddress: target }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recompute failed");
      setFp(null);
    } finally {
      setBusy(null);
    }
  }

  async function copyCast() {
    if (!data?.cast) return;
    await navigator.clipboard.writeText(data.cast);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const shieldMemory = shield ? isMemorySource(shield.source) : false;

  return (
    <section className="rise">
      <input
        value={address}
        onChange={(e) => onAddress(e.target.value.trim())}
        style={fieldStyle}
        spellCheck={false}
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
              }}
            >
              {t.id}
            </button>
          ))}
        </div>
      ) : null}

      <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void loadResolve()}
          style={btnPrimary}
        >
          {busy === "resolve" ? "Reading ENS…" : "Read ENS records"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void runShield()}
          style={btnGhost}
        >
          {busy === "shield" ? "Shield…" : "Shield check · 0 Graph · 0 AI"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void recompute()}
          style={btnGhost}
        >
          {busy === "fp" ? "Recomputing…" : "Recompute fingerprint"}
        </button>
      </div>

      {error ? (
        <p role="alert" style={{ color: "var(--block)", marginTop: 16 }}>
          {error}
        </p>
      ) : null}

      {shield ? (
        <div
          style={{
            marginTop: 18,
            padding: "14px 16px",
            border: `1px solid ${shieldMemory ? "var(--signal)" : "var(--line)"}`,
            borderRadius: 4,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: shieldMemory ? "var(--signal)" : "var(--ink-muted)",
            }}
          >
            {shieldMemory
              ? `MEMORY HIT · source=${shield.source}`
              : `NO MEMORY · source=${shield.source}`}
            {" · "}
            usedAi={String(shield.usedAi)}
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-muted)",
              wordBreak: "break-all",
            }}
          >
            for {shield.forAddress}
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: 28,
            }}
          >
            {shield.decision}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ink-muted)" }}>
            0 Graph · 0 AI · {shield.latencyMs ?? "—"}ms
            {!shieldMemory && shield.decision === "ESCALATE"
              ? " · ESCALATE = no named memory (investigate if needed)"
              : ""}
          </p>
          {shield.source === "registry" ? (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--warn)" }}>
              source=registry — ENS may be revoked; SavioursRegistry is append-only.
              Prefer ENS-first for the consumer story.
            </p>
          ) : null}
          {shieldMemory ? (
            <ReceiptStrip
              mode="memory"
              now={{
                graphQueries: 0,
                aiCalls: 0,
                latencyMs: shield.latencyMs ?? 0,
                at: new Date().toISOString(),
              }}
              first={getFirstEncounter(shield.forAddress)}
            />
          ) : null}
        </div>
      ) : null}

      {data ? (
        <div style={{ marginTop: 22 }}>
          <p
            style={{
              margin: "0 0 10px",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-muted)",
              wordBreak: "break-all",
            }}
          >
            resolved for {data.forAddress}
          </p>
          <EnsIdentityCard
            ensName={data.ensName}
            parentName={data.parentName}
            hit={data.hit}
            source={data.source}
            records={data.records}
            permissionedResolver={data.permissionedResolver}
          />

          {data.registry ? (
            <p style={{ marginTop: 12, fontSize: 13, color: "var(--ink-muted)" }}>
              registry · {data.registry.status} · expiry{" "}
              {expiryLabel(data.registry.expiresAt)} · evidenceHash{" "}
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                {data.registry.evidenceHash.slice(0, 18)}…
              </span>
            </p>
          ) : null}

          <div style={{ marginTop: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  color: "var(--ink-muted)",
                }}
              >
                cast (none of our code runs)
              </p>
              <button type="button" onClick={() => void copyCast()} style={btnGhost}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre
              style={{
                margin: "8px 0 0",
                padding: 14,
                background: "rgba(14,18,16,0.92)",
                color: "#d5ded7",
                borderRadius: 4,
                overflow: "auto",
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              {data.cast}
            </pre>
          </div>
        </div>
      ) : null}

      {fp ? (
        <div
          style={{
            marginTop: 20,
            padding: "14px 16px",
            border: `2px solid ${fp.match ? "var(--signal)" : "var(--warn)"}`,
            borderRadius: 4,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-muted)",
              wordBreak: "break-all",
            }}
          >
            fingerprint for {fp.forAddress}
          </p>
          <p
            style={{
              margin: "8px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: 24,
            }}
          >
            {fp.verdict}
          </p>
          <p
            style={{
              margin: "10px 0 0",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              wordBreak: "break-all",
              color: "var(--ink-muted)",
            }}
          >
            dossier {fp.dossierEvidenceHash}
            <br />
            on-chain {fp.registryEvidenceHash ?? fp.ensEvidenceHash ?? "—"}
            <br />
            keccak(canonical) {fp.keccakOfCanonicalDossier}
          </p>
        </div>
      ) : null}
    </section>
  );
}
