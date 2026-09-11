"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AppShell,
  DEMO_TARGETS,
  useMemoryHitCount,
  type ScreenId,
} from "./AppShell";
import { HomeScreen } from "./HomeScreen";
import { InvestigateScreen } from "./InvestigateScreen";
import { ResolveScreen } from "./ResolveScreen";
import { GovernScreen } from "./GovernScreen";
import { DevelopersScreen } from "./DevelopersScreen";
import { AgentsScreen } from "./AgentsScreen";
import { IdentityScreen } from "./IdentityScreen";
import { DocsScreen } from "./DocsScreen";
import { btnGhost } from "./AppShell";
import { ThemeProvider } from "./ThemeProvider";

/**
 * Canonical hash per step (left column) plus every alias we have ever shipped,
 * so old links and old film cues keep working.
 */
const CANONICAL_HASH: Record<ScreenId, string> = {
  home: "threat",
  agents: "investigate",
  identity: "name",
  shield: "resolve",
  registry: "memory",
  developers: "build",
  docs: "docs",
  case: "case",
  legacy: "legacy",
};

const HASH_ALIASES: Record<string, ScreenId> = {
  "": "home",
  threat: "home",
  home: "home",
  start: "home",

  investigate: "agents",
  live: "agents",
  agents: "agents",

  name: "identity",
  identity: "identity",
  ens: "identity",

  resolve: "shield",
  shield: "shield",

  memory: "registry",
  registry: "registry",
  govern: "registry",

  build: "developers",
  developers: "developers",
  devs: "developers",

  docs: "docs",
  doc: "docs",

  case: "case",
  dossier: "case",

  legacy: "legacy",
};

function screenFromHash(): ScreenId {
  if (typeof window === "undefined") return "home";
  const h = window.location.hash.replace(/^#/, "").toLowerCase();
  return HASH_ALIASES[h] ?? "home";
}

export function SavioursApp() {
  // Default Home — danger-first (ENDGAME film order).
  const [screen, setScreen] = useState<ScreenId>("home");
  const [mounted, setMounted] = useState(false);
  const [legacyTab, setLegacyTab] = useState<"investigate" | "resolve" | "govern">(
    "investigate",
  );
  const [address, setAddress] = useState<string>(DEMO_TARGETS[0].address);
  const { count, bump } = useMemoryHitCount();

  useEffect(() => {
    setScreen(screenFromHash());
    setMounted(true);
    const onHash = () => setScreen(screenFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onSet = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail) setAddress(detail);
    };
    window.addEventListener("saviours:set-address", onSet);
    return () => window.removeEventListener("saviours:set-address", onSet);
  }, []);

  const go = useCallback((s: ScreenId) => {
    setScreen(s);
    window.location.hash = CANONICAL_HASH[s] ?? s;
  }, []);

  // Until mount, force home so server HTML === client hydration tree.
  const view: ScreenId = mounted ? screen : "home";

  return (
    <ThemeProvider>
      <AppShell
        screen={view}
        onScreen={go}
        memoryHits={count}
        onMemoryHit={bump}
      >
        {view === "home" ? (
          <HomeScreen
            address={address}
            onAddress={setAddress}
            memoryHits={count}
            onOpenCase={(a) => {
              if (a) setAddress(a);
              go("case");
            }}
            onOpenShield={(a) => {
              if (a) setAddress(a);
              go("shield");
            }}
            onOpenRegistry={() => go("registry")}
            onOpenSurface={() => go("developers")}
            onOpenAgents={() => go("agents")}
          />
        ) : null}

        {view === "agents" ? (
          <AgentsScreen
            address={address}
            onAddress={setAddress}
            onMemoryHit={bump}
            onOpenCase={(a) => {
              if (a) setAddress(a);
              go("case");
            }}
            onOpenIdentity={(a) => {
              if (a) setAddress(a);
              go("identity");
            }}
            onOpenShield={(a) => {
              if (a) setAddress(a);
              go("shield");
            }}
          />
        ) : null}

        {view === "case" ? (
          <InvestigateScreen
            address={address}
            onAddress={setAddress}
            onMemoryHit={bump}
          />
        ) : null}

        {view === "shield" ? (
          <ResolveScreen
            address={address}
            onAddress={setAddress}
            onMemoryHit={bump}
            onOpenCase={(a) => {
              setAddress(a);
              go("case");
            }}
            onOpenIdentity={(a) => {
              if (a) setAddress(a);
              go("identity");
            }}
            onOpenMemory={() => go("registry")}
          />
        ) : null}

        {view === "identity" ? (
          <IdentityScreen
            address={address}
            onAddress={setAddress}
            onOpenCase={(a) => {
              setAddress(a);
              go("case");
            }}
            /* Walkthrough order: 03 Name → 04 Resolve. */
            onOpenMemory={() => go("shield")}
          />
        ) : null}

        {view === "registry" ? (
          <>
            <div
              style={{
                marginBottom: 18,
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    color: "var(--ink-muted)",
                  }}
                >
                  REGISTRY · MEMORY · PUBLIC LEDGER
                </p>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(24px, 3vw, 32px)",
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                    maxWidth: 560,
                    lineHeight: 1.15,
                  }}
                >
                  Only WATCH / TAINTED are named.
                </p>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 13,
                    color: "var(--ink-muted)",
                    maxWidth: 560,
                    lineHeight: 1.45,
                  }}
                >
                  Graph-verified ≠ Live Remember ≠ Seeded post-mortem. Case depth
                  via row click. SAFE never appears. Use ⌘K for a Shield check.
                </p>
              </div>
            </div>
            <GovernScreen
              onSelectAddress={(a) => {
                setAddress(a);
                go("identity");
              }}
              onOpenBuild={() => go("developers")}
              onOpenLive={() => go("agents")}
              onOpenDocs={() => go("docs")}
            />
          </>
        ) : null}

        {view === "docs" ? (
          <DocsScreen
            onOpenLive={() => go("agents")}
            onOpenBuild={() => go("developers")}
            onOpenRegistry={() => go("registry")}
          />
        ) : null}

        {view === "developers" ? <DevelopersScreen /> : null}

        {view === "legacy" ? (
          <section className="rise">
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 13,
                color: "var(--warn)",
                lineHeight: 1.45,
              }}
            >
              Legacy verb tabs — prefer Home · Live · Shield · Identity · Memory · Build · ⌘K.
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {(
                [
                  ["investigate", "Investigate"],
                  ["resolve", "Resolve"],
                  ["govern", "Govern"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLegacyTab(id)}
                  style={{
                    ...btnGhost,
                    padding: "8px 12px",
                    fontSize: 13,
                    borderColor:
                      legacyTab === id ? "var(--signal)" : "var(--line)",
                  }}
                >
                  {label}
                </button>
              ))}
              <button type="button" onClick={() => go("agents")} style={btnGhost}>
                ← Live
              </button>
            </div>
            {legacyTab === "investigate" ? (
              <InvestigateScreen
                address={address}
                onAddress={setAddress}
                onMemoryHit={bump}
              />
            ) : null}
            {legacyTab === "resolve" ? (
              <ResolveScreen
                address={address}
                onAddress={setAddress}
                onMemoryHit={bump}
              />
            ) : null}
            {legacyTab === "govern" ? (
              <GovernScreen onSelectAddress={setAddress} />
            ) : null}
          </section>
        ) : null}
      </AppShell>
    </ThemeProvider>
  );
}
