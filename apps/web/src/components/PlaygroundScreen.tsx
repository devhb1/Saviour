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
import { ErrorBanner } from "./ErrorBanner";
import { EnsPointsPanel } from "./EnsPointsPanel";
import { SafeSwapRecipePanel } from "./SafeSwapRecipePanel";
import { fetchJson } from "../lib/fetchJson";
import { clientWritesAllowed, writeHeaders } from "../lib/writeGuard";

type TabId =
  | "fleet"
  | "fanout"
  | "signals"
  | "ens"
  | "recipe"
  | "eac"
  | "dispute"
  | "cast"
  | "ask"
  | "fingerprint"
  | "clone"
  | "bazantic"
  | "worklist"
  | "wallet";

const TABS: { id: TabId; label: string }[] = [
  { id: "cast", label: "Kill switch · cast" },
  { id: "ens", label: "ENSv2 · live API" },
  { id: "fleet", label: "Fleet · fleet-triage" },
  { id: "fanout", label: "Fan-out" },
  { id: "signals", label: "Signals" },
  { id: "ask", label: "Ask · investigate-once-explain" },
  { id: "recipe", label: "safe-swap · fixture" },
  { id: "eac", label: "EAC / roles" },
  { id: "dispute", label: "Dispute / revoke" },
  { id: "fingerprint", label: "Dossier · dossier-deep-dive" },
  { id: "clone", label: "Clone defense" },
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
  const [tab, setTab] = useState<TabId>("cast");
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
          Fleet · recipe <code>fleet-triage</code>, fan-out, EAC, dispute, cast,
          fingerprint · <code>dossier-deep-dive</code>, Ask ·{" "}
          <code>investigate-once-explain</code>, deep ENSv2 reads, Bazantic
          meter — advanced surfaces live here so the Hook and Loop stay one job
          each.
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

        {tab === "ens" ? <EnsPointsPanel address={active} /> : null}

        {tab === "recipe" ? <SafeSwapRecipePanel /> : null}

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

        {tab === "clone" ? (
          <CloneDefensePanel address={active} onAddress={onAddress} />
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
      {result?.reverted ? (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            border: "1px solid color-mix(in srgb, var(--safe) 40%, var(--line))",
            borderRadius: "var(--r-md)",
            background: "color-mix(in srgb, var(--safe) 8%, var(--surface))",
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, color: "var(--safe)" }}>
            EAC revert · permission model holds
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--tx-lo)", lineHeight: 1.45 }}>
            Investigator cannot write <code>saviours.dispute</code> — role caps in
            the resolver, not a policy in our backend.
          </p>
          {result.message ? (
            <p
              style={{
                margin: "8px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--tx-faint)",
                wordBreak: "break-word",
              }}
            >
              {result.message}
            </p>
          ) : null}
        </div>
      ) : null}
      {result && !result.reverted ? (
        <div style={{ marginTop: 14 }}>
          <ErrorBanner
            title="Unexpected allow — EAC should have reverted"
            detail={result.message ?? result.error ?? JSON.stringify(result)}
          />
        </div>
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
  const writesOpen = clientWritesAllowed();

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
          timeoutMs: 60_000,
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
          timeoutMs: 90_000,
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
        Dispute flips status → WATCH. Revoke clears <strong>all</strong>{" "}
        <code>saviours.*</code> text keys (not just status). On{" "}
        <strong style={{ color: "var(--tx-hi)" }}>www.saviours.xyz</strong> writes
        are fail-closed (instant 401) unless the film host opens them. Local{" "}
        <code>pnpm dev</code> can write — Sepolia RPC may take up to ~60s; we
        time out instead of hanging forever.
      </p>
      {!writesOpen ? (
        <p
          style={{
            margin: "0 0 12px",
            padding: "10px 12px",
            border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--line))",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            color: "var(--tx-lo)",
            lineHeight: 1.45,
            background: "color-mix(in srgb, var(--warn) 8%, var(--surface))",
          }}
        >
          This host is <strong style={{ color: "var(--warn)" }}>read-only</strong>.
          Clicking Dispute/Revoke returns <code>401 Writes disabled</code> quickly
          — that is the product demo, not a hang. For a live write, run{" "}
          <code>pnpm dev</code> with writes enabled.
        </p>
      ) : null}
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
          {busy === "dispute"
            ? writesOpen
              ? "Disputing (≤60s)…"
              : "Checking write gate…"
            : "Dispute → WATCH"}
        </button>
        <button type="button" onClick={() => void revoke()} disabled={!!busy} style={btnGhost}>
          {busy === "revoke"
            ? writesOpen
              ? "Revoking (≤90s)…"
              : "Checking write gate…"
            : "Revoke name"}
        </button>
      </div>
      {err ? (
        <div style={{ marginTop: 12 }}>
          <ErrorBanner title="Dispute / revoke failed" detail={err} />
        </div>
      ) : null}
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
  const [out, setOut] = useState<Record<string, unknown> | null>(null);
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
          timeoutMs: 30_000,
        },
      );
      setOut(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "fingerprint failed");
    } finally {
      setBusy(false);
    }
  }

  const dossierError =
    out && typeof out.dossierError === "string"
      ? String(out.dossierError)
      : null;
  const dossierUrl =
    out && typeof out.dossierUrl === "string" ? String(out.dossierUrl) : null;
  const verdict =
    out && typeof out.verdict === "string" ? String(out.verdict) : null;
  const htmlPostMortem =
    !!dossierError &&
    (/HTML instead of JSON/i.test(dossierError) ||
      /human page|blog/i.test(dossierError));

  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: "var(--t-sm)", color: "var(--tx-lo)", maxWidth: 560, lineHeight: 1.5 }}>
        Recipe <code>dossier-deep-dive</code>: compare ENS / registry{" "}
        <code>evidenceHash</code> to a <strong>pinned JSON dossier</strong> when
        one exists. Hero currently stores a public post-mortem URL (Certik blog) —
        that is intentional human context, not a machine dossier. Hashes still
        prove the memory. Cascade →{" "}
        <strong style={{ color: "var(--tx-hi)" }}>Clone defense</strong>.
      </p>
      <button type="button" onClick={() => void run()} disabled={busy} style={btnPrimary}>
        {busy ? "Recomputing…" : "Recompute fingerprint"}
      </button>
      {err ? (
        <div style={{ marginTop: 12 }}>
          <ErrorBanner title="Fingerprint recompute failed" detail={err} />
        </div>
      ) : null}
      {dossierError || verdict === "DOSSIER_UNREACHABLE" ? (
        <div style={{ marginTop: 12 }}>
          <ErrorBanner
            title={
              htmlPostMortem
                ? "Post-mortem is HTML — not a pinned JSON dossier"
                : "External dossier unavailable"
            }
            detail={dossierError ?? "The published post-mortem was unreachable."}
          >
            {htmlPostMortem ? (
              <>
                <code>saviours.dossier</code> points at a human write-up
                {dossierUrl ? (
                  <>
                    {" "}
                    (
                    <a href={dossierUrl} target="_blank" rel="noreferrer">
                      open
                    </a>
                    )
                  </>
                ) : null}
                . ENS / registry evidence hashes below still hold — verdict memory
                is unaffected.
              </>
            ) : (
              <>The evidence hash and the verdict are unaffected.</>
            )}
          </ErrorBanner>
        </div>
      ) : null}
      {out ? (
        <pre style={{ marginTop: 12, padding: 12, background: "var(--bg-inset)", fontSize: "var(--t-floor)", overflow: "auto", maxHeight: 420 }}>
          {JSON.stringify(out, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

/**
 * Clone defense demo — address miss → eth_getCode → code-<hash>.saviours.eth.
 * Hits only if a class name is registered; otherwise shows computed name + miss.
 */
function CloneDefensePanel({
  address,
  onAddress,
}: {
  address: string;
  onAddress: (a: string) => void;
}) {
  const [input, setInput] = useState(address);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [check, setCheck] = useState<{
    decision?: string;
    reason?: string;
    ensName?: string | null;
    cascadeLayer?: string;
    source?: string;
    codeClass?: {
      ensName: string;
      hit: boolean;
      status?: string;
      layer: string;
    };
    cost?: { graphQueries: number; aiCalls: number; ensResolutions: number };
    latencyMs?: number;
  } | null>(null);

  async function run() {
    const addr = input.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(addr)) {
      setErr("Need a 0x address");
      return;
    }
    setBusy(true);
    setErr(null);
    setCheck(null);
    onAddress(addr);
    try {
      const json = await fetchJson<{
        check?: {
          decision?: string;
          reason?: string;
          ensName?: string | null;
          cascadeLayer?: string;
          source?: string;
          codeClass?: {
            ensName: string;
            hit: boolean;
            status?: string;
            layer: string;
          };
          cost?: {
            graphQueries: number;
            aiCalls: number;
            ensResolutions: number;
          };
          latencyMs?: number;
        };
        error?: string;
      }>("/api/shield/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chainId: 1, address: addr }),
      });
      if (json.error) throw new Error(json.error);
      setCheck(json.check ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cascade check failed");
    } finally {
      setBusy(false);
    }
  }

  const layer = check?.cascadeLayer;
  const hitViaClone = layer === "code" || layer === "deployer";

  return (
    <div>
      <p
        style={{
          margin: "0 0 8px",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--t-floor)",
          letterSpacing: "0.08em",
          color: "var(--sig)",
        }}
      >
        CLONE DEFENSE · ADDRESS → BYTECODE → CODE-HASH ENS
      </p>
      <p
        style={{
          margin: "0 0 14px",
          fontSize: "var(--t-sm)",
          color: "var(--tx-lo)",
          maxWidth: 560,
          lineHeight: 1.5,
        }}
      >
        We don&apos;t ask who the address is. We ask what it&apos;s made of.
        Shield: address name → if miss, <code>eth_getCode</code> → resolve{" "}
        <code>code-&lt;hash20&gt;.saviours.eth</code>. Still 0 Graph · 0 AI. Hit
        only when that class name is registered.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="0x… contract or clone"
          style={{ ...fieldStyle, flex: "1 1 280px", minWidth: 0 }}
        />
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          style={btnPrimary}
        >
          {busy ? "Cascading…" : "Run cascade check"}
        </button>
      </div>
      <ol
        style={{
          margin: "0 0 14px",
          paddingLeft: 18,
          fontSize: "var(--t-sm)",
          color: "var(--tx-lo)",
          lineHeight: 1.55,
          maxWidth: 560,
        }}
      >
        <li>Resolve <code>&lt;address&gt;.saviours.eth</code></li>
        <li>MISS → mainnet <code>getCode</code> → class label</li>
        <li>
          Resolve class name → BLOCK/WARN if named · else escalate (honest miss)
        </li>
      </ol>
      {err ? (
        <p role="alert" style={{ color: "var(--red)", fontSize: "var(--t-sm)" }}>
          {err}
        </p>
      ) : null}
      {check ? (
        <div
          style={{
            padding: 14,
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-inset)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: "var(--t-sm)",
              color: hitViaClone
                ? "var(--red)"
                : check.decision === "BLOCK" || check.decision === "WARN"
                  ? "var(--warn)"
                  : "var(--tx-hi)",
            }}
          >
            {check.decision ?? "?"}
            {hitViaClone
              ? ` · via ${layer} class`
              : ` · source=${check.source ?? "?"}`}
          </p>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: "var(--t-sm)",
              color: "var(--tx-lo)",
              lineHeight: 1.45,
            }}
          >
            {check.reason}
          </p>
          <p
            style={{
              margin: "8px 0 0",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--t-floor)",
              color: "var(--tx-lo)",
              wordBreak: "break-all",
            }}
          >
            {check.ensName ?? "(no ENS name)"} · graph=
            {check.cost?.graphQueries ?? 0} ai={check.cost?.aiCalls ?? 0} ens=
            {check.cost?.ensResolutions ?? 0} · {check.latencyMs ?? "?"}ms
          </p>
          {check.codeClass?.hit ? (
            <p
              style={{
                margin: "10px 0 0",
                fontSize: "var(--t-sm)",
                color: "var(--safe, var(--sig))",
                lineHeight: 1.45,
              }}
            >
              Bytecode class armed: <code>{check.codeClass.ensName}</code> ·{" "}
              {check.codeClass.status}. An unnamed address with this code would
              BLOCK via cascade (first sighting).
            </p>
          ) : null}
          {!hitViaClone && check.source === "none" ? (
            <p
              style={{
                margin: "10px 0 0",
                fontSize: "var(--t-sm)",
                color: "var(--tx-lo)",
                lineHeight: 1.45,
              }}
            >
              No address name and no registered <code>code-*</code> class yet —
              cascade ran (or skipped without mainnet RPC) and honestly escalated.
              Register one class name to demo the block-on-first-sighting beat.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
