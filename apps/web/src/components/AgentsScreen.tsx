"use client";

import { useCallback, useState, type CSSProperties } from "react";
import {
  DEMO_TARGETS,
  HOME_CHIPS,
  btnGhost,
  btnPrimary,
  fieldStyle,
} from "./AppShell";
import { fetchJson } from "../lib/fetchJson";
import { clientWritesAllowed, writeHeaders } from "../lib/writeGuard";
import { BrandMark } from "./BrandMark";
import { MarkMark, SectionMark, StatusPill } from "./Mark";

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

function shortAddr(a: string): string {
  if (a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function ensNameFor(address: string): string {
  return `${address.toLowerCase()}.saviours.eth`;
}

export function AgentsScreen({
  address,
  onAddress,
  onMemoryHit,
  onOpenCase,
}: {
  address: string;
  onAddress: (a: string) => void;
  onMemoryHit: () => void;
  onOpenCase: (a?: string) => void;
}) {
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const [verdictA, setVerdictA] = useState<string | null>(null);
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

  const push = useCallback((kind: LogKind, text: string) => {
    setLog((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, t: Date.now(), kind, text },
    ]);
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setBusy(false);
    setLog([]);
    setVerdictA(null);
    setDecisionB(null);
    setReceipt(null);
    setWalletAOpen(false);
    setWalletBOpen(false);
  }, []);

  async function runDemo() {
    const target = (address.trim() || HOME_CHIPS[0].address).toLowerCase();
    onAddress(target);
    reset();
    setBusy(true);
    setPhase("walletA");
    setWalletAOpen(true);
    push("system", `Demo target ${shortAddr(target)}`);
    push("agentA", "Trading bot — pending Confirm swap (fake wallet)");
    push("warn", "Agent A pauses — will not sign until investigation returns");

    // Brief beat so judges see the wallet chrome
    await sleep(900);

    setPhase("investigate");
    push("agentA", "POST /api/investigate · forceFresh · Graph fan-out");
    const t0 = performance.now();
    try {
      const inv = await fetchJson<{
        memoryHit?: boolean;
        assessment?: { status?: string };
        remember?: { ensName?: string };
        shield?: { ensName?: string; usedAi?: boolean };
        cost?: { graphQueries?: number };
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
      const firstMs = Math.round(performance.now() - t0);
      const status = inv.assessment?.status ?? "UNKNOWN";
      setVerdictA(status);
      const usedAi = Boolean(inv.explanation) || inv.shield?.usedAi === true;
      push(
        "ok",
        `Agent A · ${status} · ${firstMs}ms · Graph paid · AI ${usedAi ? "explains only" : "off"}`,
      );

      setPhase("ens");
      const name =
        inv.remember?.ensName ?? inv.shield?.ensName ?? ensNameFor(target);
      push("ens", `Naming ${name}`);
      push("ens", "Writing saviours.status · threat · evidenceHash · plainVerdict");
      if (clientWritesAllowed()) {
        push("ens", "Remember path open — texts land on Sepolia ENSv2");
      } else {
        push(
          "warn",
          "Host writes fail-closed — heroes pre-named; film uses local writes",
        );
      }
      await sleep(600);

      setWalletAOpen(false);
      push("agentA", `Cancel swap — counterparty ${status}`);
      push("ok", "Agent A aborts. Finding is named memory.");

      setPhase("walletB");
      setWalletBOpen(true);
      push("agentB", "Wallet copilot — pending Approve spend (fake wallet)");
      push("agentB", "Checking security memory before sign…");
      await sleep(700);

      setPhase("shield");
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
      const secondMs = Math.round(performance.now() - t1);
      const check = shield.check;
      if (!check) throw new Error("Shield returned no check");
      if (check.source === "ens" || check.source === "registry") onMemoryHit();
      setDecisionB(check.decision);
      const zero =
        (check.source === "ens" || check.source === "registry") &&
        !check.usedAi;
      push(
        zero ? "ok" : "warn",
        `Agent B · ${check.decision} · source=${check.source} · ${secondMs}ms · ${zero ? "0 Graph · 0 AI" : "not a pure memory hit"}`,
      );
      setReceipt({
        firstMs,
        secondMs,
        firstGraph: true,
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
      setPhase("done");
    } catch (e) {
      setPhase("error");
      push("err", e instanceof Error ? e.message : "Demo failed");
      setWalletAOpen(false);
      setWalletBOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rise" style={{ paddingTop: 4 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <SectionMark>AGENTS · A DISCOVERS · B REMEMBERS</SectionMark>
        <StatusPill>LIVE APIS · FAKE WALLETS</StatusPill>
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
          <BrandMark size={56} style={{ marginBottom: 14 }} />
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              maxWidth: 520,
            }}
          >
            Two agents. One investigation.
            <br />
            <MarkMark>Zero cost the second time.</MarkMark>
          </h1>
          <p
            style={{
              margin: "14px 0 0",
              fontSize: 15,
              color: "var(--ink-muted)",
              maxWidth: 480,
              lineHeight: 1.5,
            }}
          >
            Agent A pays The Graph, names the finding on{" "}
            <code style={codeInline}>&lt;address&gt;.saviours.eth</code>. Agent B
            only reads ENS — then cancels the approval.
          </p>

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
              style={{ ...fieldStyle, maxWidth: 360 }}
              placeholder="0x…"
              spellCheck={false}
              aria-label="Demo address"
            />
            <button
              type="button"
              onClick={() => void runDemo()}
              disabled={busy}
              style={btnPrimary}
            >
              {busy ? "Running…" : "Run demo"}
            </button>
            <button type="button" onClick={reset} style={btnGhost} disabled={busy}>
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
                style={chipStyle}
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
            phase={phase === "walletA" || phase === "investigate" ? "pending" : verdictA ? "cancelled" : "idle"}
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
            outcome={
              decisionB
                ? `Cancelled · ${decisionB}${receipt && !receipt.secondGraph && !receipt.secondAi ? " · 0·0" : ""}`
                : undefined
            }
          />
        </div>
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
        </div>
      ) : null}

      <div style={{ marginTop: 28 }}>
        <SectionMark>ACTIVITY LOG</SectionMark>
        <div style={terminal}>
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
        </div>
        {phase === "done" ? (
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--ink-muted)" }}>
            Deep dive the dossier →{" "}
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
              Open case
            </button>
          </p>
        ) : null}
      </div>

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
}: {
  title: string;
  action: string;
  detail: string;
  open: boolean;
  phase: "idle" | "pending" | "cancelled";
  outcome?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 4,
        background: open || phase !== "idle" ? "var(--surface)" : "transparent",
        padding: "14px 16px",
        opacity: phase === "idle" && !open ? 0.55 : 1,
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
          background: "color-mix(in srgb, var(--ink) 8%, transparent)",
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
        {ms}ms · Graph {graph ? "ON" : "0"} · AI {ai ? "ON" : "0"}
      </div>
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

const codeInline: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.92em",
  color: "var(--ink)",
};

const terminal: CSSProperties = {
  marginTop: 12,
  padding: "16px 18px",
  borderRadius: 4,
  border: "1px solid var(--line)",
  background: "color-mix(in srgb, var(--ink) 92%, #0a111f)",
  color: "#d7e2ec",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  lineHeight: 1.65,
  minHeight: 220,
  maxHeight: 360,
  overflowY: "auto",
};

function logLine(kind: LogKind): CSSProperties {
  const color =
    kind === "err"
      ? "#f5a3a3"
      : kind === "warn"
        ? "#f0c674"
        : kind === "ok"
          ? "#8fd4b8"
          : kind === "ens"
            ? "#7ec8d4"
            : kind === "agentA"
              ? "#c5d4e8"
              : kind === "agentB"
                ? "#d4c5e8"
                : "#9aa8b5";
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
