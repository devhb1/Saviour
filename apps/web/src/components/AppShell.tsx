"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { clientWritesAllowed } from "../lib/writeGuard";
import { BrandLockup } from "./BrandMark";

/** Product nouns (V2). legacy keeps Investigate/Resolve/Govern until film. */
export type ScreenId =
  | "home"
  | "case"
  | "registry"
  | "shield"
  | "developers"
  | "legacy";

const SCREENS: { id: ScreenId; label: string; hint: string }[] = [
  { id: "home", label: "HOME", hint: "walkthrough · paste" },
  { id: "case", label: "CASE", hint: "investigate · name" },
  { id: "shield", label: "SHIELD", hint: "0 Graph · 0 AI" },
  { id: "registry", label: "REGISTRY", hint: "public memory" },
  { id: "developers", label: "DEVS", hint: "cast · MCP · API" },
];

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
    <div style={{ minHeight: "100vh", padding: "28px 24px 48px" }}>
      <header
        style={{
          maxWidth: 1400,
          margin: "0 auto 20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "end",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <BrandLockup onClick={() => onScreen("home")} size={34} />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-muted)",
            }}
          >
            Memory hits · {memoryHits}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid var(--line)",
              background: "#fff",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--ink)",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: writesOpen ? "var(--signal)" : "var(--warn)",
              }}
            />
            {writesOpen ? "WRITES · OPEN" : "SEPOLIA · READ-ONLY"}
          </span>
        </div>
      </header>

      <nav
        style={{
          maxWidth: 1400,
          margin: "0 auto 24px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          borderBottom: "1px solid var(--line)",
          paddingBottom: 0,
          overflowX: "auto",
        }}
      >
        {SCREENS.map((s) => {
          const active = s.id === screen;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onScreen(s.id)}
              title={s.hint}
              style={{
                padding: "12px 16px",
                border: "none",
                borderBottom: active
                  ? "2px solid var(--ink)"
                  : "2px solid transparent",
                background: "transparent",
                color: active ? "var(--ink)" : "var(--ink-muted)",
                fontFamily: "var(--font-mono)",
                fontWeight: 500,
                fontSize: 11,
                letterSpacing: "0.1em",
                cursor: "pointer",
                marginBottom: -1,
                whiteSpace: "nowrap",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </nav>

      <div style={{ maxWidth: 1400, margin: "0 auto" }}>{children}</div>

      <footer
        style={{
          maxWidth: 1400,
          margin: "40px auto 0",
          paddingTop: 16,
          borderTop: "1px solid var(--line)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-muted)",
          lineHeight: 1.55,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span>
          saviour · The Graph paid for the first investigation. ENS is why the
          second agent pays nothing. · Evidence mainnet · Memory Sepolia ENSv2
          beta.
        </span>
        <span style={{ color: writesOpen ? "var(--signal)" : "var(--warn)" }}>
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

/** Shared honesty copy — Home + CoverageStrip must stay in sync. */
export const HONESTY_BOUNDS = {
  title: "What this does not do",
  paths:
    "FLASHLOAN_ONE_SHOT ∧ ATOMIC → TAINTED · BOT_PROFILE → WATCH · REGISTRY_COOCCURRENCE → TAINTED on live Graph edge",
  detects:
    "flashloan-driven atomic attacks · known-tainted counterparty propagation · bot-profile (WATCH, not TAINTED)",
  notLive: "drain fan-in/out (needs counterparty wiring)",
  doesNot:
    "offchain coordination · novel contract-logic exploits · social engineering · assets outside the 8 indexed protocols (Balancer/Pancake/Convex currently broken on network)",
} as const;

export function CoverageStrip() {
  return (
    <aside
      style={{
        marginTop: 28,
        padding: "16px 18px",
        border: "1px solid var(--line)",
        borderRadius: 4,
        background: "rgba(255,255,255,0.4)",
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

export function HonestyStrip() {
  return (
    <aside
      style={{
        marginTop: 28,
        padding: "14px 16px",
        border: "1px solid var(--line)",
        borderRadius: 4,
        background: "rgba(255,255,255,0.35)",
        maxWidth: 640,
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
        }}
      >
        {HONESTY_BOUNDS.title}
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>
        {HONESTY_BOUNDS.doesNot}
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.45 }}>
        Verified paths: {HONESTY_BOUNDS.paths}
      </p>
    </aside>
  );
}

export const fieldStyle: CSSProperties = {
  width: "100%",
  maxWidth: 560,
  padding: "12px 14px",
  border: "1px solid var(--line)",
  borderRadius: 2,
  background: "rgba(255,255,255,0.55)",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  color: "var(--ink)",
  outline: "none",
};

export const btnPrimary: CSSProperties = {
  padding: "11px 18px",
  border: "none",
  borderRadius: 2,
  background: "var(--ink)",
  color: "var(--paper)",
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

export const btnGhost: CSSProperties = {
  padding: "11px 18px",
  border: "1px solid var(--ink)",
  borderRadius: 2,
  background: "transparent",
  color: "var(--ink)",
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};
