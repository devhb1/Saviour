"use client";

import { useState, type CSSProperties } from "react";
import { btnGhost } from "./AppShell";
import { SectionMark, StatusPill } from "./Mark";
import { WhatWeDont } from "./WhatWeDont";
import { BazanticPayPanel } from "./BazanticPayPanel";
import { UnderHoodDiagrams } from "./UnderHoodDiagrams";

const CAST_ATTACK_1 = `cast call 0xF479306621F718F7d76875f67506ceD33717751c \\
  "text(bytes32,string)(string)" \\
  $(cast namehash 0x935bfb495e33f74d2e9735df1da66ace442ede48.saviours.eth) \\
  "saviours.status"`;

const LIVE_AGENT = `# Terminal agent — ENS hot path imports nothing from @saviours/*
cd consumers/live-agent && pnpm install
export SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
pnpm start
# ATTACK-1 → BLOCK · BOT-1 → WARN · $0 on MEMORY HIT`;

const RECIPE = `Name: saviours-check-before-sign
Gateway: https://saviour.bazgateway.com
1) POST /api/shield/check → BLOCK/WARN ⇒ cancel ($0)
2) On miss → Pay x402 on Base → POST /api/investigate once
3) Re-verify: ENS text saviours.status on <addr>.saviours.eth (no SAVIOURS server)
Demo: 0x935bfb495e33f74d2e9735df1da66ace442ede48 → shieldCheck BLOCK`;

const API_ROWS: { method: string; path: string; body: string }[] = [
  {
    method: "POST",
    path: "/api/shield/check",
    body: "MEMORY HIT · ENS first · 0 Graph · 0 AI · $0",
  },
  {
    method: "POST",
    path: "/api/investigate",
    body: "Miss path · Graph ×8 · AI cites · validator decides",
  },
  {
    method: "POST",
    path: "/api/bazantic/pay-investigate",
    body: "Live x402 settle via bazantic CLI grant · returns Basescan tx (pnpm dev)",
  },
  {
    method: "GET",
    path: "/api/resolve",
    body: "ENS passport texts · cast-equivalent for Identity",
  },
  {
    method: "GET",
    path: "/api/incidents",
    body: "Memory ledger · Graph-verified vs Live vs Provenance",
  },
  {
    method: "POST",
    path: "/api/govern/eac-probe",
    body: "Wrong-role revert · ENSv2 permission model",
  },
  {
    method: "MCP",
    path: "check_target · investigate_target · fanout_target",
    body: "packages/mcp · same Shield / investigate path",
  },
  {
    method: "GET",
    path: "/openapi-saviours.json",
    body: "OpenAPI contract for Bazantic / agents",
  },
];

function CopyBlock({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={panel}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "center",
        }}
      >
        <p style={eyebrow}>{label}</p>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(text.replace(/\\\n/g, "\n"));
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          style={{ ...btnGhost, padding: "6px 10px", fontSize: 12 }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre style={pre}>{text}</pre>
    </div>
  );
}

export function DevelopersScreen() {
  return (
    <section className="rise">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <SectionMark>BUILD · AGENTS · PARTNERS</SectionMark>
        <StatusPill>GRAPH · ENS · BAZANTIC</StatusPill>
      </div>

      <h2
        style={{
          margin: "14px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: "clamp(28px, 4vw, 40px)",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          maxWidth: 720,
        }}
      >
        Same memory. Outside this UI.
      </h2>
      <p style={lead}>
        Agents resolve via ENS. They pay Bazantic only on a miss. The Graph proves
        the first investigation. This page is the integrator surface.
      </p>

      {/* Partner track strip */}
      <div
        style={{
          marginTop: 22,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          maxWidth: 960,
        }}
      >
        <PartnerCard
          track="ENS"
          title="Best Use of ENSv2"
          body="<addr>.saviours.eth · PermissionedResolver · EAC roles · cast without our server"
        />
        <PartnerCard
          track="GRAPH"
          title="Composable / Standardized"
          body="1 Messari template × 8 deployments + Adapter A · AI cites only · code decides"
        />
        <PartnerCard
          track="BAZANTIC"
          title="Agentify a New API"
          body="shieldCheck $0 · investigate x402 on Base · recipe check-before-sign"
        />
      </div>

      <div style={{ marginTop: 8 }}>
        <BazanticPayPanel variant="full" />
      </div>

      <aside style={filmNote}>
        <p style={eyebrow}>FILM NOTE · PAID SETTLE</p>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--ink)", lineHeight: 1.5 }}>
          <strong>Pay & investigate</strong> needs the <code>bazantic</code> CLI + Base
          grant on this machine (<code>film-base</code>). Use <code>pnpm dev</code> for
          the live Basescan tx. Public Vercel still proves Shield $0 and the 402
          invoice — settle on camera from local.
        </p>
      </aside>

      <div
        style={{
          marginTop: 22,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 14,
          maxWidth: 960,
        }}
      >
        <CopyBlock label="CAST · ATTACK-1 → TAINTED" text={CAST_ATTACK_1} />
        <CopyBlock label="LIVE-AGENT · ZERO @saviours IMPORTS" text={LIVE_AGENT} />
      </div>

      <div style={{ marginTop: 14, maxWidth: 960 }}>
        <CopyBlock label="RECIPE · PASTE INTO BAZANTIC" text={RECIPE} />
      </div>

      <div style={{ marginTop: 28, maxWidth: 960 }}>
        <p style={eyebrow}>UNDER THE HOOD</p>
        <div style={{ marginTop: 12 }}>
          <UnderHoodDiagrams />
        </div>
      </div>

      <div style={{ ...panel, marginTop: 28, maxWidth: 720 }}>
        <p style={eyebrow}>ROADMAP · COMPANY NOT HACK</p>
        <ol style={roadmapList}>
          <li>
            <strong style={{ color: "var(--ink)" }}>Now</strong> — Loop live · Identity ·
            live-agent · Bazantic $0/402/pay · Memory gallery · EAC
          </li>
          <li>
            <strong style={{ color: "var(--ink)" }}>V1 (weeks)</strong> —{" "}
            <code>@saviours/check</code> · polished agent pay · more live Graph classes
            (honest promote only)
          </li>
          <li>
            <strong style={{ color: "var(--ink)" }}>V2 (months)</strong> — Browser extension ·
            wallet hook · event-indexed registry · ambient check
          </li>
          <li>
            <strong style={{ color: "var(--ink)" }}>V3+</strong> — Multi-investigator EAC ·
            L2 links · protocol self-publish · never auto-TAINTED bytecode leads
          </li>
        </ol>
        <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--ink-muted)" }}>
          Pricing forever: Shield / cast / ENS read = $0. Investigate miss = metered.
          Never charge a memory hit.
        </p>
      </div>

      <details style={{ ...panel, marginTop: 22, maxWidth: 900 }}>
        <summary
          style={{
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.08em",
            color: "var(--ink)",
            fontWeight: 600,
          }}
        >
          API · MCP · OpenAPI surfaces (expand)
        </summary>
        <div style={{ marginTop: 12 }}>
          {API_ROWS.map((row) => (
            <div
              key={`${row.method}-${row.path}`}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(64px, 88px) minmax(140px, 1fr)",
                gap: 12,
                padding: "10px 0",
                borderBottom: "1px solid color-mix(in srgb, var(--line) 70%, transparent)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--signal)",
                  fontWeight: 600,
                }}
              >
                {row.method}
              </span>
              <div>
                <code style={{ fontSize: 12, color: "var(--ink)" }}>{row.path}</code>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-muted)" }}>
                  {row.body}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--ink-muted)" }}>
          Gates: <code>pnpm check:shield</code> · <code>check:ens-story</code> ·{" "}
          <code>check:mcp</code> · <code>pnpm bazantic:e2e</code>
        </p>
        <a
          href="/openapi-saviours.json"
          style={{
            display: "inline-block",
            marginTop: 10,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--signal)",
          }}
        >
          Open OpenAPI →
        </a>
      </details>

      <div style={{ marginTop: 22, maxWidth: 720 }}>
        <WhatWeDont compact />
      </div>

      <p
        style={{
          margin: "22px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.06em",
          color: "var(--ink-muted)",
        }}
      >
        Guard sketch · <code>contracts/examples/SavioursGuard.sol</code> · open{" "}
        <button
          type="button"
          onClick={() => {
            window.location.hash = "legacy";
          }}
          style={{
            border: "none",
            background: "none",
            padding: 0,
            color: "var(--signal)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "inherit",
          }}
        >
          legacy Investigate / Resolve / Govern
        </button>
      </p>
    </section>
  );
}

function PartnerCard({
  track,
  title,
  body,
}: {
  track: string;
  title: string;
  body: string;
}) {
  return (
    <div style={panel}>
      <p style={eyebrow}>{track}</p>
      <p
        style={{
          margin: "8px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: 18,
          fontWeight: 500,
          color: "var(--ink)",
        }}
      >
        {title}
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.45 }}>
        {body}
      </p>
    </div>
  );
}

const eyebrow: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.1em",
  color: "var(--signal)",
};

const lead: CSSProperties = {
  margin: "12px 0 0",
  fontSize: 15,
  color: "var(--ink-muted)",
  maxWidth: 560,
  lineHeight: 1.55,
};

const panel: CSSProperties = {
  padding: "16px 16px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  background: "var(--surface)",
};

const filmNote: CSSProperties = {
  marginTop: 16,
  padding: "14px 16px",
  border: "1px solid color-mix(in srgb, var(--warn) 40%, var(--line))",
  borderRadius: "var(--radius-md)",
  background: "color-mix(in srgb, var(--warn) 6%, var(--surface))",
  maxWidth: 900,
};

const pre: CSSProperties = {
  margin: "10px 0 0",
  padding: 12,
  background: "rgba(14,18,16,0.92)",
  color: "#d5ded7",
  borderRadius: "var(--radius-sm)",
  fontSize: 11,
  lineHeight: 1.45,
  overflow: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const roadmapList: CSSProperties = {
  margin: "12px 0 0",
  paddingLeft: 18,
  fontSize: 14,
  color: "var(--ink-muted)",
  lineHeight: 1.55,
};
