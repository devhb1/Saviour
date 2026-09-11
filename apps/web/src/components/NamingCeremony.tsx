"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Badge, Button, Label } from "../ui";
import { EnsPassport } from "./EnsPassport";
import { clientWritesAllowed } from "../lib/writeGuard";

const TEXT_KEYS = [
  "saviours.status",
  "saviours.threat",
  "saviours.evidenceHash",
  "saviours.atomicTx",
  "saviours.investigator",
  "saviours.dossier",
] as const;

type ResolvePayload = {
  ensName?: string;
  hit?: boolean;
  source?: string;
  records?: Record<string, string>;
  namedTx?: string | null;
  cast?: string;
  permissionedResolver?: string;
  error?: string;
};

type StepState = "idle" | "running" | "ok" | "skip" | "fail";

/**
 * ENS Naming Ceremony — verdict → label → text records → Sepolia tx → passport.
 * REPLAY mode when host is write-locked: shows live resolve + historical namedTx.
 */
export function NamingCeremony({
  address,
  status,
  threat,
  ensNameHint,
  auto = true,
  onOpenIdentity,
}: {
  address: string;
  status?: string | null;
  threat?: string | null;
  ensNameHint?: string | null;
  auto?: boolean;
  onOpenIdentity?: (a: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolve, setResolve] = useState<ResolvePayload | null>(null);
  const [step, setStep] = useState(0);
  const [recordReveal, setRecordReveal] = useState(0);
  const writesOpen = clientWritesAllowed();

  const ensName =
    resolve?.ensName ||
    ensNameHint ||
    `${address.trim().toLowerCase()}.saviours.eth`;

  const records = resolve?.records ?? {};
  const replay = !writesOpen || Boolean(resolve?.namedTx && !writesOpen);
  const modeLabel = writesOpen && !resolve?.namedTx ? "LIVE" : "REPLAY";

  async function load() {
    const a = address.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(a)) {
      setError("Need a 0x address");
      return;
    }
    setBusy(true);
    setError(null);
    setResolve(null);
    setStep(0);
    setRecordReveal(0);
    try {
      const res = await fetch(`/api/resolve?address=${encodeURIComponent(a)}`);
      const json = (await res.json()) as ResolvePayload;
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setResolve(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resolve failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (auto && address) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, auto]);

  // Advance ceremony steps after resolve lands.
  useEffect(() => {
    if (!resolve) return;
    setStep(1);
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setStep(2), 400));
    timers.push(window.setTimeout(() => setStep(3), 800));
    timers.push(window.setTimeout(() => setStep(4), 1100));
    // reveal records one by one
    let i = 0;
    const rec = window.setInterval(() => {
      i += 1;
      setRecordReveal(i);
      if (i >= TEXT_KEYS.length) window.clearInterval(rec);
    }, 180);
    timers.push(rec);
    timers.push(
      window.setTimeout(() => {
        setStep(5);
      }, 1100 + TEXT_KEYS.length * 180 + 200),
    );
    timers.push(
      window.setTimeout(() => {
        setStep(6);
      }, 1100 + TEXT_KEYS.length * 180 + 700),
    );
    timers.push(
      window.setTimeout(() => {
        setStep(7);
      }, 1100 + TEXT_KEYS.length * 180 + 1100),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [resolve]);

  const statusVal =
    records["saviours.status"] || status || (resolve?.hit ? "HIT" : "UNKNOWN");

  const steps = useMemo(() => {
    const productLawOk =
      statusVal === "TAINTED" ||
      statusVal === "WATCH" ||
      Boolean(records["saviours.status"]);
    return [
      {
        n: 1,
        title: "VERDICT SEALED",
        detail: `${statusVal} · validator owns status · AI explains only`,
        state: (step >= 1 ? "ok" : busy ? "running" : "idle") as StepState,
      },
      {
        n: 2,
        title: "LABEL COMPUTED",
        detail: ensName,
        state: (step >= 2 ? "ok" : step === 1 ? "running" : "idle") as StepState,
      },
      {
        n: 3,
        title: "ONLY WATCH / TAINTED",
        detail: productLawOk
          ? "product law check passed"
          : "would skip naming — SAFE/UNKNOWN never named",
        state: (step >= 3
          ? productLawOk
            ? "ok"
            : "skip"
          : step === 2
            ? "running"
            : "idle") as StepState,
      },
      {
        n: 4,
        title: "TEXT RECORDS",
        detail: `writing as investigator-01.saviours.eth · ${modeLabel}`,
        state: (step >= 4 ? "ok" : step === 3 ? "running" : "idle") as StepState,
      },
      {
        n: 5,
        title: "SEPOLIA TRANSACTION",
        detail: resolve?.namedTx
          ? resolve.namedTx
          : writesOpen
            ? "pending or prior write"
            : "REPLAY · use historical namedTx when available",
        state: (step >= 5
          ? resolve?.namedTx
            ? "ok"
            : "skip"
          : step === 4
            ? "running"
            : "idle") as StepState,
      },
      {
        n: 6,
        title: "PASSPORT LIVE",
        detail: resolve?.hit
          ? "resolvable via cast · no our server"
          : "awaiting name",
        state: (step >= 6
          ? resolve?.hit
            ? "ok"
            : "skip"
          : step === 5
            ? "running"
            : "idle") as StepState,
      },
      {
        n: 7,
        title: "IN PUBLIC MEMORY",
        detail: "Registry gallery · Memory ledger",
        state: (step >= 7 ? "ok" : step === 6 ? "running" : "idle") as StepState,
      },
    ];
  }, [step, busy, ensName, statusVal, records, resolve, writesOpen, modeLabel]);

  return (
    <aside style={wrap} aria-live="polite">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
        }}
      >
        <Label>NAMING · SEPOLIA ENSv2</Label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Badge status={modeLabel === "LIVE" ? "HIT" : "ESCALATE"}>
            {modeLabel}
          </Badge>
          <button type="button" onClick={() => void load()} disabled={busy} style={ghostBtn}>
            {busy ? "Reading…" : "Re-run"}
          </button>
        </div>
      </div>
      <p style={muted}>
        The moment a threat becomes a name. Records are texts on{" "}
        <code style={{ color: "var(--sig-hi)" }}>{ensName}</code>. ENS stores the
        finding — it does not decide it.
      </p>

      {error ? (
        <p role="alert" style={{ marginTop: 12, color: "var(--red)", fontSize: 13 }}>
          {error}
        </p>
      ) : null}

      <ol style={{ listStyle: "none", margin: "16px 0 0", padding: 0, display: "grid", gap: 10 }}>
        {steps.map((s) => (
          <li key={s.n} style={stepRow(s.state)}>
            <span style={stepMark(s.state)}>
              {s.state === "ok" ? "✓" : s.state === "running" ? "●" : s.state === "skip" ? "–" : "○"}
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--tx-faint)" }}>
                {s.n} · {s.title}
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 13,
                  color: "var(--tx)",
                  wordBreak: "break-all",
                  lineHeight: 1.4,
                }}
              >
                {s.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {step >= 4 ? (
        <div style={{ marginTop: 16 }}>
          <Label>TEXT RECORDS</Label>
          <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "grid", gap: 6 }}>
            {TEXT_KEYS.map((k, i) => {
              const val = records[k]?.trim();
              const show = i < recordReveal;
              const ok = Boolean(val);
              return (
                <li
                  key={k}
                  className={show ? "line-in" : undefined}
                  style={{
                    opacity: show ? 1 : 0.2,
                    display: "grid",
                    gridTemplateColumns: "18px minmax(140px, 200px) 1fr",
                    gap: 8,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    alignItems: "baseline",
                  }}
                >
                  <span style={{ color: ok ? "var(--green)" : "var(--tx-faint)" }}>
                    {ok ? "✓" : "○"}
                  </span>
                  <code style={{ color: "var(--sig-hi)" }}>{k}</code>
                  <span style={{ color: "var(--tx-lo)", wordBreak: "break-all" }}>
                    {ok ? val : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {step >= 5 && resolve?.namedTx ? (
        <p style={{ marginTop: 14, fontFamily: "var(--font-mono)", fontSize: 12 }}>
          <a
            href={`https://sepolia.etherscan.io/tx/${resolve.namedTx}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--sig)", wordBreak: "break-all" }}
          >
            Sepolia tx · {resolve.namedTx}
          </a>
          {replay || modeLabel === "REPLAY" ? (
            <span style={{ color: "var(--amber)", marginLeft: 8 }}>REPLAY</span>
          ) : null}
        </p>
      ) : null}

      {step >= 6 && resolve?.hit ? (
        <div style={{ marginTop: 18 }} className="stamp-in">
          <EnsPassport
            ensName={ensName}
            status={statusVal}
            threat={records["saviours.threat"] || threat || undefined}
            address={address}
            compact
            onOpenIdentity={
              onOpenIdentity ? () => onOpenIdentity(address.trim()) : undefined
            }
          />
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 13,
              color: "var(--green)",
              lineHeight: 1.45,
            }}
          >
            Anyone can now read this with cast. No SAVIOURS server involved.
          </p>
          {resolve.cast ? (
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void navigator.clipboard.writeText(resolve.cast!)}
              >
                Copy cast
              </Button>
              {onOpenIdentity ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenIdentity(address.trim())}
                >
                  Open passport →
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}

function stepRow(state: StepState): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "22px 1fr",
    gap: 10,
    padding: "8px 10px",
    borderRadius: "var(--r-sm)",
    border: "1px solid var(--line)",
    background:
      state === "running"
        ? "var(--sig-wash)"
        : state === "ok"
          ? "var(--bg-high)"
          : "var(--bg-inset)",
  };
}

function stepMark(state: StepState): CSSProperties {
  return {
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    color:
      state === "ok"
        ? "var(--green)"
        : state === "running"
          ? "var(--sig-hi)"
          : state === "skip"
            ? "var(--amber)"
            : "var(--tx-faint)",
    animation: state === "running" ? "pending-pulse 1.2s ease-in-out infinite" : undefined,
  };
}

const wrap: CSSProperties = {
  marginTop: 22,
  padding: "16px 16px",
  border: "1px solid var(--sig-line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-raise)",
  boxShadow: "var(--glow-sig)",
};

const muted: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 13,
  color: "var(--tx-lo)",
  lineHeight: 1.45,
};

const ghostBtn: CSSProperties = {
  border: "1px solid var(--line)",
  background: "var(--bg-high)",
  color: "var(--tx)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  padding: "6px 10px",
  borderRadius: "var(--r-sm)",
  cursor: "pointer",
};
