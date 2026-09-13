"use client";

import { useState, type CSSProperties } from "react";
import { btnGhost } from "./AppShell";
import { SectionMark, StatusPill } from "./Mark";
import { WhatWeDont } from "./WhatWeDont";
import { BazanticPayPanel } from "./BazanticPayPanel";

const SDK_SNIPPET = `import { check, guard, castCommand } from "@saviours/check";

const addr = "0x935bfb495e33f74d2e9735df1da66ace442ede48";
const r = await check(addr);
// { decision: "BLOCK", status: "TAINTED", source: "ens",
//   cost: { graph: 0, ai: 0, usd: 0 } }

await guard(addr); // throws SavioursBlockedError on BLOCK
console.log(castCommand(addr));`;

const HOOK_SNIPPET = `// In this Next app (gateway Shield)
import { useSavioursCheck } from "../lib/useSavioursCheck";

const { result, loading, error } = useSavioursCheck(address);
// result.decision · result.cost.usd === 0 on MEMORY HIT`;

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
Gateway: https://saviours.bazgateway.com
1) POST /api/shield/check → BLOCK/WARN ⇒ cancel ($0)
2) On miss → Pay x402 on Base → POST /api/investigate once (~$0.01)
3) Optional depth → POST /api/evidence + POST /api/case/ask (~$0.05)
4) Re-verify: ENS text saviours.status on <addr>.saviours.eth (no SAVIOURS server)
Never bind: dispute · revoke · eacProbe
Demo: 0x935bfb495e33f74d2e9735df1da66ace442ede48 → shieldCheck BLOCK`;

const MODES: {
  mode: string;
  path: string;
  deps: string;
  cost: string;
  server: string;
}[] = [
  {
    mode: "ens",
    path: "PermissionedResolver.text()",
    deps: "viem only",
    cost: "$0",
    server: "No",
  },
  {
    mode: "shield",
    path: "POST /api/shield/check",
    deps: "fetch",
    cost: "$0",
    server: "Gateway",
  },
  {
    mode: "full",
    path: "POST /api/investigate",
    deps: "fetch (+ x402 grant)",
    cost: "~$0.01 miss",
    server: "Gateway",
  },
];

const MCP_ROWS: { surface: string; tools: string; note: string }[] = [
  {
    surface: "stdio · packages/mcp",
    tools:
      "check_target · investigate_target · get_incident · list_standard_protocols · fanout_target",
    note: "5 tools · full local parity for Cursor / Claude",
  },
  {
    surface: "gateway HTTP · Bazantic",
    tools:
      "info · shieldCheck · investigate · payInvestigate · getEvidence · askCase · resolve* · catalog · dossier · (+ path variants)",
    note: "17 MCP tools · Free/$0.01/$0.05 · never bind dispute/revoke/eacProbe",
  },
];

const API_ROWS: { method: string; path: string; body: string }[] = [
  {
    method: "POST",
    path: "/api/shield/check",
    body: "Free · MEMORY HIT · ENS first · ENS resolve · $0",
  },
  {
    method: "POST",
    path: "/api/investigate",
    body: "Standard ~$0.01 · Graph ×8 · AI cites · validator · unpaid → 402",
  },
  {
    method: "POST",
    path: "/api/bazantic/pay-investigate",
    body: "Live x402 settle · Basescan tx (pnpm dev + film-base)",
  },
  {
    method: "POST",
    path: "/api/evidence",
    body: "Complex ~$0.05 · body {chainId,address} · prefer over path form",
  },
  {
    method: "POST",
    path: "/api/case/ask",
    body: "Complex ~$0.05 · body {address,question} · prefer over path form",
  },
  {
    method: "GET",
    path: "/api/resolve",
    body: "ENS passport texts · cast-equivalent · Free",
  },
  {
    method: "GET",
    path: "/api/resolve-target",
    body: "Normalize chip / ENS / 0x input · Free",
  },
  {
    method: "GET",
    path: "/api/evidence/{chainId}/{address}",
    body: "Path form (may 404 on Bazantic proxy — use POST /api/evidence)",
  },
  {
    method: "POST",
    path: "/api/case/{address}/ask",
    body: "Path form (may 404 on Bazantic proxy — use POST /api/case/ask)",
  },
  {
    method: "GET",
    path: "/api/incidents",
    body: "Memory ledger · honesty tiers",
  },
  {
    method: "GET",
    path: "/api/catalog",
    body: "Fleet Run classes + addresses",
  },
  {
    method: "POST",
    path: "/api/dossier/fetch",
    body: "Pinned dossier payload",
  },
  {
    method: "POST",
    path: "/api/fingerprint/recompute",
    body: "Deterministic evidenceHash",
  },
  {
    method: "POST",
    path: "/api/govern/eac-probe",
    body: "Wrong-role revert · EAC",
  },
  {
    method: "POST",
    path: "/api/govern/dispute",
    body: "Operator dispute (fail-closed public)",
  },
  {
    method: "POST",
    path: "/api/govern/revoke",
    body: "Operator revoke (fail-closed public)",
  },
];

function CopyBlock({ label, text }: { label: string; text: string }) {
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
        <SectionMark>BUILD · SDK · AGENTS</SectionMark>
        <StatusPill>@saviours/check · MCP · OpenAPI</StatusPill>
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
        Two lines. Three modes. Zero excuses.
      </h2>
      <p style={lead}>
        Default path talks to Sepolia ENS only — no{" "}
        <code>@saviours/core</code>, no our server, $0. Escalate to Shield or full
        investigate only when you need a miss path.
      </p>

      <div style={{ marginTop: 22, maxWidth: 960 }}>
        <CopyBlock label="@saviours/check · QUICKSTART" text={SDK_SNIPPET} />
      </div>

      <div style={{ marginTop: 14, maxWidth: 960 }}>
        <CopyBlock label="REACT HOOK · useSavioursCheck" text={HOOK_SNIPPET} />
      </div>

      <div style={{ marginTop: 22, maxWidth: 960 }}>
        <p style={eyebrow}>THREE MODES · ESCALATING COST</p>
        <div style={{ ...panel, marginTop: 10, padding: 0, overflow: "hidden" }}>
          <div className="sdk-mode-table" style={tableHead}>
            <span>Mode</span>
            <span>Path</span>
            <span>Deps</span>
            <span>Cost</span>
            <span>Our server?</span>
          </div>
          {MODES.map((m) => (
            <div key={m.mode} className="sdk-mode-row" style={tableRow}>
              <code style={{ color: "var(--sig)", fontWeight: 600 }}>{m.mode}</code>
              <span style={{ fontSize: 13, color: "var(--ink)" }}>{m.path}</span>
              <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>{m.deps}</span>
              <span className="tabular" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                {m.cost}
              </span>
              <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>{m.server}</span>
            </div>
          ))}
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--ink-muted)" }}>
          Package: <code>packages/check</code> ·{" "}
          <code>pnpm --filter @saviours/check build</code> · examples under{" "}
          <code>packages/check/examples/</code>
        </p>
      </div>

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
          title="Hierarchical security memory"
          body="<addr>.saviours.eth · PermissionedResolver · EAC · verdict alias · cast without our server"
        />
        <PartnerCard
          track="GRAPH"
          title="Standardized mainnet proof"
          body="1 Messari template × 8 deployments · AI cites only · code decides"
        />
        <PartnerCard
          track="BAZANTIC"
          title="Metered agent gateway"
          body="shieldCheck $0 · investigate x402 · recipe check-before-sign"
        />
      </div>

      <div style={{ marginTop: 8 }}>
        <BazanticPayPanel variant="full" />
      </div>

      <aside style={filmNote}>
        <p style={eyebrow}>FILM NOTE · PAID SETTLE</p>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--ink)", lineHeight: 1.5 }}>
          <strong>Pay & investigate</strong> needs the <code>bazantic</code> CLI + Base
          grant (<code>film-base</code>). Use <code>pnpm dev</code> for the live
          Basescan tx. Public Vercel still proves Shield $0 and the 402 invoice.
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
        <p style={eyebrow}>MCP PARITY</p>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--ink-muted)", lineHeight: 1.5 }}>
          Local stdio exposes five tools; the Bazantic gateway exposes three for
          discovery + pay. Same Shield / investigate semantics — different surface
          area on purpose.
        </p>
        <div style={{ ...panel, marginTop: 12, padding: 0, overflow: "hidden" }}>
          {MCP_ROWS.map((row) => (
            <div
              key={row.surface}
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid color-mix(in srgb, var(--line) 70%, transparent)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--sig)",
                }}
              >
                {row.surface}
              </p>
              <code
                style={{
                  display: "block",
                  marginTop: 8,
                  fontSize: 12,
                  color: "var(--ink)",
                  lineHeight: 1.45,
                }}
              >
                {row.tools}
              </code>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--ink-muted)" }}>
                {row.note}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...panel, marginTop: 28, maxWidth: 720 }}>
        <p style={eyebrow}>ROADMAP · COMPANY NOT HACK</p>
        <ol style={roadmapList}>
          <li>
            <strong style={{ color: "var(--ink)" }}>Now</strong> —{" "}
            <code>@saviours/check</code> in-repo · Live loop · Fleet · Bazantic film
          </li>
          <li>
            <strong style={{ color: "var(--ink)" }}>V1 (weeks)</strong> — publish to npm ·
            browser-wallet x402 · honest Graph class growth
          </li>
          <li>
            <strong style={{ color: "var(--ink)" }}>V2 (months)</strong> — extension ·
            wallet hook · event-indexed registry
          </li>
          <li>
            <strong style={{ color: "var(--ink)" }}>V3+</strong> — multi-investigator EAC ·
            L2 · never auto-TAINTED bytecode leads
          </li>
        </ol>
        <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--ink-muted)" }}>
          Pricing forever: Shield / cast / ENS read = $0. Investigate miss = metered.
        </p>
      </div>

      <details style={{ ...panel, marginTop: 22, maxWidth: 960 }}>
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
          OpenAPI · 14 routes (expand)
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
                borderBottom:
                  "1px solid color-mix(in srgb, var(--line) 70%, transparent)",
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
        Guard sketch · <code>contracts/examples/SavioursGuard.sol</code>
        {" · "}
        <a href="#docs" style={{ color: "var(--signal)" }}>
          Docs →
        </a>
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
  background: "var(--bg-inset)",
  color: "var(--tx)",
  border: "1px solid var(--line)",
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

const tableHead: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "72px minmax(0, 1.4fr) minmax(0, 0.8fr) 88px 88px",
  gap: 10,
  padding: "10px 14px",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.08em",
  color: "var(--ink-muted)",
  borderBottom: "1px solid var(--line)",
};

const tableRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "72px minmax(0, 1.4fr) minmax(0, 0.8fr) 88px 88px",
  gap: 10,
  padding: "12px 14px",
  alignItems: "center",
  borderBottom: "1px solid color-mix(in srgb, var(--line) 70%, transparent)",
};
