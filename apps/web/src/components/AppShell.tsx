"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { clientWritesAllowed } from "../lib/writeGuard";
import { BrandLockup, BrandMark } from "./BrandMark";
import { CommandBar } from "./CommandBar";
import { ThemeToggle } from "./ThemeToggle";

/** Product nouns. Case / Docs remain deep-linkable; Shield also via ⌘K. */
export type ScreenId =
  | "home"
  | "agents"
  | "case"
  | "identity"
  | "registry"
  | "shield"
  | "docs"
  | "developers"
  | "legacy";

/**
 * The nav IS the walkthrough.
 *
 * Numbering the steps is what let us delete two entire rows of chrome: the loop
 * breadcrumb and the tour rail both existed only because the nav was a list of
 * features instead of a list of steps. 03 is the product; the rest is why and
 * what it buys you. Case is depth — reached from 02 / 04 / 05, never from here.
 */
const STEPS: { id: ScreenId; n: string; label: string; hint: string }[] = [
  { id: "home", n: "01", label: "Threat", hint: "the danger · the thesis · the receipts" },
  { id: "agents", n: "02", label: "Investigate", hint: "Graph fan-out · an agent that pays" },
  { id: "identity", n: "03", label: "Name", hint: "the ENS ceremony — this is the product" },
  { id: "shield", n: "04", label: "Resolve", hint: "any address · 0 Graph · 0 AI · $0" },
  { id: "registry", n: "05", label: "Memory", hint: "the public ledger" },
];

/** References, not steps. Visibly a tier down from the numbers. */
const REFERENCES: { id: ScreenId; label: string; hint: string }[] = [
  { id: "developers", label: "Build", hint: "SDK · MCP · API · recipe" },
  { id: "docs", label: "Docs", hint: "the long read" },
];

/** Depth screens fold onto the step they belong to. */
function stepFor(screen: ScreenId): ScreenId {
  if (screen === "case") return "agents";
  return screen;
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
  onMemoryHit,
  children,
}: {
  screen: ScreenId;
  onScreen: (s: ScreenId) => void;
  memoryHits: number;
  onMemoryHit?: () => void;
  children: ReactNode;
}) {
  const writesOpen = clientWritesAllowed();

  return (
    <div
      style={{ minHeight: "100vh", padding: "18px 18px 48px" }}
      className="app-shell"
    >
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
            {STEPS.map((s) => {
              const active = s.id === stepFor(screen);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onScreen(s.id)}
                  aria-label={`Step ${s.n}. ${s.label}. ${s.hint}`}
                  aria-current={active ? "page" : undefined}
                  className="nav-tab"
                  data-active={active ? "true" : "false"}
                  style={{
                    display: "inline-flex",
                    alignItems: "baseline",
                    gap: 6,
                    padding: "14px 13px",
                    border: "none",
                    borderBottom: "2px solid transparent",
                    background: "transparent",
                    color: active ? "var(--tx-hi)" : "var(--tx-lo)",
                    fontFamily: "var(--font-body)",
                    fontWeight: active ? 600 : 500,
                    fontSize: 13.5,
                    letterSpacing: "-0.005em",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: "0.06em",
                      color: active ? "var(--sig)" : "var(--tx-faint)",
                    }}
                  >
                    {s.n}
                  </span>
                  {s.label}
                </button>
              );
            })}

            <span
              aria-hidden="true"
              style={{
                width: 1,
                height: 14,
                margin: "0 10px",
                background: "var(--line-mid)",
              }}
            />

            {REFERENCES.map((r) => {
              const active = r.id === screen;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onScreen(r.id)}
                  aria-label={`${r.label}. ${r.hint}`}
                  aria-current={active ? "page" : undefined}
                  className="nav-tab"
                  data-active={active ? "true" : "false"}
                  style={{
                    padding: "14px 11px",
                    border: "none",
                    borderBottom: "2px solid transparent",
                    background: "transparent",
                    color: active ? "var(--tx-hi)" : "var(--tx-faint)",
                    fontFamily: "var(--font-body)",
                    fontWeight: active ? 600 : 500,
                    fontSize: 12.5,
                    letterSpacing: "-0.005em",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.label}
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
          <CommandBar
            onMemoryHit={onMemoryHit}
            onOpenPassport={(a) => {
              window.dispatchEvent(
                new CustomEvent("saviours:set-address", { detail: a }),
              );
              onScreen("identity");
            }}
            onOpenCase={(a) => {
              window.dispatchEvent(
                new CustomEvent("saviours:set-address", { detail: a }),
              );
              onScreen("case");
            }}
          />
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
          <ThemeToggle />
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
            metered by Bazantic. Press ⌘K from any screen.
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
  border: "1px solid var(--line-mid)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-inset)",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  color: "var(--tx-hi)",
  outline: "none",
  transition: "border-color var(--fast) var(--ease), box-shadow var(--fast) var(--ease)",
};

/** Inverted on dark: light surface, void text. The one loud control. */
export const btnPrimary: CSSProperties = {
  padding: "11px 18px",
  border: "1px solid transparent",
  borderRadius: "var(--radius-chip)",
  background: "var(--tx-hi)",
  color: "var(--bg-void)",
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  letterSpacing: "-0.005em",
  boxShadow: "var(--lift)",
};

export const btnGhost: CSSProperties = {
  padding: "11px 18px",
  border: "1px solid var(--line-mid)",
  borderRadius: "var(--radius-chip)",
  background: "var(--bg-high)",
  color: "var(--tx)",
  fontFamily: "var(--font-body)",
  fontWeight: 500,
  fontSize: 14,
  cursor: "pointer",
  letterSpacing: "-0.005em",
};

/**
 * For controls sitting on the night stage (hero plane, agent theater), which
 * stays dark in both themes. Never use --bg-* here: on Daylight those resolve
 * to paper and the control disappears into a white box on a black panel.
 */
export const btnOnNight: CSSProperties = {
  padding: "11px 18px",
  border: "1px solid var(--night-line)",
  borderRadius: "var(--radius-chip)",
  background: "color-mix(in srgb, var(--mark-on-night) 8%, transparent)",
  color: "var(--mark-on-night)",
  fontFamily: "var(--font-body)",
  fontWeight: 500,
  fontSize: 14,
  cursor: "pointer",
  letterSpacing: "-0.005em",
};
