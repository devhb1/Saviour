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

const HASH_SCREENS: ScreenId[] = [
  "home",
  "agents",
  "case",
  "identity",
  "registry",
  "shield",
  "docs",
  "developers",
  "legacy",
];

function screenFromHash(): ScreenId {
  if (typeof window === "undefined") return "agents";
  const h = window.location.hash.replace(/^#/, "").toLowerCase();
  if (HASH_SCREENS.includes(h as ScreenId)) return h as ScreenId;
  if (h === "live" || h === "") return "agents";
  if (h === "memory") return "registry";
  if (h === "build" || h === "devs") return "developers";
  if (h === "ens") return "identity";
  if (h === "investigate") return "case";
  if (h === "resolve") return "shield";
  if (h === "govern") return "registry";
  if (h === "doc" || h === "docs") return "docs";
  return "agents";
}

export function SavioursApp() {
  // Default Live (agents). Home remains deep-linkable at #home.
  const [screen, setScreen] = useState<ScreenId>("agents");
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
    window.location.hash = s === "agents" ? "live" : s;
  }, []);

  // Until mount, force agents so server HTML === client hydration tree.
  const view: ScreenId = mounted ? screen : "agents";

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
            onOpenMemory={() => go("registry")}
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
                  REGISTRY · PUBLIC LEDGER
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
                go("case");
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
              Legacy verb tabs — prefer Live · Registry · Docs · Build · ⌘K.
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
