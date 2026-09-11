"use client";

import { EnsIdentityCard } from "./EnsIdentityCard";
import { EnsPassport } from "./EnsPassport";
import { fetchJson } from "../lib/fetchJson";
import { MemoryCheckCard } from "./MemoryCheckCard";
import { AddressDisplay } from "./AddressDisplay";
import { TourNextCta } from "./TourNextCta";
import { startTransition, useEffect, useState } from "react";
import {
  DEMO_TARGETS,
  btnGhost,
  btnPrimary,
  fieldStyle,
} from "./AppShell";
import { resolveTargetClient } from "../lib/resolveTargetClient";

type ResolveData = {
  ensName: string;
  parentName?: string;
  hit: boolean;
  source: string;
  records: Record<string, string>;
  cast: string;
  permissionedResolver: string;
  namedTx?: string | null;
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
  onOpenCase,
  onOpenIdentity,
  onOpenMemory,
}: {
  address: string;
  onAddress: (a: string) => void;
  onMemoryHit: () => void;
  onOpenCase?: (a: string) => void;
  onOpenIdentity?: (a?: string) => void;
  onOpenMemory?: () => void;
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
    setBusy("resolve");
    setError(null);
    setFp(null);
    try {
      const resolved = await resolveTargetClient(address);
      if (!resolved.ok) {
        setError(resolved.error);
        setData(null);
        return;
      }
      const target = resolved.address;
      if (target !== address.trim().toLowerCase()) onAddress(target);
      const json = await fetchJson<ResolveData>(
        `/api/resolve?address=${encodeURIComponent(target)}`,
      );
      if (json.hit && (json.source === "ens" || json.source === "registry"))
        onMemoryHit();
      startTransition(() => setData({ ...json, forAddress: target }));
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
      const resolved = await resolveTargetClient(address);
      if (!resolved.ok) {
        setError(resolved.error);
        return;
      }
      const target = resolved.address;
      if (target !== address.trim().toLowerCase()) onAddress(target);
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
      if (check.source === "ens" || check.source === "registry") onMemoryHit();

      // Enrich Memory Check card with ENS records when possible
      try {
        const ens = await fetchJson<ResolveData>(
          `/api/resolve?address=${encodeURIComponent(target)}`,
        );
        startTransition(() => {
          setData({ ...ens, forAddress: target });
          setShield({
            decision: check.decision,
            source: check.source,
            usedAi: check.usedAi,
            latencyMs: check.latencyMs,
            forAddress: target,
          });
        });
      } catch {
        startTransition(() =>
          setShield({
            decision: check.decision,
            source: check.source,
            usedAi: check.usedAi,
            latencyMs: check.latencyMs,
            forAddress: target,
          }),
        );
      }
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
      const resolved = await resolveTargetClient(address);
      if (!resolved.ok) {
        setError(resolved.error);
        setFp(null);
        return;
      }
      const target = resolved.address;
      if (target !== address.trim().toLowerCase()) onAddress(target);
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

  return (
    <section className="rise">
      <div
        className="home-hero-plane"
        style={{
          padding: "22px 24px 26px",
          borderRadius: 14,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.12em",
              color: "var(--tx-lo)",
            }}
          >
            // SHIELD · BEFORE YOU SIGN
          </p>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
              color: "var(--signal-bright)",
              border: "1px solid color-mix(in srgb, var(--signal) 45%, transparent)",
              padding: "4px 10px",
            }}
          >
            0 GRAPH · 0 AI ON HIT
          </span>
        </div>
      <h1
        style={{
          margin: "0 0 8px",
          fontFamily: "var(--font-display)",
          fontSize: "clamp(26px, 3.5vw, 36px)",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          maxWidth: 560,
          lineHeight: 1.1,
          color: "var(--mark-on-night)",
        }}
      >
        Decision first.{" "}
        <span className="mark-sheen">Investigate only on miss.</span>
      </h1>
      <p
        style={{
          margin: "0 0 0",
          fontSize: 14,
          color: "var(--tx)",
          maxWidth: 520,
          lineHeight: 1.5,
        }}
      >
        Paste 0x, <code style={{ color: "var(--signal-bright)" }}>&lt;addr&gt;.saviours.eth</code>, or a public .eth name.
        MEMORY HIT never charges Graph or AI.
      </p>
      </div>
      <input
        value={address}
        onChange={(e) => onAddress(e.target.value.trim())}
        className="field-focus"
        style={fieldStyle}
        spellCheck={false}
        placeholder="0x… or ENS"
      />
      <div style={{ marginTop: 8 }}>
        <AddressDisplay address={address} showCopy />
      </div>

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
          {data.hit ? (
            <div style={{ marginBottom: 16 }}>
              <EnsPassport
                ensName={data.ensName}
                status={data.records["saviours.status"]}
                threat={data.records["saviours.threat"]}
                address={data.forAddress}
                evidenceHash={data.records["saviours.evidenceHash"]}
                atomicTx={data.records["saviours.atomicTx"]}
                cast={data.cast}
                onOpenIdentity={
                  onOpenIdentity
                    ? () => onOpenIdentity(data.forAddress)
                    : undefined
                }
              />
              <p
                style={{
                  margin: "10px 0 0",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--signal)",
                }}
              >
                Settled $0 via Bazantic path · 0 Graph · 0 AI · MEMORY HIT
              </p>
            </div>
          ) : null}
          <EnsIdentityCard
            ensName={data.ensName}
            parentName={data.parentName}
            hit={data.hit}
            source={data.source}
            records={data.records}
            permissionedResolver={data.permissionedResolver}
            namedTx={data.namedTx ?? data.records["saviours.namedTx"] ?? null}
            compact={false}
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
        </div>
      ) : null}

      {shield ? (
        <div style={{ marginTop: data ? 16 : 0, opacity: data ? 0.92 : 1 }}>
          <MemoryCheckCard
            address={shield.forAddress}
            decision={shield.decision}
            source={shield.source}
            usedAi={shield.usedAi}
            latencyMs={shield.latencyMs}
            status={
              data?.forAddress === shield.forAddress
                ? data.records["saviours.status"]
                : null
            }
            ensName={
              data?.forAddress === shield.forAddress ? data.ensName : null
            }
            threat={
              data?.forAddress === shield.forAddress
                ? data.records["saviours.threat"]
                : null
            }
            plainVerdict={
              data?.forAddress === shield.forAddress
                ? data.records["saviours.plainVerdict"]
                : null
            }
            onOpenCase={
              onOpenCase
                ? () => onOpenCase(shield.forAddress)
                : undefined
            }
          />
        </div>
      ) : null}

      {data ? (
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
              background: "var(--bg-inset)",
              color: "var(--tx)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              overflow: "auto",
              fontSize: 12,
              lineHeight: 1.45,
            }}
          >
            {data.cast}
          </pre>
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

      {onOpenMemory ? (
        <TourNextCta
          label="Next · Memory gallery →"
          hint="See Graph-verified passports + EAC roles"
          onNext={onOpenMemory}
        />
      ) : null}
    </section>
  );
}
