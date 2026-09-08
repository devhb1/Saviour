"use client";

import { startTransition, useState } from "react";
import {
  DEMO_TARGETS,
  btnGhost,
  btnPrimary,
  fieldStyle,
} from "./AppShell";

type ResolveData = {
  ensName: string;
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
  const [data, setData] = useState<ResolveData | null>(null);
  const [fp, setFp] = useState<FingerprintData | null>(null);
  const [copied, setCopied] = useState(false);
  const [shield, setShield] = useState<{
    decision: string;
    source: string;
    usedAi: boolean;
    latencyMs?: number;
  } | null>(null);

  async function loadResolve() {
    setBusy("resolve");
    setError(null);
    setFp(null);
    try {
      const res = await fetch(`/api/resolve?address=${address}`);
      const json = (await res.json()) as ResolveData;
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      startTransition(() => setData(json));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resolve failed");
      setData(null);
    } finally {
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
      const json = (await res.json()) as {
        check?: {
          decision: string;
          source: string;
          usedAi: boolean;
          latencyMs?: number;
        };
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      if (json.check && (json.check.source === "ens" || json.check.source === "registry")) {
        onMemoryHit();
      }
      startTransition(() => setShield(json.check ?? null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Shield failed");
    } finally {
      setBusy(null);
    }
  }

  async function recompute() {
    setBusy("fp");
    setError(null);
    try {
      const res = await fetch("/api/fingerprint/recompute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const json = (await res.json()) as FingerprintData;
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      startTransition(() => setFp(json));
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

  const records = data?.records ?? {};
  const keys = Object.keys(records).sort();

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
            }}
          >
            {t.id}
          </button>
        ))}
      </div>

      <input
        value={address}
        onChange={(e) => onAddress(e.target.value.trim())}
        style={fieldStyle}
        spellCheck={false}
      />

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
          {busy === "shield" ? "Shield…" : "Shield check"}
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
            border: "1px solid var(--signal)",
            borderRadius: 4,
          }}
        >
          <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 11 }}>
            MEMORY HIT card · source={shield.source} · usedAi={String(shield.usedAi)}
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
          </p>
          {shield.source === "registry" ? (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--warn)" }}>
              source=registry — ENS may be revoked/unregistered; SavioursRegistry is
              append-only in this cut. Prefer ENS-first for the consumer story.
            </p>
          ) : null}
          {!data?.hit && shield.source === "registry" ? (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--warn)" }}>
              ENS miss + registry hit is the expected post-revoke shape.
            </p>
          ) : null}
        </div>
      ) : null}

      {data ? (
        <div style={{ marginTop: 22 }}>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              wordBreak: "break-all",
            }}
          >
            {data.ensName}
            <span style={{ color: "var(--ink-muted)" }}>
              {" "}
              · {data.hit ? data.source : "no hit"}
            </span>
          </p>

          <table
            style={{
              width: "100%",
              marginTop: 14,
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", color: "var(--ink-muted)" }}>
                <th style={{ padding: "8px 6px", borderBottom: "1px solid var(--line)" }}>
                  key
                </th>
                <th style={{ padding: "8px 6px", borderBottom: "1px solid var(--line)" }}>
                  value
                </th>
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ padding: 10, color: "var(--ink-muted)" }}>
                    No saviours.* texts
                  </td>
                </tr>
              ) : (
                keys.map((k) => (
                  <tr key={k}>
                    <td
                      style={{
                        padding: "8px 6px",
                        borderBottom: "1px solid var(--line)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        verticalAlign: "top",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {k}
                    </td>
                    <td
                      style={{
                        padding: "8px 6px",
                        borderBottom: "1px solid var(--line)",
                        wordBreak: "break-all",
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                      }}
                    >
                      {records[k]}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

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
