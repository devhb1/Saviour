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
import { btnGhost } from "./AppShell";
import { ThemeProvider } from "./ThemeProvider";

const HASH_SCREENS: ScreenId[] = [
  "home",
  "agents",
  "case",
  "registry",
  "shield",
  "developers",
  "legacy",
];

function screenFromHash(): ScreenId {
  if (typeof window === "undefined") return "home";
  const h = window.location.hash.replace(/^#/, "").toLowerCase();
  if (HASH_SCREENS.includes(h as ScreenId)) return h as ScreenId;
  // Old bookmarks
  if (h === "investigate") return "case";
  if (h === "resolve") return "shield";
  if (h === "govern") return "registry";
  return "home";
}

export function SavioursApp() {
  // SSR + first client paint must match. Never read window.hash in useState.
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

  const go = useCallback((s: ScreenId) => {
    setScreen(s);
    window.location.hash = s;
  }, []);

  // Until mount, force home so server HTML === client hydration tree.
  const view: ScreenId = mounted ? screen : "home";

  return (
    <ThemeProvider>
    <AppShell screen={view} onScreen={go} memoryHits={count}>
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
        <>
          <p
            style={{
              margin: "0 0 14px",
              fontSize: 13,
              color: "var(--ink-muted)",
              maxWidth: 560,
              lineHeight: 1.45,
            }}
          >
            Memory check — known threat names resolve with{" "}
            <strong style={{ color: "var(--ink)" }}>0 Graph · 0 AI</strong>. This
            is the Shield moment: decision before a sign.
          </p>
          <ResolveScreen
            address={address}
            onAddress={setAddress}
            onMemoryHit={bump}
            onOpenCase={(a) => {
              setAddress(a);
              go("case");
            }}
          />
        </>
      ) : null}

      {view === "registry" ? (
        <>
          <p
            style={{
              margin: "0 0 14px",
              fontSize: 13,
              color: "var(--ink-muted)",
              maxWidth: 640,
              lineHeight: 1.45,
            }}
          >
            Public record of named cases. Provenance badges are mandatory —
            Graph-verified ≠ Live Remember ≠ Seeded post-mortem. Dispute / revoke
            live here (trust panel).
          </p>
          <GovernScreen
            onSelectAddress={(a) => {
              setAddress(a);
              go("case");
            }}
          />
        </>
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
            Legacy verb tabs (Investigate / Resolve / Govern) — kept until film.
            Prefer Case · Shield · Registry.
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
              ← Home
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
