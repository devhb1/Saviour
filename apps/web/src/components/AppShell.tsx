"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { clientWritesAllowed } from "../lib/writeGuard";
import { BrandLockup, BrandMark } from "./BrandMark";
import { ThemePicker } from "./ThemeProvider";

/** Product nouns (ENDGAME V1). Case stays reachable via depth links / #case. */
export type ScreenId =
  | "home"
  | "agents"
  | "case"
  | "identity"
  | "registry"
  | "shield"
  | "developers"
  | "legacy";

const SCREENS: { id: ScreenId; label: string; hint: string }[] = [
  { id: "home", label: "Home", hint: "danger · thesis" },
  { id: "agents", label: "Live", hint: "A discovers · B free" },
  { id: "shield", label: "Shield", hint: "0 Graph · 0 AI" },
  { id: "identity", label: "Identity", hint: "ENS passport · cast" },
  { id: "registry", label: "Memory", hint: "public ledger" },
  { id: "developers", label: "Build", hint: "MCP · Bazantic · roadmap" },
];

const LOOP_STAGES: { id: ScreenId | "case"; label: string }[] = [
  { id: "agents", label: "Investigate (Graph)" },
  { id: "identity", label: "Name (ENS)" },
  { id: "shield", label: "Resolve free" },
];

function loopActive(screen: ScreenId): string {
  if (screen === "agents" || screen === "case") return "agents";
  if (screen === "identity" || screen === "registry") return "identity";
  if (screen === "shield") return "shield";
  return "";
}

const MEMORY_KEY = "saviours.memoryHitCount";

export function useMemoryHitCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    try {
      setCount(Number(localStorage.getItem(MEMORY_KEY) || "0") || 0);
    } catch {
      setCount(0);
    }
  }, []);
  function bump() {
    setCount((c) => {
      const next = c + 1;
      try {
        localStorage.setItem(MEMORY_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }
  return { count, bump };
}

export function AppShell({
  screen,
  onScreen,
  memoryHits,
  children,
}: {
  screen: ScreenId;
  onScreen: (s: ScreenId) => void;
  memoryHits: number;
  children: ReactNode;
}) {
  const writesOpen = clientWritesAllowed();

  return (
    <div
      style={{ minHeight: "100vh", padding: "18px 18px 48px" }}
      className="app-shell"
    >
      {/* Sourcemark-simple: one strip — brand | nav | status */}
      <header
        className="app-chrome"
        style={{
          maxWidth: 1400,
          margin: "0 auto 28px",
          padding: "0 4px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          borderBottom: "1px solid color-mix(in srgb, var(--line) 80%, transparent)",
          paddingBottom: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 4,
            minWidth: 0,
            flex: "1 1 auto",
          }}
        >
          <BrandLockup onClick={() => onScreen("home")} size={28} />
          <nav
            className="app-nav"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 0,
              marginLeft: 8,
              overflowX: "auto",
            }}
            aria-label="Primary"
          >
            {SCREENS.map((s) => {
              const active = s.id === screen;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onScreen(s.id)}
                  aria-label={`${s.label}. ${s.hint}`}
                  aria-current={active ? "page" : undefined}
                  className="nav-tab"
                  data-active={active ? "true" : "false"}
                  style={{
                    padding: "14px 14px",
                    border: "none",
                    borderBottom: "2px solid transparent",
                    background: "transparent",
                    color: active ? "var(--ink)" : "var(--ink-muted)",
                    fontFamily: "var(--font-mono)",
                    fontWeight: active ? 600 : 500,
                    fontSize: 12,
                    letterSpacing: "0.03em",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            paddingBottom: 10,
          }}
        >
          <ThemePicker />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-muted)",
            }}
          >
            Memory ·{" "}
            <span style={{ color: "var(--signal)", fontWeight: 600 }}>
              {memoryHits}
            </span>
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              flexShrink: 0,
              padding: "5px 10px",
              borderRadius: "var(--radius-chip, 4px)",
              border: "1px solid color-mix(in srgb, var(--line) 80%, transparent)",
              background: "var(--surface)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.05em",
              color: "var(--ink)",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: writesOpen ? "var(--signal)" : "var(--warn)",
              }}
            />
            {writesOpen ? "writes open" : "sepolia · read-only"}
          </span>
        </div>
      </header>

      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto 18px",
          padding: "0 4px",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.04em",
          color: "var(--ink-muted)",
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
        aria-label="Product loop"
      >
        {LOOP_STAGES.map((s, i) => {
          const active = loopActive(screen) === s.id;
          return (
            <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              {i > 0 ? <span style={{ opacity: 0.4 }}>·</span> : null}
              <button
                type="button"
                onClick={() => onScreen(s.id as ScreenId)}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  letterSpacing: "inherit",
                  color: active ? "var(--signal)" : "var(--ink-muted)",
                  fontWeight: active ? 700 : 500,
                }}
              >
                {s.label}
              </button>
            </span>
          );
        })}
        <span style={{ opacity: 0.45 }}>(Shield / cast / MCP / Bazantic)</span>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto" }}>{children}</div>

      <footer
        style={{
          maxWidth: 1400,
          margin: "48px auto 0",
          paddingTop: 20,
          borderTop: "1px solid color-mix(in srgb, var(--line) 70%, transparent)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-muted)",
          lineHeight: 1.6,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 720 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <BrandMark size={18} />
            <span style={{ color: "var(--ink)" }}>saviour</span>
          </span>
          <span>
            Shield checks are free forever. A fresh investigation costs $0.01,
            metered by Bazantic.
          </span>
          <span>
            Evidence · mainnet Graph · Memory · Sepolia ENSv2 · Gateway ·
            saviour.bazgateway.com
          </span>
        </div>
        <span
          style={{
            alignSelf: "flex-start",
            padding: "6px 10px",
            border: "1px solid color-mix(in srgb, var(--line) 70%, transparent)",
            borderRadius: "var(--radius-chip, 4px)",
            color: writesOpen ? "var(--signal)" : "var(--warn)",
            whiteSpace: "nowrap",
          }}
        >
          Writes · {writesOpen ? "open (Remember OK)" : "fail-closed (read-only)"}
        </span>
      </footer>
    </div>
  );
}

export const DEMO_TARGETS = [
  {
    id: "ATTACK-1",
    address: "0x935bfb495e33f74d2e9735df1da66ace442ede48",
    label: "MakinaFi",
    plain: "Known exploiter",
  },
  {
    id: "ATTACK-2",
    address: "0x1f23eb80f0c16758e4a55d48097c343bd20be56f",
    label: "HopeLend",
    plain: "Named attacker",
  },
  {
    id: "BOT-1",
    address: "0x352423e2fa5d5c99343d371c9e3bc56c87723cc7",
    label: "Bot",
    plain: "Flashloan bot",
  },
  {
    id: "BENIGN-1",
    address: "0x55fe002aeff02f77364de339a1292923a15844b8",
    label: "Circle",
    plain: "Clean treasury",
  },
  {
    id: "HOP-1",
    address: "0xa6c248384c5ddd934b83d0926d2e2a1ddf008387",
    label: "Hop",
    plain: "Fund-flow hop",
  },
] as const;

/** First-fold chips — plain language, not ATTACK-1 ids. */
export const HOME_CHIPS = [
  DEMO_TARGETS[0],
  DEMO_TARGETS[2],
  DEMO_TARGETS[3],
] as const;

/** Shared honesty copy — WhatWeDont + CoverageStrip must stay in sync. */
export const HONESTY_BOUNDS = {
  title: "What this does not do",
  paths:
    "FLASHLOAN_ONE_SHOT ∧ ATOMIC → TAINTED · BOT_PROFILE → WATCH · REGISTRY_COOCCURRENCE → TAINTED on live Graph edge",
  detects:
    "flashloan-driven atomic attacks · known-tainted counterparty propagation · bot-profile (WATCH, not TAINTED)",
  notLive: "drain fan-in/out (needs counterparty wiring)",
  doesNot:
    "offchain coordination · novel contract-logic exploits · social engineering · assets outside the 8 indexed protocols (Balancer/Pancake/Convex currently broken on network)",
  refusals: [
    {
      title: "Not a general detector",
      body: "One live TAINTED class + WATCH contrast. Naming is the product.",
    },
    {
      title: "Not eight integrations",
      body: "One Messari template × eight deployments. Broken subgraphs excluded.",
    },
    {
      title: "Not mainnet ENS enforcement yet",
      body: "Evidence = mainnet Graph. Memory = Sepolia ENSv2 — stated ceiling.",
    },
    {
      title: "Not pay-per-Shield",
      body: "MEMORY HIT stays $0 on UI, MCP, and Bazantic. Investigate is the miss.",
    },
    {
      title: "Not “SAFE means safe”",
      body: "NO KNOWN THREAT / no name ≠ endorsement. UNKNOWN is deliberate.",
    },
    {
      title: "Not Immunity with ENS paint",
      body: "We remember Graph evidence under a name you can cast — not an LLM opinion.",
    },
  ],
} as const;

export function CoverageStrip() {
  return (
    <aside
      style={{
        marginTop: 28,
        padding: "16px 18px",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-soft, 10px)",
        background: "var(--surface)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        lineHeight: 1.55,
        color: "var(--ink-muted)",
      }}
    >
      <strong style={{ color: "var(--ink)", fontSize: 13 }}>
        Coverage · honest bounds
      </strong>
      <br />
      VERIFIED RULE PATHS (not a fat registry):{" "}
      <span style={{ color: "var(--ink)" }}>{HONESTY_BOUNDS.paths}</span>
      <br />
      DETECTS: {HONESTY_BOUNDS.detects}
      <br />
      RULE SHIPPED / NOT LIVE-PROVEN: {HONESTY_BOUNDS.notLive}
      <br />
      DOES NOT: {HONESTY_BOUNDS.doesNot}
      <br />
      <span style={{ color: "var(--ink)" }}>
        Full contrast: docs/DIFFERENTIATION.md
      </span>
    </aside>
  );
}

export const fieldStyle: CSSProperties = {
  width: "100%",
  maxWidth: 560,
  padding: "12px 14px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-soft, 10px)",
  background: "var(--surface)",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  color: "var(--ink)",
  outline: "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

export const btnPrimary: CSSProperties = {
  padding: "12px 20px",
  border: "none",
  borderRadius: "var(--radius-chip, 4px)",
  background: "var(--ink)",
  color: "var(--paper)",
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  letterSpacing: "0.01em",
};

export const btnGhost: CSSProperties = {
  padding: "12px 20px",
  border: "1px solid var(--ink)",
  borderRadius: "var(--radius-chip, 4px)",
  background: "transparent",
  color: "var(--ink)",
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};
