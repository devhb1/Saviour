"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  btnGhost,
  btnPrimary,
  fieldStyle,
  DEMO_TARGETS,
} from "./AppShell";
import { FleetRun } from "./FleetRun";
import { KillSwitchProof } from "./KillSwitchProof";
import { AskPanel, type AskPacketClient } from "./AskPanel";
import { BazanticPayPanel } from "./BazanticPayPanel";
import { SessionMeter } from "./SessionMeter";
import { AgentWorklist } from "./AgentWorklist";
import { WalletGatePanel } from "./WalletGatePanel";
import { ErrorBanner } from "./ErrorBanner";
import { EnsPointsPanel } from "./EnsPointsPanel";
import { SafeSwapRecipePanel } from "./SafeSwapRecipePanel";
import { GraphEvidenceStage } from "./GraphEvidenceStage";
import {
  BazanticRecipesList,
  BazanticTiersTable,
} from "./BazanticCatalog";
import {
  BAZANTIC_GATEWAY_DEFAULT,
  BAZANTIC_PUBLISH_KIT,
  MCP_TOOL_COUNT,
} from "../lib/bazanticGateway";
import { fetchJson } from "../lib/fetchJson";
import { clientWritesAllowed, writeHeaders } from "../lib/writeGuard";

/** ENSv2 + govern tools — wallet gate is its own track. */
type EnsTabId =
  | "cast"
  | "ens"
  | "eac"
  | "dispute"
  | "clone"
  | "worklist";

/** Wallet gate — pre-sign before MetaMask. */
type WalletSubId = "live" | "how" | "sdk";

/** Published Bazantic recipes + live meter. */
type BazanticSubId =
  | "catalog"
  | "meter"
  | "investigate"
  | "safe-swap"
  | "fleet"
  | "dossier"
  | "check";

type TrackId = "bazantic" | "wallet" | "graph" | "ens";

const ENS_TABS: { id: EnsTabId; label: string }[] = [
  { id: "cast", label: "Kill switch · cast" },
  { id: "ens", label: "ENSv2 · live API" },
  { id: "eac", label: "EAC / roles" },
  { id: "dispute", label: "Dispute / revoke" },
  { id: "clone", label: "Clone defense" },
  { id: "worklist", label: "Worklist" },
];

const WALLET_SUBS: { id: WalletSubId; label: string }[] = [
  { id: "live", label: "Live film · lanes" },
  { id: "how", label: "How it works" },
  { id: "sdk", label: "Drop-in SDK" },
];

const BAZANTIC_SUBS: {
  id: BazanticSubId;
  label: string;
  handle?: string;
}[] = [
  { id: "catalog", label: "5 published" },
  { id: "meter", label: "Live meter · 402 → pay" },
  {
    id: "investigate",
    label: "investigate-once-explain",
    handle: "investigate-once-explain",
  },
  {
    id: "safe-swap",
    label: "safe-swap-with-memory",
    handle: "safe-swap-with-memory",
  },
  { id: "fleet", label: "fleet-triage", handle: "fleet-triage" },
  {
    id: "dossier",
    label: "dossier-deep-dive",
    handle: "dossier-deep-dive",
  },
  {
    id: "check",
    label: "check-before-sign",
    handle: "saviours-check-before-sign",
  },
];

function trackBtn(
  on: boolean,
  primary: boolean,
): CSSProperties {
  if (primary && on) return { ...btnPrimary, padding: "9px 16px", fontSize: 13 };
  return {
    ...btnGhost,
    padding: "9px 16px",
    fontSize: 13,
    borderColor: on ? "var(--sig)" : "var(--line-mid)",
    color: on ? "var(--tx-hi)" : "var(--tx-lo)",
    fontWeight: on ? 600 : 500,
    background: on ? "var(--bg-raise)" : "var(--bg-inset)",
    boxShadow: on ? "var(--edge)" : undefined,
  };
}

/**
 * ENDGAME Phase 2 — Playground.
 * Where density lives happily so Hook + Loop stay quiet.
 * Bazantic recipes are a first-class track (not buried in a flat pill row).
 */
export function PlaygroundScreen({
  address,
  onAddress,
  onOpenIdentity,
  onOpenRegistry,
  onMemoryHit,
}: {
  address: string;
  onAddress: (a: string) => void;
  onOpenIdentity?: (a: string) => void;
  onOpenRegistry?: () => void;
  onMemoryHit?: () => void;
}) {
  const [track, setTrack] = useState<TrackId>("bazantic");
  const [ensTab, setEnsTab] = useState<EnsTabId>("cast");
  const [walletSub, setWalletSub] = useState<WalletSubId>("live");
  const [bazSub, setBazSub] = useState<BazanticSubId>("catalog");
  const [copied, setCopied] = useState<string | null>(null);
  const active = (address || DEMO_TARGETS[0].address).trim().toLowerCase();

  async function copySnippet(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      // ignore
    }
  }

  return (
    <section className="app-content rise">
      <header
        style={{
          marginBottom: track === "graph" ? 12 : 20,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: "var(--t-floor)",
            letterSpacing: "0.1em",
            color: "var(--sig)",
          }}
        >
          PLAYGROUND · POWER TOOLS
        </p>
        <h1
          style={{
            margin: track === "graph" ? "6px 0 0" : "10px 0 0",
            fontFamily: "var(--font-display)",
            fontSize:
              track === "graph" ? "clamp(22px, 3vw, 28px)" : "var(--t-display)",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "var(--tx-hi)",
          }}
        >
          Internals, on purpose.
        </h1>
        {track === "graph" ? (
          <p
            style={{
              margin: "6px 0 0",
              maxWidth: 560,
              fontSize: 13,
              lineHeight: 1.4,
              color: "var(--tx-lo)",
            }}
          >
            Live Messari fan-out → same-tx provenance. Paste an address and
            investigate.
          </p>
        ) : (
          <p
            style={{
              margin: "10px 0 0",
              maxWidth: 660,
              fontSize: "var(--t-sm)",
              lineHeight: 1.5,
              color: "var(--tx-lo)",
            }}
          >
            Partners{" "}
            <strong style={{ color: "var(--tx-hi)" }}>
              Bazantic · Graph · ENS
            </strong>
            {" — "}plus{" "}
            <strong style={{ color: "var(--tx-hi)" }}>Wallet gate</strong>: stop
            the signature before MetaMask opens. Hook and Loop stay one job each.
          </p>
        )}
      </header>

      {/* Primary tracks */}
      <div
        role="tablist"
        aria-label="Playground tracks"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={track === "bazantic"}
          onClick={() => setTrack("bazantic")}
          style={trackBtn(track === "bazantic", true)}
        >
          Bazantic recipes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={track === "wallet"}
          onClick={() => setTrack("wallet")}
          style={trackBtn(track === "wallet", true)}
        >
          Wallet gate
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={track === "graph"}
          onClick={() => setTrack("graph")}
          style={trackBtn(track === "graph", true)}
        >
          Graph · evidence
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={track === "ens"}
          onClick={() => setTrack("ens")}
          style={trackBtn(track === "ens", false)}
        >
          ENS · govern
        </button>
      </div>

      {track === "bazantic" ? (
        <div
          style={{
            marginBottom: 20,
            padding: "14px 14px 12px",
            border: "1px solid var(--sig-line)",
            borderRadius: "var(--r-md)",
            background:
              "color-mix(in srgb, var(--sig) 6%, var(--bg-raise))",
            boxShadow: "var(--edge), var(--lift)",
          }}
        >
          <p
            style={{
              margin: "0 0 10px",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--sig)",
            }}
          >
            Bazantic recipe subtrack · {MCP_TOOL_COUNT} MCP tools · gateway{" "}
            <a
              href={BAZANTIC_GATEWAY_DEFAULT}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--sig-hi)" }}
            >
              saviours.bazgateway.com
            </a>
          </p>
          <div
            role="tablist"
            aria-label="Bazantic recipe subtrack"
            style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
          >
            {BAZANTIC_SUBS.map((s) => {
              const on = s.id === bazSub;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setBazSub(s.id)}
                  style={{
                    ...btnGhost,
                    padding: "7px 12px",
                    fontSize: 12,
                    borderColor: on ? "var(--sig)" : "var(--line-mid)",
                    background: on ? "var(--bg-raise)" : "transparent",
                    color: on ? "var(--tx-hi)" : "var(--tx-lo)",
                    fontWeight: on ? 600 : 500,
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {track === "wallet" ? (
        <div
          style={{
            marginBottom: walletSub === "live" ? 10 : 20,
            padding: walletSub === "live" ? "10px 12px" : "14px 14px 12px",
            border: "1px solid var(--sig-line)",
            borderRadius: "var(--r-md)",
            background:
              "color-mix(in srgb, var(--sig) 8%, var(--bg-raise))",
            boxShadow: "var(--edge), var(--lift)",
          }}
        >
          {walletSub === "live" ? null : (
            <p
              style={{
                margin: "0 0 6px",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--sig)",
              }}
            >
              Wallet gate subtrack · pre-sign · $0 memory hit
            </p>
          )}
          {walletSub === "live" ? null : (
            <p
              style={{
                margin: "0 0 10px",
                fontSize: 13,
                color: "var(--tx-lo)",
                lineHeight: 1.4,
                maxWidth: 560,
              }}
            >
              Check the recipient{" "}
              <strong style={{ color: "var(--tx-hi)" }}>before</strong> MetaMask
              opens. Hit = free. Miss = Bazantic pay → then verdict — never the
              reverse.
            </p>
          )}
          <div
            role="tablist"
            aria-label="Wallet gate subtrack"
            style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
          >
            {WALLET_SUBS.map((s) => {
              const on = s.id === walletSub;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setWalletSub(s.id)}
                  style={{
                    ...btnGhost,
                    padding: "7px 12px",
                    fontSize: 12,
                    borderColor: on ? "var(--sig)" : "var(--line-mid)",
                    background: on ? "var(--bg-raise)" : "transparent",
                    color: on ? "var(--tx-hi)" : "var(--tx-lo)",
                    fontWeight: on ? 600 : 500,
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Graph track has no extra chrome — GraphEvidenceStage is the sell */}

      {track === "ens" ? (
        <div
          role="tablist"
          aria-label="ENS govern tools"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 20,
            paddingBottom: 12,
            borderBottom: "1px solid var(--line)",
          }}
        >
          {ENS_TABS.map((t) => {
            const on = t.id === ensTab;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setEnsTab(t.id)}
                style={{
                  ...btnGhost,
                  padding: "7px 12px",
                  fontSize: 12,
                  borderColor: on ? "var(--sig)" : "var(--line)",
                  color: on ? "var(--tx-hi)" : "var(--tx-lo)",
                  fontWeight: on ? 600 : 500,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div role="tabpanel">
        {track === "bazantic" && bazSub === "catalog" ? (
          <BazanticCatalogPanel />
        ) : null}
        {track === "bazantic" && bazSub === "meter" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <BazanticPayPanel
              demoAddress={active}
              evidenceAddress={DEMO_TARGETS[0].address}
              variant="full"
            />
            <SessionMeter />
          </div>
        ) : null}
        {track === "bazantic" && bazSub === "investigate" ? (
          <RecipeDemoShell
            handle="investigate-once-explain"
            pitch="Judges lead · Graph fan-out + Saviours memory. $0 on hit · ~$0.01 investigate · optional ~$0.05 Ask depth."
          >
            <AskTab address={active} />
          </RecipeDemoShell>
        ) : null}
        {track === "bazantic" && bazSub === "safe-swap" ? (
          <RecipeDemoShell
            handle="safe-swap-with-memory"
            pitch="Multi-service fixture · Uniswap-shaped quote + live Shield. Satisfies the Bazantic both-services recipe bullet."
          >
            <SafeSwapRecipePanel />
          </RecipeDemoShell>
        ) : null}
        {track === "bazantic" && bazSub === "fleet" ? (
          <RecipeDemoShell
            handle="fleet-triage"
            pitch="Batch shield across the worklist. Hits stay $0 · misses meter ~$0.01 each via Bazantic."
          >
            <FleetRun onSelect={onAddress} onOpenIdentity={onOpenIdentity} />
          </RecipeDemoShell>
        ) : null}
        {track === "bazantic" && bazSub === "dossier" ? (
          <RecipeDemoShell
            handle="dossier-deep-dive"
            pitch="$0 memory path · evidenceHash vs pinned dossier. Optional Ask depth still meters on Bazantic."
          >
            <FingerprintPanel address={active} />
          </RecipeDemoShell>
        ) : null}
        {track === "bazantic" && bazSub === "check" ? (
          <CheckBeforeSignPanel />
        ) : null}

        {track === "wallet" && walletSub === "live" ? (
          <WalletGatePanel onMemoryHit={onMemoryHit} dense />
        ) : null}
        {track === "wallet" && walletSub === "how" ? (
          <WalletHowPanel onOpenLive={() => setWalletSub("live")} />
        ) : null}
        {track === "wallet" && walletSub === "sdk" ? (
          <WalletSdkPanel
            copied={copied}
            onCopy={(id, text) => void copySnippet(id, text)}
          />
        ) : null}

        {track === "graph" ? (
          <GraphEvidenceStage address={active} onAddress={onAddress} />
        ) : null}

        {track === "ens" && ensTab === "ens" ? (
          <EnsPointsPanel address={active} />
        ) : null}
        {track === "ens" && ensTab === "eac" ? (
          <EacProbePanel address={active} />
        ) : null}
        {track === "ens" && ensTab === "dispute" ? (
          <DisputeRevokePanel address={active} onDone={onOpenRegistry} />
        ) : null}
        {track === "ens" && ensTab === "cast" ? (
          <KillSwitchProof address={active} />
        ) : null}
        {track === "ens" && ensTab === "clone" ? (
          <CloneDefensePanel address={active} onAddress={onAddress} />
        ) : null}
        {track === "ens" && ensTab === "worklist" ? (
          <AgentWorklist
            onSelect={onAddress}
            onOpenIdentity={onOpenIdentity}
          />
        ) : null}
      </div>
    </section>
  );
}

function BazanticCatalogPanel() {
  return (
    <div style={{ maxWidth: 760 }}>
      <div style={sellCard}>
        <p style={sellEyebrow}>Bazantic · published recipes</p>
        <p style={sellBody}>
          Five recipes are <strong style={{ color: "var(--tx-hi)" }}>live
          published</strong> on Bazantic. Memory hits settle{" "}
          <strong style={{ color: "var(--green)" }}>$0 forever</strong>. Misses
          meter on Base (~$0.01 investigate · ~$0.05 evidence/ask). Gateway{" "}
          <code>{BAZANTIC_GATEWAY_DEFAULT.replace("https://", "")}</code> ·{" "}
          {MCP_TOOL_COUNT} MCP tools · paste kit{" "}
          <code>{BAZANTIC_PUBLISH_KIT}</code>.
        </p>
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <a
            href="https://bazantic.com/dashboard/recipes"
            target="_blank"
            rel="noreferrer"
            style={{ ...btnPrimary, textDecoration: "none", fontSize: 13 }}
          >
            Open Bazantic dashboard ↗
          </a>
          <a
            href={`${BAZANTIC_GATEWAY_DEFAULT}/openapi-saviours.json`}
            target="_blank"
            rel="noreferrer"
            style={{
              ...btnGhost,
              textDecoration: "none",
              fontSize: 13,
              background: "var(--bg-raise)",
            }}
          >
            OpenAPI ↗
          </a>
        </div>
      </div>
      <BazanticTiersTable />
      <BazanticRecipesList />
      <p
        style={{
          margin: "14px 0 0",
          fontSize: 12,
          color: "var(--tx-lo)",
          lineHeight: 1.45,
        }}
      >
        Demo path for judges: <strong style={{ color: "var(--tx-hi)" }}>Live
        meter</strong> (402 → pay) →{" "}
        <code>investigate-once-explain</code> →{" "}
        <code>safe-swap-with-memory</code> (both-services).
      </p>
    </div>
  );
}

function RecipeDemoShell({
  handle,
  pitch,
  children,
}: {
  handle: string;
  pitch: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div style={sellCard}>
        <p style={sellEyebrow}>
          Recipe · <code style={{ color: "var(--sig-hi)" }}>{handle}</code>
        </p>
        <p style={sellBody}>{pitch}</p>
      </div>
      <div style={{ marginTop: 16 }}>{children}</div>
    </div>
  );
}

function CheckBeforeSignPanel() {
  return (
    <div style={{ maxWidth: 640 }}>
      <div style={sellCard}>
        <p style={sellEyebrow}>
          Recipe ·{" "}
          <code style={{ color: "var(--sig-hi)" }}>
            saviours-check-before-sign
          </code>
        </p>
        <p style={sellBody}>
          Core pre-sign gate.{" "}
          <code>@saviours/check</code> / Shield ·{" "}
          <strong style={{ color: "var(--green)" }}>$0 on MEMORY HIT</strong> ·
          miss escalates to investigate (~$0.01 via Bazantic). The live film and
          SDK live on the{" "}
          <strong style={{ color: "var(--tx-hi)" }}>Wallet gate</strong> track
          (primary Playground category).
        </p>
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <a
            href="/#build"
            style={{ ...btnPrimary, textDecoration: "none", fontSize: 13 }}
          >
            Build · Wallet SDK →
          </a>
          <a
            href="https://www.npmjs.com/package/@saviours/check"
            target="_blank"
            rel="noreferrer"
            style={{
              ...btnGhost,
              textDecoration: "none",
              fontSize: 13,
              background: "var(--bg-raise)",
            }}
          >
            npm @saviours/check ↗
          </a>
        </div>
      </div>
    </div>
  );
}

const WALLET_SDK = `# Fresh folder — not inside the Saviours monorepo
mkdir saviours-demo && cd saviours-demo
npm init -y && npm i @saviours/check

import { check, guard } from "@saviours/check";

const r = await check("0x935bfb495e33f74d2e9735df1da66ace442ede48");
// $0 ENS read · named → BLOCK | WARN
// { decision, status, ensName, … }

await guard(to); // throws on BLOCK — MetaMask never opens`;

const WALLET_WAGMI = `// Before sendTransaction / signTypedData
import { check } from "@saviours/check";

async function gatedSend(to: string, send: () => Promise<string>) {
  const r = await check(to);
  if (r.decision === "BLOCK" || r.decision === "WARN") {
    throw new Error(\`Saviours \${r.decision}: \${r.status}\`);
  }
  return send();
}`;

function WalletHowPanel({ onOpenLive }: { onOpenLive: () => void }) {
  const beats = [
    {
      k: "01 · Before MetaMask",
      b: "Shield runs on the recipient first. TAINTED never reaches the wallet prompt.",
    },
    {
      k: "02 · Two rails, never confused",
      b: "Sepolia ETH = the user’s send. Base USDC = Bazantic grant (agent account). Pay receipt before verdict.",
    },
    {
      k: "03 · $0 forever on hit",
      b: "Named WATCH/TAINTED resolves from ENS with ENS resolve · $0. Misses meter once; memory compounds.",
    },
  ] as const;
  return (
    <div style={{ maxWidth: 720 }}>
      <div style={sellCard}>
        <p style={sellEyebrow}>Wallet gate · how it works</p>
        <p
          style={{
            margin: "8px 0 0",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(20px, 2.4vw, 26px)",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "var(--tx-hi)",
            lineHeight: 1.15,
          }}
        >
          Stop the signature before MetaMask opens.
        </p>
        <p style={sellBody}>
          Every wallet, bot, and agent that can send can gate. Saviours is the
          shared security memory — not another scanner bolted on after the
          prompt.
        </p>
      </div>
      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 10,
        }}
      >
        {beats.map((beat) => (
          <div
            key={beat.k}
            style={{
              padding: "14px 14px",
              border: "1px solid var(--line-mid)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-raise)",
              boxShadow: "var(--edge), var(--lift)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.08em",
                color: "var(--sig)",
                textTransform: "uppercase",
              }}
            >
              {beat.k}
            </p>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 13,
                color: "var(--tx)",
                lineHeight: 1.45,
              }}
            >
              {beat.b}
            </p>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" onClick={onOpenLive} style={btnPrimary}>
          Run live film →
        </button>
        <a
          href="/#build"
          style={{
            ...btnGhost,
            textDecoration: "none",
            background: "var(--bg-raise)",
          }}
        >
          Build · Wallet / App →
        </a>
      </div>
    </div>
  );
}

function WalletSdkPanel({
  copied,
  onCopy,
}: {
  copied: string | null;
  onCopy: (id: string, text: string) => void;
}) {
  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ ...sellCard, marginBottom: 14 }}>
        <p style={sellEyebrow}>Drop-in · @saviours/check</p>
        <p style={sellBody}>
          Same API agents use. Default mode is a public Sepolia ENS read —{" "}
          <strong style={{ color: "var(--green)" }}>$0</strong>, no our server in
          the hot path. Package on npm.
        </p>
      </div>
      <SnippetBlock
        title="Fresh project · npm i @saviours/check"
        code={WALLET_SDK}
        copied={copied === "sdk"}
        onCopy={() => onCopy("sdk", WALLET_SDK)}
      />
      <SnippetBlock
        title="Pre-sign gate (wagmi / any wallet)"
        code={WALLET_WAGMI}
        copied={copied === "wagmi"}
        onCopy={() => onCopy("wagmi", WALLET_WAGMI)}
      />
      <p
        style={{
          margin: "4px 0 0",
          fontSize: 12,
          color: "var(--tx-lo)",
          lineHeight: 1.45,
        }}
      >
        Live demo: <strong style={{ color: "var(--tx-hi)" }}>Live film · lanes</strong>
        {" · "}
        <a
          href="https://www.npmjs.com/package/@saviours/check"
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--sig)" }}
        >
          npmjs.com/package/@saviours/check ↗
        </a>
      </p>
    </div>
  );
}

function SnippetBlock({
  title,
  code,
  copied,
  onCopy,
}: {
  title: string;
  code: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div
      style={{
        marginBottom: 14,
        border: "1px solid var(--line-mid)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-raise)",
        boxShadow: "var(--edge), var(--lift)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          padding: "10px 14px",
          borderBottom: "1px solid var(--line-mid)",
          background: "var(--bg-high)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--tx)",
          }}
        >
          {title}
        </p>
        <button
          type="button"
          onClick={onCopy}
          style={{
            ...btnGhost,
            padding: "6px 10px",
            fontSize: 12,
            background: "var(--bg-raise)",
            flexShrink: 0,
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: "14px 16px",
          background: "var(--bg-inset)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          lineHeight: 1.5,
          color: "var(--tx-hi)",
          whiteSpace: "pre-wrap",
          overflow: "auto",
        }}
      >
        {code}
      </pre>
    </div>
  );
}

const sellCard: CSSProperties = {
  padding: "14px 16px",
  border: "1px solid var(--sig-line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-raise)",
  boxShadow: "var(--edge), var(--lift)",
};

const sellEyebrow: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--sig)",
};

const sellBody: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--tx-lo)",
  maxWidth: 640,
};

function EacProbePanel({ address }: { address: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    reverted?: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  async function probe() {
    setBusy(true);
    setResult(null);
    try {
      const json = await fetchJson<{
        reverted?: boolean;
        message?: string;
        error?: string;
      }>("/api/govern/eac-probe", {
        method: "POST",
        headers: { "content-type": "application/json", ...writeHeaders() },
        body: JSON.stringify({ address: address.trim().toLowerCase() }),
      });
      setResult(json);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "EAC probe failed";
      setResult({ reverted: /revert/i.test(msg), message: msg, error: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: "var(--t-sm)", color: "var(--tx-lo)", maxWidth: 520, lineHeight: 1.5 }}>
        Investigator key attempts <code>saviours.dispute</code>. Expected:{" "}
        <strong style={{ color: "var(--tx-hi)" }}>revert</strong>. That is Enhanced
        Access Control — not a policy in our backend.
      </p>
      <button type="button" onClick={() => void probe()} disabled={busy} style={btnPrimary}>
        {busy ? "Probing…" : "Probe investigator → dispute (expect revert)"}
      </button>
      {result?.reverted ? (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            border: "1px solid color-mix(in srgb, var(--safe) 40%, var(--line))",
            borderRadius: "var(--r-md)",
            background: "color-mix(in srgb, var(--safe) 8%, var(--surface))",
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, color: "var(--safe)" }}>
            EAC revert · permission model holds
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--tx-lo)", lineHeight: 1.45 }}>
            Investigator cannot write <code>saviours.dispute</code> — role caps in
            the resolver, not a policy in our backend.
          </p>
          {result.message ? (
            <p
              style={{
                margin: "8px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--tx-faint)",
                wordBreak: "break-word",
              }}
            >
              {result.message}
            </p>
          ) : null}
        </div>
      ) : null}
      {result && !result.reverted ? (
        <div style={{ marginTop: 14 }}>
          <ErrorBanner
            title="Unexpected allow — EAC should have reverted"
            detail={result.message ?? result.error ?? JSON.stringify(result)}
          />
        </div>
      ) : null}
    </div>
  );
}

function DisputeRevokePanel({
  address,
  onDone,
}: {
  address: string;
  onDone?: () => void;
}) {
  const [reason, setReason] = useState("playground dispute test");
  const [busy, setBusy] = useState<"dispute" | "revoke" | null>(null);
  const [out, setOut] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const writesOpen = clientWritesAllowed();

  async function dispute() {
    setBusy("dispute");
    setErr(null);
    setOut(null);
    try {
      const json = await fetchJson<{ ok?: boolean; error?: string; txHash?: string }>(
        "/api/govern/dispute",
        {
          method: "POST",
          headers: { "content-type": "application/json", ...writeHeaders() },
          body: JSON.stringify({
            address: address.trim().toLowerCase(),
            reason,
          }),
          timeoutMs: 60_000,
        },
      );
      if (json.error) throw new Error(json.error);
      setOut(JSON.stringify(json, null, 2));
      onDone?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "dispute failed");
    } finally {
      setBusy(null);
    }
  }

  async function revoke() {
    setBusy("revoke");
    setErr(null);
    setOut(null);
    try {
      const json = await fetchJson<{ ok?: boolean; error?: string }>(
        "/api/govern/revoke",
        {
          method: "POST",
          headers: { "content-type": "application/json", ...writeHeaders() },
          body: JSON.stringify({ address: address.trim().toLowerCase() }),
          timeoutMs: 90_000,
        },
      );
      if (json.error) throw new Error(json.error);
      setOut(JSON.stringify(json, null, 2));
      onDone?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "revoke failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <p style={{ margin: "0 0 12px", fontSize: "var(--t-sm)", color: "var(--tx-lo)", lineHeight: 1.5 }}>
        Dispute flips status → WATCH. Revoke clears <strong>all</strong>{" "}
        <code>saviours.*</code> text keys (not just status). On{" "}
        <strong style={{ color: "var(--tx-hi)" }}>www.saviours.xyz</strong> writes
        are fail-closed (instant 401) unless the film host opens them. Local{" "}
        <code>pnpm dev</code> can write — Sepolia RPC may take up to ~60s; we
        time out instead of hanging forever.
      </p>
      {!writesOpen ? (
        <p
          style={{
            margin: "0 0 12px",
            padding: "10px 12px",
            border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--line))",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            color: "var(--tx-lo)",
            lineHeight: 1.45,
            background: "color-mix(in srgb, var(--warn) 8%, var(--surface))",
          }}
        >
          This host is <strong style={{ color: "var(--warn)" }}>read-only</strong>.
          Clicking Dispute/Revoke returns <code>401 Writes disabled</code> quickly
          — that is the product demo, not a hang. For a live write, run{" "}
          <code>pnpm dev</code> with writes enabled.
        </p>
      ) : null}
      <p style={{ margin: "0 0 8px", fontFamily: "var(--font-mono)", fontSize: "var(--t-floor)", color: "var(--ink-muted)" }}>
        target · {address}
      </p>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        style={{ ...fieldStyle, maxWidth: "100%", marginBottom: 12 }}
        aria-label="Dispute reason"
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => void dispute()} disabled={!!busy} style={btnPrimary}>
          {busy === "dispute"
            ? writesOpen
              ? "Disputing (≤60s)…"
              : "Checking write gate…"
            : "Dispute → WATCH"}
        </button>
        <button type="button" onClick={() => void revoke()} disabled={!!busy} style={btnGhost}>
          {busy === "revoke"
            ? writesOpen
              ? "Revoking (≤90s)…"
              : "Checking write gate…"
            : "Revoke name"}
        </button>
      </div>
      {err ? (
        <div style={{ marginTop: 12 }}>
          <ErrorBanner title="Dispute / revoke failed" detail={err} />
        </div>
      ) : null}
      {out ? (
        <pre style={{ marginTop: 12, padding: 12, background: "var(--bg-inset)", fontSize: "var(--t-floor)", overflow: "auto" }}>
          {out}
        </pre>
      ) : null}
    </div>
  );
}

function AskTab({ address }: { address: string }) {
  const packet: AskPacketClient = useMemo(
    () => ({
      address,
      status: "TAINTED",
      explanation:
        "Playground ask — uses live case API when you submit a question.",
      signals: [
        { id: "FLASHLOAN_ONE_SHOT", class: "threat" },
        { id: "ATOMIC_MULTI_PROTOCOL", class: "threat" },
      ],
    }),
    [address],
  );
  return <AskPanel packet={packet} />;
}

function FingerprintPanel({ address }: { address: string }) {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    setOut(null);
    try {
      const json = await fetchJson<Record<string, unknown>>(
        "/api/fingerprint/recompute",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chainId: 1,
            address: address.trim().toLowerCase(),
          }),
          timeoutMs: 30_000,
        },
      );
      setOut(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "fingerprint failed");
    } finally {
      setBusy(false);
    }
  }

  const dossierError =
    out && typeof out.dossierError === "string"
      ? String(out.dossierError)
      : null;
  const dossierUrl =
    out && typeof out.dossierUrl === "string" ? String(out.dossierUrl) : null;
  const verdict =
    out && typeof out.verdict === "string" ? String(out.verdict) : null;
  const htmlPostMortem =
    !!dossierError &&
    (/HTML instead of JSON/i.test(dossierError) ||
      /human page|blog/i.test(dossierError));

  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: "var(--t-sm)", color: "var(--tx-lo)", maxWidth: 560, lineHeight: 1.5 }}>
        Recipe <code>dossier-deep-dive</code>: compare ENS / registry{" "}
        <code>evidenceHash</code> to a <strong>pinned JSON dossier</strong> when
        one exists. Hero currently stores a public post-mortem URL (Certik blog) —
        that is intentional human context, not a machine dossier. Hashes still
        prove the memory. Cascade →{" "}
        <strong style={{ color: "var(--tx-hi)" }}>Clone defense</strong>.
      </p>
      <button type="button" onClick={() => void run()} disabled={busy} style={btnPrimary}>
        {busy ? "Recomputing…" : "Recompute fingerprint"}
      </button>
      {err ? (
        <div style={{ marginTop: 12 }}>
          <ErrorBanner title="Fingerprint recompute failed" detail={err} />
        </div>
      ) : null}
      {dossierError || verdict === "DOSSIER_UNREACHABLE" ? (
        <div style={{ marginTop: 12 }}>
          <ErrorBanner
            title={
              htmlPostMortem
                ? "Post-mortem is HTML — not a pinned JSON dossier"
                : "External dossier unavailable"
            }
            detail={dossierError ?? "The published post-mortem was unreachable."}
          >
            {htmlPostMortem ? (
              <>
                <code>saviours.dossier</code> points at a human write-up
                {dossierUrl ? (
                  <>
                    {" "}
                    (
                    <a href={dossierUrl} target="_blank" rel="noreferrer">
                      open
                    </a>
                    )
                  </>
                ) : null}
                . ENS / registry evidence hashes below still hold — verdict memory
                is unaffected.
              </>
            ) : (
              <>The evidence hash and the verdict are unaffected.</>
            )}
          </ErrorBanner>
        </div>
      ) : null}
      {out ? (
        <pre style={{ marginTop: 12, padding: 12, background: "var(--bg-inset)", fontSize: "var(--t-floor)", overflow: "auto", maxHeight: 420 }}>
          {JSON.stringify(out, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

/**
 * Clone defense demo — address miss → eth_getCode → code-<hash>.saviours.eth.
 * Hits only if a class name is registered; otherwise shows computed name + miss.
 */
function CloneDefensePanel({
  address,
  onAddress,
}: {
  address: string;
  onAddress: (a: string) => void;
}) {
  const [input, setInput] = useState(address);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [check, setCheck] = useState<{
    decision?: string;
    reason?: string;
    ensName?: string | null;
    cascadeLayer?: string;
    source?: string;
    codeClass?: {
      ensName: string;
      hit: boolean;
      status?: string;
      layer: string;
    };
    cost?: { graphQueries: number; aiCalls: number; ensResolutions: number };
    latencyMs?: number;
  } | null>(null);

  async function run() {
    const addr = input.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(addr)) {
      setErr("Need a 0x address");
      return;
    }
    setBusy(true);
    setErr(null);
    setCheck(null);
    onAddress(addr);
    try {
      const json = await fetchJson<{
        check?: {
          decision?: string;
          reason?: string;
          ensName?: string | null;
          cascadeLayer?: string;
          source?: string;
          codeClass?: {
            ensName: string;
            hit: boolean;
            status?: string;
            layer: string;
          };
          cost?: {
            graphQueries: number;
            aiCalls: number;
            ensResolutions: number;
          };
          latencyMs?: number;
        };
        error?: string;
      }>("/api/shield/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chainId: 1, address: addr }),
      });
      if (json.error) throw new Error(json.error);
      setCheck(json.check ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cascade check failed");
    } finally {
      setBusy(false);
    }
  }

  const layer = check?.cascadeLayer;
  const hitViaClone = layer === "code" || layer === "deployer";

  return (
    <div>
      <p
        style={{
          margin: "0 0 8px",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--t-floor)",
          letterSpacing: "0.08em",
          color: "var(--sig)",
        }}
      >
        CLONE DEFENSE · ADDRESS → BYTECODE → CODE-HASH ENS
      </p>
      <p
        style={{
          margin: "0 0 14px",
          fontSize: "var(--t-sm)",
          color: "var(--tx-lo)",
          maxWidth: 560,
          lineHeight: 1.5,
        }}
      >
        We don&apos;t ask who the address is. We ask what it&apos;s made of.
        Shield: address name → if miss, <code>eth_getCode</code> → resolve{" "}
        <code>code-&lt;hash20&gt;.saviours.eth</code>. Still ENS resolve · $0. Hit
        only when that class name is registered.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="0x… contract or clone"
          style={{ ...fieldStyle, flex: "1 1 280px", minWidth: 0 }}
        />
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          style={btnPrimary}
        >
          {busy ? "Cascading…" : "Run cascade check"}
        </button>
      </div>
      <ol
        style={{
          margin: "0 0 14px",
          paddingLeft: 18,
          fontSize: "var(--t-sm)",
          color: "var(--tx-lo)",
          lineHeight: 1.55,
          maxWidth: 560,
        }}
      >
        <li>Resolve <code>&lt;address&gt;.saviours.eth</code></li>
        <li>MISS → mainnet <code>getCode</code> → class label</li>
        <li>
          Resolve class name → BLOCK/WARN if named · else escalate (honest miss)
        </li>
      </ol>
      {err ? (
        <p role="alert" style={{ color: "var(--red)", fontSize: "var(--t-sm)" }}>
          {err}
        </p>
      ) : null}
      {check ? (
        <div
          style={{
            padding: 14,
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-inset)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: "var(--t-sm)",
              color: hitViaClone
                ? "var(--red)"
                : check.decision === "BLOCK" || check.decision === "WARN"
                  ? "var(--warn)"
                  : "var(--tx-hi)",
            }}
          >
            {check.decision ?? "?"}
            {hitViaClone
              ? ` · via ${layer} class`
              : ` · source=${check.source ?? "?"}`}
          </p>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: "var(--t-sm)",
              color: "var(--tx-lo)",
              lineHeight: 1.45,
            }}
          >
            {check.reason}
          </p>
          <p
            style={{
              margin: "8px 0 0",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--t-floor)",
              color: "var(--tx-lo)",
              wordBreak: "break-all",
            }}
          >
            {check.ensName ?? "(no ENS name)"} · graph=
            {check.cost?.graphQueries ?? 0} ai={check.cost?.aiCalls ?? 0} ens=
            {check.cost?.ensResolutions ?? 0} · {check.latencyMs ?? "?"}ms
          </p>
          {check.codeClass?.hit ? (
            <p
              style={{
                margin: "10px 0 0",
                fontSize: "var(--t-sm)",
                color: "var(--safe, var(--sig))",
                lineHeight: 1.45,
              }}
            >
              Bytecode class armed: <code>{check.codeClass.ensName}</code> ·{" "}
              {check.codeClass.status}. An unnamed address with this code would
              BLOCK via cascade (first sighting).
            </p>
          ) : null}
          {!hitViaClone && check.source === "none" ? (
            <p
              style={{
                margin: "10px 0 0",
                fontSize: "var(--t-sm)",
                color: "var(--tx-lo)",
                lineHeight: 1.45,
              }}
            >
              No address name and no registered <code>code-*</code> class yet —
              cascade ran (or skipped without mainnet RPC) and honestly escalated.
              Register one class name to demo the block-on-first-sighting beat.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
