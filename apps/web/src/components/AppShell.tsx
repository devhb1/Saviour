"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { clientWritesAllowed } from "../lib/writeGuard";
import { fetchJson } from "../lib/fetchJson";
import { BrandLockup, BrandMark } from "./BrandMark";
import { CommandBar } from "./CommandBar";
import { ThemeToggle } from "./ThemeToggle";
import { Sheet } from "../ui";
import { KillSwitchProof } from "./KillSwitchProof";
import { HeroCastPill } from "./HeroCastPill";
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

const MEMORY_KEY = "saviours.sessionChecks";

/** Session-scoped meter — never a fabricated global. */
export function useMemoryHitCount() {
  const [count, setCount] = useState(0);
  const [paid, setPaid] = useState(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MEMORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { free?: number; paid?: number };
        setCount(Number(parsed.free) || 0);
        setPaid(Number(parsed.paid) || 0);
      }
    } catch {
      setCount(0);
      setPaid(0);
    }
  }, []);
  const persist = useCallback((free: number, paidNext: number) => {
    try {
      localStorage.setItem(
        MEMORY_KEY,
        JSON.stringify({ free, paid: paidNext }),
      );
    } catch {
      // ignore
    }
  }, []);
  const bump = useCallback(
    (kind: "free" | "paid" = "free") => {
      if (kind === "paid") {
        setPaid((p) => {
          const next = p + 1;
          setCount((c) => {
            persist(c, next);
            return c;
          });
          return next;
        });
        return;
      }
      setCount((c) => {
        const next = c + 1;
        setPaid((p) => {
          persist(next, p);
          return p;
        });
        return next;
      });
    },
    [persist],
  );
  return { count, paid, bump };
}

export type RegistryHeadline = {
  memories: number;
  named: number;
  graphVerified: number;
  loading: boolean;
  /** True when the fetch timed out or failed — never leave “Loading…” forever. */
  failed: boolean;
};

export function useRegistryHeadline(): RegistryHeadline {
  const [state, setState] = useState<RegistryHeadline>({
    memories: 0,
    named: 0,
    graphVerified: 0,
    loading: true,
    failed: false,
  });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const json = await fetchJson<{
          count?: number;
          named?: number;
          incidents?: Array<{ proof?: string }>;
          }>("/api/incidents", { timeoutMs: 45_000 });
        if (cancelled) return;
        const graphVerified = (json.incidents ?? []).filter(
          (i) => i.proof === "graph",
        ).length;
        setState({
          memories: typeof json.count === "number" ? json.count : 0,
          named: typeof json.named === "number" ? json.named : 0,
          graphVerified,
          loading: false,
          failed: false,
        });
      } catch {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            failed: true,
          }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export function AppShell({
  screen,
  onScreen,
  memoryHits,
  sessionPaid = 0,
  onMemoryHit,
  killSwitchAddress,
  children,
}: {
  screen: ScreenId;
  onScreen: (s: ScreenId) => void;
  memoryHits: number;
  sessionPaid?: number;
  onMemoryHit?: () => void;
  /** Address used when opening the kill-switch sheet from the badge. */
  killSwitchAddress?: string;
  children: ReactNode;
}) {
  const writesOpen = clientWritesAllowed();
  const [killOpen, setKillOpen] = useState(false);
  const registry = useRegistryHeadline();
  const activeDest = destinationFor(screen);
  const castAddress =
    killSwitchAddress?.trim() || DEMO_TARGETS[0].address;
  const sessionTotal = memoryHits + sessionPaid;
  const hideFooter =
    activeDest === "loop" ||
    activeDest === "home" ||
    activeDest === "registry";

  useEffect(() => {
    const onOpen = () => setKillOpen(true);
    window.addEventListener("saviours:open-kill-switch", onOpen);
    return () => window.removeEventListener("saviours:open-kill-switch", onOpen);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: hideFooter ? "8px 16px 16px" : "10px 16px 36px",
      }}
      className="app-shell"
    >
      <header
        className="app-chrome app-content-wide"
        style={{
          margin: "0 auto 10px",
          padding: "0 2px",
          display: "flex",
          flexWrap: "nowrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          borderBottom: "1px solid color-mix(in srgb, var(--line) 80%, transparent)",
          paddingBottom: 0,
          overflowX: "auto",
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
                    padding: "10px 11px",
                    border: "none",
                    borderBottom: "2px solid transparent",
                    background: "transparent",
                    color: active ? "var(--tx-hi)" : "var(--tx-lo)",
                    fontFamily: "var(--font-body)",
                    fontWeight: active ? 600 : 500,
                    fontSize: 13,
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
            gap: 8,
            paddingBottom: 8,
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
            title={
              registry.loading
                ? "Loading live registry counts from /api/incidents…"
                : registry.failed
                  ? "Registry counts timed out or failed — refresh; never stuck on Loading."
                  : `Verifiable from GET /api/incidents. Memories = rows in index. Named = ENS status WATCH|TAINTED. Graph-verified = proof:graph only — never laundered. Sepolia = ENSv2 memory chain.`
            }
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--t-floor)",
              color: "var(--ink-muted)",
              whiteSpace: "nowrap",
              cursor: "help",
            }}
          >
            {registry.loading
              ? "·· named · · Graph"
              : registry.failed
                ? "— named · — Graph"
                : `${registry.named} named · ${registry.graphVerified} Graph`}
            {!registry.loading && !registry.failed ? " · Sepolia" : ""}
          </span>
          {sessionTotal > 0 ? (
            <span
              title="This browser session only — free = shield memory hits; paid = investigate settles you triggered."
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--t-floor)",
                color: "var(--ink-muted)",
                whiteSpace: "nowrap",
                cursor: "help",
              }}
            >
              session · {sessionTotal} · {memoryHits} free
              {sessionPaid > 0 ? ` · $${(sessionPaid * 0.01).toFixed(2)}` : ""}
            </span>
          ) : null}

          <span
            title="ENS text records are the API"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--t-floor)",
              color: "var(--ink-muted)",
              whiteSpace: "nowrap",
            }}
          >
            ENS = API
          </span>
          <HeroCastPill address={castAddress} compact />

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

      {!hideFooter ? (
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
            <span style={{ color: "var(--ink)" }}>saviours</span>
          </span>
          <span>
            Shield checks are free forever. A fresh investigation costs $0.01,
            metered by Bazantic. Press ⌘K from any screen.
          </span>
          <span>
            Evidence · mainnet Graph · Memory · Sepolia ENSv2 ·{" "}
            <a
              href="/gateway"
              style={{ color: "var(--signal)", textDecoration: "none" }}
            >
              Gateway guide
            </a>
            {" · "}
            <a
              href="/gateway"
              style={{ color: "inherit", textDecoration: "underline" }}
            >
              MCP via /gateway
            </a>
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
      ) : null}

      <Sheet
        open={killOpen}
        onClose={() => setKillOpen(false)}
        eyebrow="KILL SWITCH · CAST"
        title="CAST WORKS IF WE DIE"
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
