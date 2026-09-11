"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  DEMO_TARGETS,
  HOME_CHIPS,
  btnGhost,
  btnPrimary,
  fieldStyle,
} from "./AppShell";
import { fetchJson } from "../lib/fetchJson";
import { resolveTargetClient } from "../lib/resolveTargetClient";
import { VALIDATOR_BEATS } from "../lib/validatorBeats";
import { clientWritesAllowed, writeHeaders } from "../lib/writeGuard";
import { BrandMark } from "./BrandMark";
import { SectionMark } from "./Mark";
import { StageRail, type Stage } from "./StageRail";
import { AgentWorklist } from "./AgentWorklist";
import { BazanticPayPanel } from "./BazanticPayPanel";
import { FanOutConsole } from "./FanOutConsole";
import { NamingCeremony } from "./NamingCeremony";
import { KillSwitchProof } from "./KillSwitchProof";
import { SessionMeter } from "./SessionMeter";
import { FleetRun } from "./FleetRun";
import { AgentClientConsole } from "./AgentClientConsole";
import { TourNextCta } from "./TourNextCta";
import { UnderHoodDiagrams } from "./UnderHoodDiagrams";

type LogKind = "system" | "agentA" | "agentB" | "ens" | "ok" | "warn" | "err";

type LogLine = {
  id: string;
  t: number;
  kind: LogKind;
  text: string;
};

type DemoPhase =
  | "idle"
  | "walletA"
  | "investigate"
  | "ens"
  | "walletB"
  | "shield"
  | "done"
  | "error";

/** Same beat copy as Case forceFresh — judges see the Graph path while waiting. */
const HOOD_STEPS = [
  "Resolving ENS / Shield…",
  "Querying 1 template × 8 Messari deployments…",
  "Deriving deterministic signals…",
  "AI explaining cited evidence…",
  "Validator deciding…",
] as const;

function shortAddr(a: string): string {
  if (a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function ensNameFor(address: string): string {
  return `${address.toLowerCase()}.saviours.eth`;
}

function stageForHoodIndex(i: number): { active: Stage; completed: Stage[] } {
  if (i <= 1) return { active: "fanout", completed: [] };
  if (i === 2) return { active: "verdict", completed: ["fanout"] };
  if (i === 3) return { active: "explain", completed: ["fanout", "verdict"] };
  return { active: "named", completed: ["fanout", "verdict", "explain"] };
}

export function AgentsScreen({
  address,
  onAddress,
  onMemoryHit,
  onOpenCase,
  onOpenIdentity,
  onOpenShield,
}: {
  address: string;
  onAddress: (a: string) => void;
  onMemoryHit: () => void;
  onOpenCase: (a?: string) => void;
  onOpenIdentity?: (a?: string) => void;
  onOpenShield?: (a?: string) => void;
}) {
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const [verdictA, setVerdictA] = useState<string | null>(null);
  const [namedEns, setNamedEns] = useState<string | null>(null);
  const [namedThreat, setNamedThreat] = useState<string | null>(null);
  const [decisionB, setDecisionB] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{
    firstMs: number;
    secondMs: number;
    firstGraph: boolean;
    secondGraph: boolean;
    firstAi: boolean;
    secondAi: boolean;
  } | null>(null);
  const [walletAOpen, setWalletAOpen] = useState(false);
  const [walletBOpen, setWalletBOpen] = useState(false);
  const [hood, setHood] = useState<string | null>(null);
  const [hoodDone, setHoodDone] = useState<string[]>([]);
  const [stage, setStage] = useState<{ active: Stage; completed: Stage[] }>({
    active: "fanout",
    completed: [],
  });
  const logEndRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const hoodStepRef = useRef(0);
  const validatorBeatRef = useRef(0);

  const push = useCallback((kind: LogKind, text: string) => {
    setLog((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, t: Date.now(), kind, text },
    ]);
  }, []);

  // Scroll only inside the terminal — never hijack the page (demo-run bug).
  useEffect(() => {
    const el = terminalRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [log, hood]);

  const reset = useCallback(() => {
    setPhase("idle");
    setBusy(false);
    setLog([]);
    setVerdictA(null);
    setNamedEns(null);
    setNamedThreat(null);
    setDecisionB(null);
    setReceipt(null);
    setWalletAOpen(false);
    setWalletBOpen(false);
    setHood(null);
    setHoodDone([]);
    setStage({ active: "fanout", completed: [] });
    hoodStepRef.current = 0;
  }, []);

  async function runDemo() {
    const raw = address.trim() || HOME_CHIPS[0].address;
    setBusy(true);
    const resolved = await resolveTargetClient(raw);
    if (!resolved.ok) {
      reset();
      setBusy(false);
      setPhase("error");
      push("err", resolved.error);
      return;
    }
    const target = resolved.address;
    onAddress(target);
    reset();
    setBusy(true);
    setPhase("walletA");
    setWalletAOpen(true);
    if (resolved.via === "ens" && resolved.ensName) {
      push(
        "system",
        `Resolved ${resolved.ensName} → ${shortAddr(target)}`,
      );
    }
    push("system", `Demo target ${shortAddr(target)}`);
    push("agentA", "Trading bot — pending Confirm swap (fake wallet)");
    push("warn", "Agent A pauses — will not sign until investigation returns");

    await sleep(900);

    setPhase("investigate");
    push("agentA", "POST /api/investigate · forceFresh · Graph fan-out");
    push("system", `// ${HOOD_STEPS[0]}`);
    setHood(HOOD_STEPS[0]);
    setHoodDone([]);
    setStage({ active: "fanout", completed: [] });
    hoodStepRef.current = 0;
    validatorBeatRef.current = 0;

    const tick = window.setInterval(() => {
      const next = hoodStepRef.current + 1;
      if (next >= HOOD_STEPS.length) {
        // Long wait lives on the last step — rotate interactive validator copy.
        validatorBeatRef.current =
          (validatorBeatRef.current + 1) % VALIDATOR_BEATS.length;
        const beat = VALIDATOR_BEATS[validatorBeatRef.current]!;
        setHood(beat);
        if (validatorBeatRef.current === 1 || validatorBeatRef.current === 3) {
          push("system", `// ${beat}`);
        }
        return;
      }
      hoodStepRef.current = next;
      const line = HOOD_STEPS[next]!;
      const prev = HOOD_STEPS[next - 1]!;
      setHoodDone((d) => (d.includes(prev) ? d : [...d, prev]));
      setHood(line);
      setStage(stageForHoodIndex(next));
      push("system", `// ${line}`);
    }, 1100);

    const t0 = performance.now();
    try {
      const inv = await fetchJson<{
        memoryHit?: boolean;
        assessment?: { status?: string; threat?: string };
        remember?: {
          ensName?: string;
          persisted?: boolean;
          reason?: string;
        };
        shield?: { ensName?: string; usedAi?: boolean };
        cost?: { graphQueries?: number; aiCalls?: number; usedAi?: boolean };
        explanation?: unknown;
      }>("/api/investigate", {
        method: "POST",
        headers: writeHeaders(),
        body: JSON.stringify({
          chainId: 1,
          address: target,
          persist: clientWritesAllowed(),
          registryNetwork: "sepolia",
          forceFresh: true,
        }),
      });
      window.clearInterval(tick);
      setHoodDone([...HOOD_STEPS]);
      setHood("Graph + validator complete · naming on ENS…");
      setStage({
        active: "named",
        completed: ["fanout", "verdict", "explain"],
      });
      push("system", "// Graph + validator complete · naming on ENS…");

      const firstMs = Math.round(performance.now() - t0);
      const status = inv.assessment?.status ?? "UNKNOWN";
      setVerdictA(status);
      const usedAi =
        Boolean(inv.explanation) ||
        inv.cost?.usedAi === true ||
        (inv.cost?.aiCalls ?? 0) > 0;
      const firstGraph = (inv.cost?.graphQueries ?? 0) > 0;
      push(
        firstGraph ? "ok" : "warn",
        `Agent A · ${status} · ${firstMs}ms · Graph ${firstGraph ? "paid" : "0?"} · AI ${usedAi ? "explains only" : "off"}`,
      );

      setPhase("ens");
      const named =
        inv.remember?.persisted === true ||
        status === "WATCH" ||
        status === "TAINTED";
      if (!named) {
        push(
          "warn",
          `Not named — ${status} is not WATCH/TAINTED · nothing written to Registry / ENS (product law)`,
        );
        if (inv.remember?.reason) {
          push("system", `// remember skipped · ${inv.remember.reason}`);
        }
        setHood(`Clean / non-persistable · ${status} · Registry unchanged`);
        setWalletAOpen(false);
        push("agentA", `Proceed? Counterparty ${status} — no shared memory minted`);
        push("ok", "Agent A can continue — no threat name to publish.");
        setPhase("done");
        setBusy(false);
        setReceipt({
          firstMs,
          secondMs: 0,
          firstGraph,
          secondGraph: false,
          firstAi: usedAi,
          secondAi: false,
        });
        return;
      }

      const name =
        inv.remember?.ensName ?? inv.shield?.ensName ?? ensNameFor(target);
      setNamedEns(name);
      setNamedThreat(inv.assessment?.threat ?? null);
      push("ens", `Naming ${name}`);
      push("ens", "Writing saviours.status · threat · evidenceHash · plainVerdict");
      setHood(`Writing text records · ${name}`);
      if (clientWritesAllowed()) {
        push("ens", "Remember path open — texts land on Sepolia ENSv2");
      } else {
        push(
          "warn",
          "Host writes fail-closed — heroes pre-named; film uses local writes",
        );
      }
      await sleep(600);
      setStage({
        active: "named",
        completed: ["fanout", "verdict", "explain", "named"],
      });

      setWalletAOpen(false);
      push("agentA", `Cancel swap — counterparty ${status}`);
      push("ok", "Agent A aborts. Finding is named memory.");

      setPhase("walletB");
      setWalletBOpen(true);
      setHood("Agent B · reading security memory (ENS only)…");
      push("agentB", "Wallet copilot — pending Approve spend (fake wallet)");
      push("agentB", "Checking security memory before sign…");
      await sleep(700);

      setPhase("shield");
      setHood("POST /api/shield/check · ENS status · 0 Graph · 0 AI…");
      push("system", "// POST /api/shield/check · ENS status · 0 Graph · 0 AI");
      const t1 = performance.now();
      const shield = await fetchJson<{
        check?: {
          decision: string;
          source: string;
          usedAi: boolean;
          usedGraph?: boolean;
          latencyMs?: number;
        };
      }>("/api/shield/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chainId: 1,
          address: target,
          registryNetwork: "sepolia",
        }),
      });
      const wallMs = Math.round(performance.now() - t1);
      const check = shield.check;
      if (!check) throw new Error("Shield returned no check");
      if (check.source === "ens" || check.source === "registry") onMemoryHit();
      setDecisionB(check.decision);
      const secondMs =
        typeof check.latencyMs === "number" && check.latencyMs > 0
          ? check.latencyMs
          : wallMs;
      const zero =
        (check.source === "ens" || check.source === "registry") &&
        !check.usedAi;
      push(
        zero ? "ok" : "warn",
        zero
          ? `Agent B · ${check.decision} · source=${check.source} · 0 Graph · 0 AI · ${secondMs}ms`
          : `Agent B · ${check.decision} · source=${check.source} · ${secondMs}ms · not a pure memory hit`,
      );
      if (zero) {
        push(
          "ok",
          "BAZ · shieldCheck · saviour.bazgateway.com · $0 · x402 metered",
        );
      }
      setReceipt({
        firstMs,
        secondMs,
        firstGraph,
        secondGraph: !(check.source === "ens" || check.source === "registry"),
        firstAi: usedAi,
        secondAi: check.usedAi,
      });

      setWalletBOpen(false);
      push("agentB", `Cancel approval — Shield ${check.decision}`);
      push(
        "system",
        "The Graph paid for the first investigation. ENS is why the second agent pays nothing.",
      );
      setHood(null);
      setPhase("done");
    } catch (e) {
      window.clearInterval(tick);
      setPhase("error");
      setHood(null);
      push("err", e instanceof Error ? e.message : "Demo failed");
      setWalletAOpen(false);
      setWalletBOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const showHood = Boolean(hood) || (busy && phase === "investigate");

  return (
    <section className="rise" style={{ paddingTop: 4 }}>
      <div
        className="home-hero-plane"
        style={{
          padding: "clamp(22px, 3vw, 32px) clamp(18px, 3vw, 28px)",
          borderRadius: 14,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
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
            // AGENTS · A DISCOVERS · B REMEMBERS
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
            LIVE APIS · FAKE WALLETS
          </span>
        </div>

      <div
        style={{
          marginTop: 22,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(280px, 0.9fr)",
          gap: 24,
          alignItems: "start",
        }}
        className="agents-hero"
      >
        <div>
          <BrandMark
            size={56}
            style={{
              marginBottom: 14,
              filter: "drop-shadow(0 12px 28px color-mix(in srgb, var(--signal) 30%, transparent))",
            }}
          />
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              maxWidth: 520,
              color: "var(--mark-on-night)",
            }}
          >
            Two agents. One investigation.
            <br />
            <span className="mark-sheen">Zero cost the second time.</span>
          </h1>
          <p
            style={{
              margin: "14px 0 0",
              fontSize: 15,
              color: "var(--tx)",
              maxWidth: 480,
              lineHeight: 1.5,
            }}
          >
            Agent A pays The Graph, names the finding on{" "}
            <code style={{ ...codeInline, color: "var(--signal-bright)", background: "transparent" }}>
              &lt;address&gt;.saviours.eth
            </code>
            . Agent B only reads ENS — then cancels the approval.
          </p>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 8,
              maxWidth: 480,
            }}
            aria-label="Agent stages"
          >
            {(
              [
                { n: "01", t: "DISCOVER", d: "Graph + rules", phases: ["walletA", "investigate"] },
                { n: "02", t: "NAME", d: "saviours.eth", phases: ["ens"] },
                { n: "03", t: "REMEMBER", d: "0 Graph · 0 AI", phases: ["walletB", "shield", "done"] },
              ] as const
            ).map((s) => {
              const lit = (s.phases as readonly string[]).includes(phase) || phase === "done";
              return (
              <div
                key={s.n}
                className={lit ? "stage-live" : undefined}
                style={{
                  padding: "10px 10px 12px",
                  border: lit
                    ? "1px solid color-mix(in srgb, var(--signal) 55%, transparent)"
                    : "1px solid var(--night-line)",
                  background: lit
                    ? "color-mix(in srgb, var(--signal) 12%, transparent)"
                    : "color-mix(in srgb, var(--mark-on-night) 4%, transparent)",
                  borderRadius: 2,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    color: "var(--signal-bright)",
                  }}
                >
                  {s.n}
                </p>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    letterSpacing: "0.06em",
                    color: "var(--mark-on-night)",
                    fontWeight: 600,
                  }}
                >
                  {s.t}
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--tx-lo)",
                  }}
                >
                  {s.d}
                </p>
              </div>
            );
            })}
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
            }}
          >
            <input
              value={address}
              onChange={(e) => onAddress(e.target.value.trim())}
              className="field-focus"
              style={{
                ...fieldStyle,
                maxWidth: 360,
                background: "color-mix(in srgb, var(--mark-on-night) 6%, transparent)",
                border: "1px solid var(--night-line)",
                color: "var(--mark-on-night)",
              }}
              placeholder="0x… or jaredfromsubway.eth"
              spellCheck={false}
              aria-label="Demo address or ENS name"
            />
            <button
              type="button"
              onClick={() => void runDemo()}
              disabled={busy}
              className="btn-primary-motion"
              style={{
                ...btnPrimary,
                background: "var(--signal)",
                color: "var(--night)",
              }}
            >
              {busy ? "Running…" : "Run demo →"}
            </button>
            <button
              type="button"
              onClick={reset}
              style={{
                ...btnGhost,
                borderColor: "var(--night-line)",
                color: "var(--mark-on-night)",
              }}
              disabled={busy}
            >
              Reset
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 12,
            }}
          >
            {HOME_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                disabled={busy}
                onClick={() => onAddress(chip.address)}
                style={{
                  ...chipStyle,
                  borderColor: "var(--night-line)",
                  background: "transparent",
                  color: "var(--tx-lo)",
                }}
              >
                {chip.plain}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <FakeWallet
            title="Agent A · Trading bot"
            action="Confirm swap"
            detail={`Send → ${shortAddr(address || DEMO_TARGETS[0].address)}`}
            open={walletAOpen}
            phase={
              phase === "walletA" || phase === "investigate" || phase === "ens"
                ? "pending"
                : verdictA
                  ? "cancelled"
                  : "idle"
            }
            outcome={verdictA ? `Cancelled · ${verdictA}` : undefined}
          />
          <FakeWallet
            title="Agent B · Wallet copilot"
            action="Approve spend"
            detail="Unlimited USDC · spender unknown"
            open={walletBOpen || phase === "shield" || phase === "done"}
            phase={
              phase === "walletB" || phase === "shield"
                ? "pending"
                : decisionB
                  ? "cancelled"
                  : "idle"
            }
            outcome={decisionB ? `Cancelled · Shield ${decisionB}` : undefined}
            waitingLabel="WAITING · after Agent A names the threat"
          />
        </div>
      </div>
      </div>

      {showHood ? (
        <div style={{ marginTop: 28 }}>
          <SectionMark>UNDER THE HOOD · FORCE FRESH</SectionMark>
          <div style={hoodPanel} className="terminal-panel on-night">
            <StageRail active={stage.active} completed={stage.completed} />
            <details style={{ marginTop: 10 }}>
              <summary
                style={{
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--signal)",
                  letterSpacing: "0.06em",
                }}
              >
                Graph · 1 template × 8 (expand)
              </summary>
              <div style={{ marginTop: 10 }}>
                <UnderHoodDiagrams focus="graph" />
              </div>
            </details>
            <p
              className="pulse-decision"
              style={{
                margin: "12px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                color: "var(--mark-on-night)",
                lineHeight: 1.45,
              }}
            >
              {hood ?? HOOD_STEPS[0]}
            </p>
            {hoodDone.length > 0 ? (
              <ul
                style={{
                  listStyle: "none",
                  margin: "14px 0 0",
                  padding: 0,
                  display: "grid",
                  gap: 6,
                }}
              >
                {hoodDone.map((line) => (
                  <li
                    key={line}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--tx)",
                    }}
                  >
                    <span style={{ color: "var(--signal-bright)", marginRight: 8 }}>✓</span>
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
            <p
              style={{
                margin: "14px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--tx-lo)",
                lineHeight: 1.45,
              }}
            >
              Same path as Case forceFresh — Messari × 8 + Adapter A → signals →
              AI cites → validator. Agent B will not pay this again.
            </p>
          </div>
        </div>
      ) : null}

      {/* Activity log high — scroll stays inside terminal, not the page */}
      <div style={{ marginTop: 28 }}>
        <SectionMark>ACTIVITY LOG</SectionMark>
        <div ref={terminalRef} style={terminal} className="on-night">
          {log.length === 0 ? (
            <p style={{ margin: 0, color: "var(--ink-muted)" }}>
              // waiting — press Run demo
            </p>
          ) : (
            log.map((line) => (
              <div key={line.id} style={logLine(line.kind)}>
                <span style={{ opacity: 0.55, marginRight: 10 }}>
                  {new Date(line.t).toISOString().slice(11, 19)}
                </span>
                <span style={{ opacity: 0.7, marginRight: 8 }}>
                  {kindTag(line.kind)}
                </span>
                {line.text}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
        {phase === "done" ? (
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--ink-muted)" }}>
            Every signal, protocol and raw Graph row behind this verdict →{" "}
            <button
              type="button"
              onClick={() => onOpenCase(address.trim() || HOME_CHIPS[0].address)}
              style={{
                border: "none",
                background: "none",
                padding: 0,
                color: "var(--signal)",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Open full dossier →
            </button>
          </p>
        ) : null}
      </div>

      {receipt ? (
        <div style={{ marginTop: 28 }}>
          <SectionMark>COST RECEIPT</SectionMark>
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              maxWidth: 640,
            }}
          >
            <ReceiptBar
              label="FIRST · Agent A"
              ms={receipt.firstMs}
              graph={receipt.firstGraph}
              ai={receipt.firstAi}
              fill={1}
            />
            <ReceiptBar
              label="SECOND · Agent B"
              ms={receipt.secondMs}
              graph={receipt.secondGraph}
              ai={receipt.secondAi}
              fill={
                receipt.secondGraph || receipt.secondAi
                  ? 0.45
                  : Math.min(0.12, receipt.secondMs / Math.max(receipt.firstMs, 1))
              }
            />
          </div>
          {!receipt.secondGraph && !receipt.secondAi ? (
            <div
              style={{
                marginTop: 12,
                maxWidth: 640,
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
              }}
            >
              <span style={statChip}>0 Graph</span>
              <span style={statChip}>0 AI</span>
              <span
                style={{
                  ...statChip,
                  borderColor: "var(--signal)",
                  color: "var(--signal)",
                }}
              >
                Settled $0 via Bazantic
              </span>
            </div>
          ) : null}
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 13,
              color: "var(--ink-muted)",
              maxWidth: 640,
            }}
          >
            Shield checks are free forever. A fresh investigation costs $0.01,
            metered by Bazantic.
          </p>
        </div>
      ) : null}

      {phase === "investigate" ||
      phase === "ens" ||
      phase === "walletB" ||
      phase === "shield" ||
      phase === "done" ? (
        <div style={{ marginTop: 28 }}>
          <SectionMark>GRAPH · LIVE FAN-OUT</SectionMark>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 14,
              color: "var(--ink-muted)",
              maxWidth: 560,
              lineHeight: 1.5,
            }}
          >
            Watch the 1×8 Messari deployments resolve live — ms, rows, honest empties.
          </p>
          <FanOutConsole
            address={address.trim() || HOME_CHIPS[0].address}
            auto
            compact
          />
        </div>
      ) : null}

      {namedEns && (verdictA === "TAINTED" || verdictA === "WATCH") ? (
        <div style={{ marginTop: 28 }}>
          <SectionMark>ENS · NAMING CEREMONY</SectionMark>
          <NamingCeremony
            address={address.trim() || HOME_CHIPS[0].address}
            status={verdictA}
            threat={namedThreat}
            ensNameHint={namedEns}
            auto
            onOpenIdentity={
              onOpenIdentity
                ? (a) => onOpenIdentity(a)
                : undefined
            }
          />
        </div>
      ) : null}

      {phase === "done" && decisionB ? (
        <div style={{ marginTop: 28 }}>
          <SectionMark>KILL-SWITCH</SectionMark>
          <KillSwitchProof address={address.trim() || HOME_CHIPS[0].address} />
        </div>
      ) : null}

      <div style={{ marginTop: 28 }}>
        <SectionMark>WHO PAYS · LIVE AGENT CLIENT</SectionMark>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 14,
            color: "var(--ink-muted)",
            maxWidth: 560,
            lineHeight: 1.5,
          }}
        >
          Not this website. A separate integrator agent reads ENS for free, pays
          the miss from its own Base account, then a second agent resolves the
          same memory for $0.
        </p>
        <AgentClientConsole address={address.trim() || HOME_CHIPS[0].address} />
      </div>

      <div style={{ marginTop: 28 }}>
        <SectionMark>BAZANTIC · $0 HIT · PAY ON MISS</SectionMark>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 14,
            color: "var(--ink-muted)",
            maxWidth: 560,
            lineHeight: 1.5,
          }}
        >
          Shield checks are free forever. A fresh investigation costs $0.01,
          metered by Bazantic — and the agent pays, not us.
        </p>
        <BazanticPayPanel variant="compact" />
        <SessionMeter />
      </div>

      <div style={{ marginTop: 28 }}>
        <SectionMark>FLEET RUN</SectionMark>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 14,
            color: "var(--ink-muted)",
            maxWidth: 560,
            lineHeight: 1.5,
          }}
        >
          Pick a threat class. Run five live. Watch MEMORY / ORACLE / COST move.
          Catalog labels are theater — only Graph-verified rows claim detection.
        </p>
        <FleetRun
          onSelect={onAddress}
          onOpenIdentity={onOpenIdentity}
        />
      </div>

      <details
        style={{
          marginTop: 28,
          padding: "14px 16px",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-md)",
          background: "var(--surface)",
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.06em",
            color: "var(--ink)",
            fontWeight: 600,
          }}
        >
          Optional · multi-address worklist (expand)
        </summary>
        <AgentWorklist
          onSelect={(a) => onAddress(a)}
          onOpenIdentity={(a) => onOpenIdentity?.(a)}
        />
      </details>

      <details
        style={{
          marginTop: 14,
          padding: "14px 16px",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-md)",
          background: "var(--surface)",
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.06em",
            color: "var(--ink)",
            fontWeight: 600,
          }}
        >
          Optional · Graph · ENS · Bazantic diagrams (expand)
        </summary>
        <div style={{ marginTop: 12 }}>
          <UnderHoodDiagrams />
        </div>
      </details>

      {onOpenShield || onOpenIdentity ? (
        <TourNextCta
          label="Next · 03 Name — watch the ENS ceremony →"
          hint="The finding becomes a subname you can cast · records · Sepolia tx · passport"
          onNext={() => {
            const a = address.trim() || HOME_CHIPS[0].address;
            if (onOpenIdentity) onOpenIdentity(a);
            else onOpenShield?.(a);
          }}
        />
      ) : null}

      <style>{`
        @media (max-width: 900px) {
          .agents-hero { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function kindTag(k: LogKind): string {
  switch (k) {
    case "agentA":
      return "A";
    case "agentB":
      return "B";
    case "ens":
      return "ENS";
    case "ok":
      return "OK";
    case "warn":
      return "!!";
    case "err":
      return "ERR";
    default:
      return "//";
  }
}

function FakeWallet({
  title,
  action,
  detail,
  open,
  phase,
  outcome,
  waitingLabel,
}: {
  title: string;
  action: string;
  detail: string;
  open: boolean;
  phase: "idle" | "pending" | "cancelled";
  outcome?: string;
  /** When idle and not open, collapse to a one-line waiting strip */
  waitingLabel?: string;
}) {
  const collapsed = phase === "idle" && !open && Boolean(waitingLabel);

  if (collapsed) {
    return (
      <div
        style={{
          border: "1px dashed var(--line)",
          borderRadius: "var(--radius-sm)",
          background: "transparent",
          padding: "10px 14px",
          opacity: 0.7,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.1em",
            color: "var(--ink-faint)",
          }}
        >
          {waitingLabel}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-sm)",
        background: open || phase !== "idle" ? "var(--surface)" : "transparent",
        padding: "14px 16px",
        opacity: 1,
        transition: "opacity 0.2s ease",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 8,
          fontFamily: "var(--font-display)",
          fontSize: 18,
          fontWeight: 500,
          color: "var(--ink)",
        }}
      >
        {action}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 12,
          color: "var(--ink-muted)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {detail}
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            ...pill,
            background: phase === "pending" ? "var(--warn)" : "var(--line)",
            color: phase === "pending" ? "#1a1208" : "var(--ink-muted)",
          }}
        >
          {phase === "pending" ? "PENDING" : phase === "cancelled" ? "CANCELLED" : "IDLE"}
        </span>
        {outcome ? (
          <span style={{ ...pill, color: "var(--ink)", border: "1px solid var(--line)" }}>
            {outcome}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ReceiptBar({
  label,
  ms,
  graph,
  ai,
  fill,
}: {
  label: string;
  ms: number;
  graph: boolean;
  ai: boolean;
  fill: number;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: "12px 14px",
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.06em",
          color: "var(--ink-muted)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 8,
          height: 10,
          borderRadius: 2,
          background: "var(--bg-high)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.max(4, Math.round(fill * 100))}%`,
            background: graph || ai ? "var(--signal)" : "var(--ink)",
            transition: "width 0.6s ease",
          }}
        />
      </div>
      <div
        style={{
          marginTop: 8,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink)",
        }}
      >
        {graph ? 1 : 0} Graph · {ai ? 1 : 0} AI · {ms}ms
      </div>
      {!graph && !ai ? (
        <div
          style={{
            marginTop: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--ink-muted)",
            lineHeight: 1.4,
          }}
        >
          Cost eliminated — wall time is plain ms, not a race.
        </div>
      ) : null}
    </div>
  );
}

const chipStyle: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 4,
  border: "1px solid var(--line)",
  background: "var(--surface)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink-muted)",
  cursor: "pointer",
};

const statChip: CSSProperties = {
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-sm)",
  background: "var(--surface)",
  textAlign: "center",
  color: "var(--ink)",
};

const codeInline: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.92em",
  color: "var(--ink)",
};

const hoodPanel: CSSProperties = {
  marginTop: 12,
  padding: "16px 18px",
  borderRadius: 2,
  border: "1px solid var(--night-line)",
  background: "var(--night)",
};

const terminal: CSSProperties = {
  marginTop: 12,
  padding: "16px 18px",
  borderRadius: 2,
  border: "1px solid var(--night-line)",
  background: "var(--night)",
  color: "var(--mark-on-night)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  lineHeight: 1.65,
  minHeight: 220,
  maxHeight: 360,
  overflowY: "auto",
  boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--mark-on-night) 6%, transparent)",
};

function logLine(kind: LogKind): CSSProperties {
  const color =
    kind === "err"
      ? "var(--red)"
      : kind === "warn"
        ? "var(--amber)"
        : kind === "ok"
          ? "var(--green)"
          : kind === "ens"
            ? "var(--sig-hi)"
            : kind === "agentA"
              ? "var(--tx)"
              : kind === "agentB"
                ? "var(--violet)"
                : "var(--tx-lo)";
  return { color, marginBottom: 4 };
}

const pill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: 4,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};
