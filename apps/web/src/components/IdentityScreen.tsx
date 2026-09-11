"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { btnGhost, btnPrimary, fieldStyle } from "./AppShell";
import { EnsIdentityCard } from "./EnsIdentityCard";
import { EnsPassport } from "./EnsPassport";
import { NamingCeremony } from "./NamingCeremony";
import { TourNextCta } from "./TourNextCta";
import { fetchJson } from "../lib/fetchJson";
import { resolveTargetClient } from "../lib/resolveTargetClient";
import { SectionMark, StatusPill } from "./Mark";
import { writeHeaders } from "../lib/writeGuard";

const RESOLVER = "0xF479306621F718F7d76875f67506ceD33717751c";

const ROLES = [
  {
    role: "Relayer",
    scope: "root / unregister / renew",
    note: "0x679997b836Cf84D32d7f68C1c662546E797f15FA",
  },
  {
    role: "Investigator",
    scope: "verdict texts + REGISTRAR · cannot write dispute",
    note: "0xc8A19951234d6f59f08E7EcB65506Ef34f5bf27d · investigator-01.saviours.eth",
  },
  {
    role: "Disputer",
    scope: "status + dispute only",
    note: "0xc26ADf0053C876047d2CbF5CC38a01312b410e7C",
  },
] as const;

/**
 * ENDGAME Identity — ENS-first passport, cast, EAC proof.
 * One screen so ENS is not buried under Shield/Case.
 */
export function IdentityScreen({
  address,
  onAddress,
  onOpenCase,
  onOpenMemory,
}: {
  address: string;
  onAddress: (a: string) => void;
  onOpenCase?: (a: string) => void;
  onOpenMemory?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    ensName: string;
    parentName?: string;
    hit: boolean;
    source?: string;
    records: Record<string, string>;
    permissionedResolver?: string;
    namedTx?: string | null;
    cast?: string;
  } | null>(null);
  const [eac, setEac] = useState<{
    reverted?: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function load(target: string) {
    setBusy(true);
    setError(null);
    setEac(null);
    try {
      const r = await resolveTargetClient(target);
      if (!r.ok) {
        setError(r.error);
        setData(null);
        return;
      }
      if (r.address !== target.toLowerCase()) onAddress(r.address);
      const json = await fetchJson<{
        ensName: string;
        parentName?: string;
        hit: boolean;
        source?: string;
        records: Record<string, string>;
        permissionedResolver?: string;
        namedTx?: string | null;
        cast?: string;
        error?: string;
      }>(`/api/resolve?address=${encodeURIComponent(r.address)}`);
      if (json.error) {
        setError(json.error);
        setData(null);
        return;
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resolve failed");
      setData(null);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (address.trim()) void load(address.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on address change only
  }, [address]);

  async function copyCast() {
    const cmd =
      data?.cast ??
      `cast call ${RESOLVER} \\\n  "text(bytes32,string)(string)" \\\n  $(cast namehash ${(data?.ensName ?? `${address.toLowerCase()}.saviours.eth`)}) \\\n  "saviours.status"`;
    try {
      await navigator.clipboard.writeText(cmd.replace(/\\\n/g, "\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  async function proveEac() {
    setBusy(true);
    setEac(null);
    try {
      const json = await fetchJson<{
        reverted?: boolean;
        message?: string;
        error?: string;
        expectedRevert?: boolean;
      }>("/api/govern/eac-probe", {
        method: "POST",
        headers: { "content-type": "application/json", ...writeHeaders() },
        body: JSON.stringify({
          address: address.trim().toLowerCase(),
        }),
      });
      setEac(json);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "EAC probe failed";
      setEac({ reverted: /revert/i.test(msg), message: msg, error: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rise">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <SectionMark>ENS SECURITY IDENTITY</SectionMark>
        <StatusPill>CAST WITHOUT OUR SERVER</StatusPill>
      </div>
      <h2
        style={{
          margin: "14px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: "clamp(26px, 3.5vw, 36px)",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          maxWidth: 640,
        }}
      >
        The name is the product.
      </h2>
      <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--ink-muted)", maxWidth: 560, lineHeight: 1.5 }}>
        Graph verifies. ENS remembers. Anyone can cast — no our server required.
      </p>

      <div
        style={{
          marginTop: 22,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
        }}
      >
        <input
          value={address}
          onChange={(e) => onAddress(e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load(address.trim());
          }}
          className="field-focus"
          style={{ ...fieldStyle, maxWidth: 480, flex: "1 1 260px" }}
          placeholder="0x… or ENS"
          spellCheck={false}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void load(address.trim())}
          style={btnPrimary}
        >
          {busy ? "Reading…" : "Read passport"}
        </button>
        {onOpenCase ? (
          <button
            type="button"
            onClick={() => onOpenCase(address.trim())}
            style={btnGhost}
          >
            Open full dossier →
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" style={{ color: "var(--block)", marginTop: 14 }}>
          {error}
        </p>
      ) : null}

      {/* Ceremony first — ENS out from under the hood. */}
      <NamingCeremony
        address={address.trim()}
        status={data?.records["saviours.status"]}
        threat={data?.records["saviours.threat"]}
        ensNameHint={data?.ensName}
        auto
        featured
      />

      {data ? (
        <div style={{ marginTop: 28 }}>
          <SectionMark>PASSPORT · FULL READ</SectionMark>
          <div style={{ marginTop: 14 }}>
            <EnsPassport
              ensName={data.ensName}
              status={data.records["saviours.status"]}
              threat={data.records["saviours.threat"]}
              address={address}
              evidenceHash={data.records["saviours.evidenceHash"]}
              atomicTx={data.records["saviours.atomicTx"]}
              cast={data.cast}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <EnsIdentityCard
              ensName={data.ensName}
              parentName={data.parentName}
              hit={data.hit}
              source={data.source}
              records={data.records}
              permissionedResolver={data.permissionedResolver ?? RESOLVER}
              namedTx={data.namedTx ?? data.records["saviours.namedTx"] ?? null}
              compact={false}
            />
          </div>

          <div style={{ marginTop: 20 }}>
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
                VERIFY YOURSELF · cast (none of our code runs)
              </p>
              <button type="button" onClick={() => void copyCast()} style={btnGhost}>
                {copied ? "Copied" : "Copy cast"}
              </button>
            </div>
            <pre style={castPre}>
              {data.cast ??
                `cast call ${RESOLVER} \\\n  "text(bytes32,string)(string)" \\\n  $(cast namehash ${data.ensName}) \\\n  "saviours.status"`}
            </pre>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 32 }}>
        <SectionMark>EAC · WRONG ROLE REVERTS</SectionMark>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 14,
            color: "var(--ink-muted)",
            maxWidth: 560,
            lineHeight: 1.5,
          }}
        >
          Same action, wrong role fails, right role would succeed. Permission
          caps in code — not a slide.
        </p>
      </div>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {ROLES.map((r) => (
          <div
            key={r.role}
            style={{
              padding: "14px 16px",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-md)",
              background: "var(--surface)",
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
              {r.role.toUpperCase()}
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 600 }}>
              {r.scope}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--ink-muted)" }}>
              {r.note}
            </p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <button type="button" disabled={busy} onClick={() => void proveEac()} style={btnPrimary}>
          {busy ? "Probing EAC…" : "1 · Prove wrong role reverts →"}
        </button>
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--ink-muted)", maxWidth: 520 }}>
          Investigator attempts a dispute write — must revert.
        </p>
        {eac ? (
          <div
            style={{
              marginTop: 12,
              padding: "12px 14px",
              border: `2px solid ${eac.reverted ? "var(--signal)" : "var(--warn)"}`,
              borderRadius: "var(--radius-md)",
            }}
          >
            <p style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 18 }}>
              {eac.reverted
                ? "EAC REVERT ✓ · wrong role blocked"
                : "Unexpected — check probe output"}
            </p>
            <p
              style={{
                margin: "8px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--ink-muted)",
                wordBreak: "break-all",
              }}
            >
              {eac.message ?? eac.error}
            </p>
          </div>
        ) : null}
      </div>

      {onOpenMemory ? (
        <TourNextCta
          label="Next · 04 Resolve — try any address free →"
          hint="Paste anything · MEMORY HIT is 0 Graph · 0 AI · $0"
          onNext={onOpenMemory}
        />
      ) : null}
    </section>
  );
}

const castPre: CSSProperties = {
  margin: "8px 0 0",
  padding: 14,
  background: "var(--bg-inset)",
  color: "var(--tx)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-sm)",
  overflow: "auto",
  fontSize: 12,
  lineHeight: 1.45,
};
