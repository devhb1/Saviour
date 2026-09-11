"use client";

import { useMemo, useState } from "react";
import {
  btnGhost,
  btnPrimary,
  fieldStyle,
  DEMO_TARGETS,
} from "./AppShell";
import { FleetRun } from "./FleetRun";
import { FanOutConsole } from "./FanOutConsole";
import { VerifiedRulePathsStrip } from "./VerifiedRulePathsStrip";
import { StandardsRegistryPanel } from "./StandardsRegistryPanel";
import { KillSwitchProof } from "./KillSwitchProof";
import { AskPanel, type AskPacketClient } from "./AskPanel";
import { BazanticPayPanel } from "./BazanticPayPanel";
import { SessionMeter } from "./SessionMeter";
import { AgentWorklist } from "./AgentWorklist";
import { WalletGatePanel } from "./WalletGatePanel";
import { fetchJson } from "../lib/fetchJson";
import { writeHeaders } from "../lib/writeGuard";

type TabId =
  | "fleet"
  | "fanout"
  | "signals"
  | "eac"
  | "dispute"
  | "cast"
  | "ask"
  | "fingerprint"
  | "bazantic"
  | "worklist"
  | "wallet";

const TABS: { id: TabId; label: string }[] = [
  { id: "fleet", label: "Fleet Run" },
  { id: "fanout", label: "Fan-out" },
  { id: "signals", label: "Signals" },
  { id: "eac", label: "EAC / roles" },
  { id: "dispute", label: "Dispute / revoke" },
  { id: "cast", label: "Kill switch" },
  { id: "ask", label: "Ask the case" },
  { id: "fingerprint", label: "Fingerprint" },
  { id: "bazantic", label: "Bazantic meter" },
  { id: "worklist", label: "Worklist" },
  { id: "wallet", label: "Wallet gate" },
];

/**
 * ENDGAME Phase 2 — Playground.
 * Where density lives happily so Hook + Loop stay quiet.
 */
export function PlaygroundScreen({
  address,
  onAddress,
  onOpenIdentity,
  onOpenRegistry,
  onMemoryHit,
}: {
  address: string;
  onAddress: (a: string) => void;
  onOpenIdentity?: (a: string) => void;
  onOpenRegistry?: () => void;
  onMemoryHit?: () => void;
}) {
  const [tab, setTab] = useState<TabId>("fleet");
  const active = (address || DEMO_TARGETS[0].address).trim().toLowerCase();

  return (
    <section className="app-content rise">
      <header style={{ marginBottom: 20 }}>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: "var(--t-floor)",
            letterSpacing: "0.1em",
            color: "var(--sig)",
          }}
        >
          PLAYGROUND · POWER TOOLS
        </p>
        <h1
          style={{
            margin: "10px 0 0",
            fontFamily: "var(--font-display)",
            fontSize: "var(--t-display)",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "var(--tx-hi)",
          }}
        >
          Internals, on purpose.
        </h1>
        <p
          style={{
            margin: "10px 0 0",
            maxWidth: 560,
            fontSize: "var(--t-sm)",
            lineHeight: 1.5,
            color: "var(--tx-lo)",
          }}
        >
          Fleet, fan-out, EAC, dispute, cast, fingerprint, Bazantic — advanced
          surfaces live here so the Hook and Loop stay one job each.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Playground tools"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 20,
          paddingBottom: 12,
          borderBottom: "1px solid var(--line)",
        }}
      >
        {TABS.map((t) => {
          const on = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.id)}
              style={{
                ...btnGhost,
                padding: "7px 12px",
                fontSize: 12,
                borderColor: on ? "var(--sig)" : "var(--line)",
                color: on ? "var(--tx-hi)" : "var(--tx-lo)",
                fontWeight: on ? 600 : 500,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {tab === "fleet" ? (
          <FleetRun
            onSelect={onAddress}
            onOpenIdentity={onOpenIdentity}
          />
        ) : null}

        {tab === "fanout" ? (
          <FanOutConsole address={active} auto compact={false} />
        ) : null}

        {tab === "signals" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <VerifiedRulePathsStrip />
            <StandardsRegistryPanel />
          </div>
        ) : null}

        {tab === "eac" ? <EacProbePanel address={active} /> : null}

        {tab === "dispute" ? (
          <DisputeRevokePanel
            address={active}
            onDone={onOpenRegistry}
          />
        ) : null}

        {tab === "cast" ? <KillSwitchProof address={active} /> : null}

        {tab === "ask" ? <AskTab address={active} /> : null}

        {tab === "fingerprint" ? (
          <FingerprintPanel address={active} />
        ) : null}

        {tab === "bazantic" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <BazanticPayPanel
              demoAddress={active}
              evidenceAddress={DEMO_TARGETS[0].address}
              variant="full"
            />
            <SessionMeter />
          </div>
        ) : null}

        {tab === "worklist" ? (
          <AgentWorklist
            onSelect={onAddress}
            onOpenIdentity={onOpenIdentity}
          />
        ) : null}

        {tab === "wallet" ? (
          <WalletGatePanel onMemoryHit={onMemoryHit} />
        ) : null}
      </div>
    </section>
  );
}

function EacProbePanel({ address }: { address: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    reverted?: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  async function probe() {
    setBusy(true);
    setResult(null);
    try {
      const json = await fetchJson<{
        reverted?: boolean;
        message?: string;
        error?: string;
      }>("/api/govern/eac-probe", {
        method: "POST",
        headers: { "content-type": "application/json", ...writeHeaders() },
        body: JSON.stringify({ address: address.trim().toLowerCase() }),
      });
      setResult(json);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "EAC probe failed";
      setResult({ reverted: /revert/i.test(msg), message: msg, error: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: "var(--t-sm)", color: "var(--tx-lo)", maxWidth: 520, lineHeight: 1.5 }}>
        Investigator key attempts <code>saviours.dispute</code>. Expected:{" "}
        <strong style={{ color: "var(--tx-hi)" }}>revert</strong>. That is Enhanced
        Access Control — not a policy in our backend.
      </p>
      <button type="button" onClick={() => void probe()} disabled={busy} style={btnPrimary}>
        {busy ? "Probing…" : "Probe investigator → dispute (expect revert)"}
      </button>
      {result ? (
        <pre
          style={{
            marginTop: 14,
            padding: 14,
            background: "var(--bg-inset)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            fontSize: "var(--t-floor)",
            overflow: "auto",
            color: result.reverted ? "var(--safe)" : "var(--warn)",
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function DisputeRevokePanel({
  address,
  onDone,
}: {
  address: string;
  onDone?: () => void;
}) {
  const [reason, setReason] = useState("playground dispute test");
  const [busy, setBusy] = useState<"dispute" | "revoke" | null>(null);
  const [out, setOut] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function dispute() {
    setBusy("dispute");
    setErr(null);
    setOut(null);
    try {
      const json = await fetchJson<{ ok?: boolean; error?: string; txHash?: string }>(
        "/api/govern/dispute",
        {
          method: "POST",
          headers: { "content-type": "application/json", ...writeHeaders() },
          body: JSON.stringify({
            address: address.trim().toLowerCase(),
            reason,
          }),
        },
      );
      if (json.error) throw new Error(json.error);
      setOut(JSON.stringify(json, null, 2));
      onDone?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "dispute failed");
    } finally {
      setBusy(null);
    }
  }

  async function revoke() {
    setBusy("revoke");
    setErr(null);
    setOut(null);
    try {
      const json = await fetchJson<{ ok?: boolean; error?: string }>(
        "/api/govern/revoke",
        {
          method: "POST",
          headers: { "content-type": "application/json", ...writeHeaders() },
          body: JSON.stringify({ address: address.trim().toLowerCase() }),
        },
      );
      if (json.error) throw new Error(json.error);
      setOut(JSON.stringify(json, null, 2));
      onDone?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "revoke failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <p style={{ margin: "0 0 12px", fontSize: "var(--t-sm)", color: "var(--tx-lo)", lineHeight: 1.5 }}>
        Writes fail-closed in production unless{" "}
        <code>SAVIOURS_ALLOW_WRITES=1</code>. Dispute flips status → WATCH.
        Revoke clears the name.
      </p>
      <p style={{ margin: "0 0 8px", fontFamily: "var(--font-mono)", fontSize: "var(--t-floor)", color: "var(--ink-muted)" }}>
        target · {address}
      </p>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        style={{ ...fieldStyle, maxWidth: "100%", marginBottom: 12 }}
        aria-label="Dispute reason"
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => void dispute()} disabled={!!busy} style={btnPrimary}>
          {busy === "dispute" ? "Disputing…" : "Dispute → WATCH"}
        </button>
        <button type="button" onClick={() => void revoke()} disabled={!!busy} style={btnGhost}>
          {busy === "revoke" ? "Revoking…" : "Revoke name"}
        </button>
      </div>
      {err ? <p role="alert" style={{ marginTop: 12, color: "var(--red)", fontSize: "var(--t-sm)" }}>{err}</p> : null}
      {out ? (
        <pre style={{ marginTop: 12, padding: 12, background: "var(--bg-inset)", fontSize: "var(--t-floor)", overflow: "auto" }}>
          {out}
        </pre>
      ) : null}
    </div>
  );
}

function AskTab({ address }: { address: string }) {
  const packet: AskPacketClient = useMemo(
    () => ({
      address,
      status: "TAINTED",
      explanation:
        "Playground ask — uses live case API when you submit a question.",
      signals: [
        { id: "FLASHLOAN_ONE_SHOT", class: "threat" },
        { id: "ATOMIC_MULTI_PROTOCOL", class: "threat" },
      ],
    }),
    [address],
  );
  return <AskPanel packet={packet} />;
}

function FingerprintPanel({ address }: { address: string }) {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    setOut(null);
    try {
      const json = await fetchJson<Record<string, unknown>>(
        "/api/fingerprint/recompute",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chainId: 1,
            address: address.trim().toLowerCase(),
          }),
        },
      );
      setOut(JSON.stringify(json, null, 2));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "fingerprint failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: "var(--t-sm)", color: "var(--tx-lo)", maxWidth: 520, lineHeight: 1.5 }}>
        Recompute dossier fingerprint vs registry / ENS evidence hash. Clone
        cascade (code-hash names) lands in Phase 4 — this panel is the existing hook.
      </p>
      <button type="button" onClick={() => void run()} disabled={busy} style={btnPrimary}>
        {busy ? "Recomputing…" : "Recompute fingerprint"}
      </button>
      {err ? <p role="alert" style={{ marginTop: 12, color: "var(--red)", fontSize: "var(--t-sm)" }}>{err}</p> : null}
      {out ? (
        <pre style={{ marginTop: 12, padding: 12, background: "var(--bg-inset)", fontSize: "var(--t-floor)", overflow: "auto", maxHeight: 420 }}>
          {out}
        </pre>
      ) : null}
    </div>
  );
}
