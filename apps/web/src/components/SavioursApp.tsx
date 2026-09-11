"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AppShell,
  DEMO_TARGETS,
  useMemoryHitCount,
  type ScreenId,
} from "./AppShell";
import { HookScreen } from "./HookScreen";
import { LoopScreen } from "./LoopScreen";
import { PlaygroundScreen } from "./PlaygroundScreen";
import { InvestigateScreen } from "./InvestigateScreen";
import { ResolveScreen } from "./ResolveScreen";
import { GovernScreen } from "./GovernScreen";
import { BuildScreen } from "./BuildScreen";
import { AgentsScreen } from "./AgentsScreen";
import { IdentityScreen } from "./IdentityScreen";
import { DocsScreen } from "./DocsScreen";
import { btnGhost } from "./AppShell";
import { ThemeProvider } from "./ThemeProvider";

/**
 * Canonical hash per destination + every alias we have ever shipped,
 * so old links and old film cues keep working.
 */
const CANONICAL_HASH: Record<ScreenId, string> = {
  home: "hook",
  loop: "loop",
  registry: "registry",
  build: "build",
  playground: "playground",
  docs: "docs",
  /* legacy */
  agents: "investigate",
  identity: "name",
  shield: "resolve",
  case: "case",
  developers: "build",
  legacy: "legacy",
};

const HASH_ALIASES: Record<string, ScreenId> = {
  "": "home",
  hook: "home",
  threat: "home",
  home: "home",
  start: "home",

  loop: "loop",

  registry: "registry",
  memory: "registry",
  govern: "registry",

  build: "build",
  developers: "build",
  devs: "build",

  playground: "playground",

  docs: "docs",
  doc: "docs",

  /* legacy deep links still work */
  investigate: "agents",
  live: "agents",
  agents: "agents",

  name: "identity",
  identity: "identity",
  ens: "identity",

  resolve: "shield",
  shield: "shield",

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

  const view: ScreenId = mounted ? screen : "home";

  return (
    <ThemeProvider>
      <AppShell
        screen={view}
        onScreen={go}
        memoryHits={count}
        onMemoryHit={bump}
        killSwitchAddress={address}
      >
        {view === "home" ? (
          <HookScreen
            address={address}
            onAddress={setAddress}
            onMemoryHit={bump}
            onOpenLoop={() => go("loop")}
            onOpenBuild={() => go("build")}
            onOpenCast={() => {
              /* badge sheet is in AppShell; also allow hash deep-link later */
              window.dispatchEvent(
                new CustomEvent("saviours:open-kill-switch", {
                  detail: address,
                }),
              );
            }}
          />
        ) : null}

        {view === "loop" ? (
          <LoopScreen
            address={address}
            onAddress={setAddress}
            onMemoryHit={bump}
            onOpenPlayground={() => go("playground")}
            onOpenBuild={() => go("build")}
          />
        ) : null}

        {view === "playground" ? (
          <PlaygroundScreen
            address={address}
            onAddress={setAddress}
            onMemoryHit={bump}
            onOpenIdentity={(a) => {
              setAddress(a);
              go("identity");
            }}
            onOpenRegistry={() => go("registry")}
          />
        ) : null}

        {view === "build" || view === "developers" ? (
          <BuildScreen />
        ) : null}

        {view === "docs" ? (
          <DocsScreen
            onOpenLive={() => go("loop")}
            onOpenBuild={() => go("build")}
            onOpenRegistry={() => go("registry")}
          />
        ) : null}

        {view === "registry" ? (
          <>
            <div
              className="app-content"
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
                    fontSize: "var(--t-floor)",
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
                    fontSize: "var(--t-h2)",
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
                    fontSize: "var(--t-sm)",
                    color: "var(--ink-muted)",
                    maxWidth: 560,
                    lineHeight: 1.45,
                  }}
                >
                  Graph-verified ≠ Live Remember ≠ Seeded post-mortem. SAFE never
                  appears. Full proof filters land in Phase 3.
                </p>
              </div>
            </div>
            <GovernScreen
              onSelectAddress={(a) => {
                setAddress(a);
                go("identity");
              }}
              onOpenBuild={() => go("build")}
              onOpenLive={() => go("loop")}
              onOpenDocs={() => go("docs")}
            />
          </>
        ) : null}

        {/* Legacy deep-link screens — still reachable via old hashes */}
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
            onOpenMemory={() => go("shield")}
          />
        ) : null}

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
              Legacy verb tabs — prefer Hook · Loop · Registry · Build · Playground.
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
              <button type="button" onClick={() => go("home")} style={btnGhost}>
                ← Hook
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
