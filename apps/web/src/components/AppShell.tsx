"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { clientWritesAllowed } from "../lib/writeGuard";
import { BrandLockup, BrandMark } from "./BrandMark";
import { CommandBar } from "./CommandBar";
import { ThemeToggle } from "./ThemeToggle";
import { Sheet } from "../ui";
import { KillSwitchProof } from "./KillSwitchProof";
import { DEMO_TARGETS } from "./demoTargets";

/**
 * ENDGAME Phase 1 routes.
 * Legacy screens remain deep-linkable (agents/identity/shield/case/legacy).
 */
export type ScreenId =
  | "home"
  | "loop"
  | "registry"
  | "build"
  | "playground"
  | "docs"
  /* legacy / deep-link */
  | "agents"
  | "case"
  | "identity"
  | "shield"
  | "developers"
  | "legacy";

/** Primary destinations — not numbered chapters. */
const DESTINATIONS: { id: ScreenId; label: string; hint: string }[] = [
  { id: "home", label: "Hook", hint: "what this is · live check" },
  { id: "loop", label: "Loop", hint: "miss → investigate → name → resolve" },
  { id: "registry", label: "Registry", hint: "public security memory" },
  { id: "build", label: "Build", hint: "agent · wallet · raw" },
  { id: "playground", label: "Playground", hint: "power tools" },
  { id: "docs", label: "Docs", hint: "the long read" },
];

/** Map legacy/deep screens onto a primary destination for active state. */
function destinationFor(screen: ScreenId): ScreenId {
  if (screen === "agents" || screen === "case") return "loop";
  if (screen === "identity" || screen === "shield") return "loop";
  if (screen === "developers") return "build";
  if (screen === "legacy") return "playground";
  return screen;
}

const MEMORY_KEY = "saviours.memoryHitCount";

/** Honest counter: avoided = hits × published costs (ENDGAME §20). */
export function useMemoryHitCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    try {
      setCount(Number(localStorage.getItem(MEMORY_KEY) || "0") || 0);
    } catch {
      setCount(0);
    }
  }, []);
  const bump = useCallback(() => {
    setCount((c) => {
      const next = c + 1;
      try {
        localStorage.setItem(MEMORY_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);
  return { count, bump };
}

function avoidedFromHits(hits: number) {
  return {
    hits,
    graph: hits * 8,
    ai: hits * 1,
    usd: hits * 0.01,
  };
}

export function AppShell({
  screen,
  onScreen,
  memoryHits,
  onMemoryHit,
  killSwitchAddress,
  children,
}: {
  screen: ScreenId;
  onScreen: (s: ScreenId) => void;
  memoryHits: number;
  onMemoryHit?: () => void;
  /** Address used when opening the kill-switch sheet from the badge. */
  killSwitchAddress?: string;
  children: ReactNode;
}) {
  const writesOpen = clientWritesAllowed();
  const [killOpen, setKillOpen] = useState(false);
  const avoided = avoidedFromHits(memoryHits);
  const activeDest = destinationFor(screen);
  const castAddress =
    killSwitchAddress?.trim() || DEMO_TARGETS[0].address;

  useEffect(() => {
    const onOpen = () => setKillOpen(true);
    window.addEventListener("saviours:open-kill-switch", onOpen);
    return () => window.removeEventListener("saviours:open-kill-switch", onOpen);
  }, []);

  return (
    <div
      style={{ minHeight: "100vh", padding: "18px 18px 48px" }}
      className="app-shell"
    >
      <header
        className="app-chrome app-content-wide"
        style={{
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
            {DESTINATIONS.map((s) => {
              const active = s.id === activeDest;
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
            title={`Avoided = memory hits × published costs. Graph avoided = hits × 8 deployments. AI avoided = hits × 1. USD avoided = hits × $0.01. Local to this browser until Redis (V2).`}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--t-floor)",
              color: "var(--ink-muted)",
              whiteSpace: "nowrap",
              cursor: "help",
            }}
          >
            ⚡ {avoided.hits.toLocaleString()} hits ·{" "}
            {avoided.graph.toLocaleString()} Graph avoided · $
            {avoided.usd.toFixed(2)}
          </span>

          <button
            type="button"
            onClick={() => setKillOpen(true)}
            title="Read saviours.status via public Sepolia RPC — no Saviours server"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: "var(--radius-chip, 4px)",
              border: "1px solid color-mix(in srgb, var(--safe) 45%, var(--line))",
              background: "color-mix(in srgb, var(--safe) 8%, var(--surface))",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--t-floor)",
              letterSpacing: "0.04em",
              color: "var(--safe)",
              whiteSpace: "nowrap",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ✓ Works without us
          </button>

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
              fontSize: "var(--t-floor)",
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

      <div className="app-content-wide" style={{ margin: "0 auto" }}>
        {children}
      </div>

      <footer
        className="app-content-wide"
        style={{
          margin: "48px auto 0",
          paddingTop: 20,
          borderTop: "1px solid color-mix(in srgb, var(--line) 70%, transparent)",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--t-floor)",
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

      <Sheet
        open={killOpen}
        onClose={() => setKillOpen(false)}
        eyebrow="KILL SWITCH"
        title="Works without us"
        width={480}
      >
        <p
          style={{
            margin: "0 0 16px",
            fontSize: "var(--t-sm)",
            lineHeight: 1.5,
            color: "var(--tx-lo)",
          }}
        >
          Read <code style={{ color: "var(--sig)" }}>saviours.status</code> from
          a public Sepolia RPC. No Saviours API. If we disappear tonight, named
          verdicts still resolve.
        </p>
        <KillSwitchProof address={castAddress} />
      </Sheet>
    </div>
  );
}

/* Re-export demo constants so existing imports from AppShell keep working. */
export {
  DEMO_TARGETS,
  HOME_CHIPS,
  HONESTY_BOUNDS,
} from "./demoTargets";
export { CoverageStrip } from "./CoverageStrip";

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
