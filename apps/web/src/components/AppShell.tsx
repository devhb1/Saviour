"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

export type ScreenId = "investigate" | "resolve" | "govern";

const SCREENS: { id: ScreenId; label: string; hint: string }[] = [
  { id: "investigate", label: "Investigate", hint: "detect · name" },
  { id: "resolve", label: "Resolve", hint: "0 Graph · 0 AI" },
  { id: "govern", label: "Govern", hint: "dispute · revoke" },
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
  return (
    <div style={{ minHeight: "100vh", padding: "28px 20px 64px" }}>
      <header
        style={{
          maxWidth: 1080,
          margin: "0 auto 28px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "end",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(36px, 6vw, 56px)",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 0.95,
            }}
          >
            SAVIOURS
          </p>
          <p
            style={{
              margin: "8px 0 0",
              color: "var(--ink-muted)",
              fontSize: 15,
              maxWidth: 420,
            }}
          >
            Investigate once. Remember forever. Block instantly next time.
          </p>
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--ink-muted)",
            textAlign: "right",
          }}
        >
          MEMORY HITs · {memoryHits}
          <div style={{ marginTop: 4 }}>mainnet Graph · Sepolia ENS</div>
        </div>
      </header>

      <nav
        style={{
          maxWidth: 1080,
          margin: "0 auto 24px",
          display: "flex",
          gap: 8,
          borderBottom: "1px solid var(--line)",
          paddingBottom: 0,
        }}
      >
        {SCREENS.map((s) => {
          const active = s.id === screen;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onScreen(s.id)}
              style={{
                padding: "10px 16px",
                border: "none",
                borderBottom: active
                  ? "2px solid var(--signal)"
                  : "2px solid transparent",
                background: "transparent",
                color: active ? "var(--ink)" : "var(--ink-muted)",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                marginBottom: -1,
                textAlign: "left",
              }}
            >
              <span style={{ display: "block" }}>{s.label}</span>
              <span
                style={{
                  display: "block",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 400,
                  color: "var(--ink-muted)",
                  marginTop: 2,
                }}
              >
                {s.hint}
              </span>
            </button>
          );
        })}
      </nav>

      <div style={{ maxWidth: 1080, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

export const DEMO_TARGETS = [
  {
    id: "ATTACK-1",
    address: "0x935bfb495e33f74d2e9735df1da66ace442ede48",
    label: "MakinaFi",
  },
  {
    id: "ATTACK-2",
    address: "0x1f23eb80f0c16758e4a55d48097c343bd20be56f",
    label: "HopeLend",
  },
  {
    id: "BOT-1",
    address: "0x352423e2fa5d5c99343d371c9e3bc56c87723cc7",
    label: "Bot",
  },
  {
    id: "BENIGN-1",
    address: "0x55fe002aeff02f77364de339a1292923a15844b8",
    label: "Circle",
  },
  {
    id: "HOP-1",
    address: "0xa6c248384c5ddd934b83d0926d2e2a1ddf008387",
    label: "Hop",
  },
] as const;

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
      <strong style={{ color: "var(--ink)", fontSize: 13 }}>Coverage · honest bounds</strong>
      <br />
      DETECTS: flashloan-driven atomic attacks · drain fan-in/out · known-tainted
      counterparty propagation
      <br />
      DOES NOT: offchain coordination · novel contract-logic exploits · social
      engineering · assets outside the 8 indexed protocols
      (Balancer/Pancake/Convex currently broken on network)
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
