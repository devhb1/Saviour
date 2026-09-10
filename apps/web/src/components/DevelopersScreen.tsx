"use client";

import type { CSSProperties } from "react";
import { btnGhost } from "./AppShell";
import { DarkThesis, MarkMark, SectionMark, StatusPill } from "./Mark";

const CAST_ATTACK_1 = `cast call 0xF479306621F718F7d76875f67506ceD33717751c \\
  "text(bytes32,string)(string)" \\
  $(cast namehash 0x935bfb495e33f74d2e9735df1da66ace442ede48.saviours.eth) \\
  "saviours.status"`;

const SURFACES: {
  method: string;
  path: string;
  body: string;
}[] = [
  {
    method: "POST",
    path: "/api/investigate",
    body: "The gate. Fan-out Graph → signals → AI cites → validator. Never invents TAINTED alone.",
  },
  {
    method: "POST",
    path: "/api/shield/check",
    body: "Memory check. ENS first, then registry. MEMORY HIT = 0 Graph · 0 AI.",
  },
  {
    method: "GET",
    path: "/api/incidents",
    body: "Public registry rows. Graph-verified vs provenance seed, labeled honestly.",
  },
  {
    method: "POST",
    path: "/api/case/:address/ask",
    body: "Case Ask. Tool-traced answers over the dossier — not a free-floating chat.",
  },
  {
    method: "POST",
    path: "/api/govern/eac-probe",
    body: "Prove EAC. Investigator cannot write dispute texts — permission caps, not theater.",
  },
  {
    method: "POST",
    path: "/api/govern/dispute · revoke",
    body: "Operator wallets only. Public host stays fail-closed; film on local writes.",
  },
  {
    method: "Bazantic",
    path: "saviour.bazgateway.com",
    body: "LIVE gateway · shieldCheck $0 · investigate x402 $0.01 · MCP /mcp",
  },
  {
    method: "GET",
    path: "/openapi-saviours.json",
    body: "OpenAPI for Bazantic / agent gateways.",
  },
  {
    method: "Recipe",
    path: "saviours-check-before-sign",
    body: "Shield first → BLOCK cancels · miss then investigate. docs/BAZANTIC.md",
  },
  {
    method: "MCP",
    path: "check_target",
    body: "Same Shield path for Cursor agents. packages/mcp · five tools total.",
  },
  {
    method: "cast",
    path: "text(saviours.status)",
    body: "SDK-less. Any client that reads ENS text records can resolve ATTACK-1.",
  },
];

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
        <SectionMark>FOR INTEGRATORS</SectionMark>
        <StatusPill>READS OPEN · WRITES LOCAL</StatusPill>
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
        Same memory, outside this UI.
      </h2>
      <p
        style={{
          margin: "12px 0 0",
          fontSize: 15,
          color: "var(--ink-muted)",
          maxWidth: 560,
          lineHeight: 1.55,
        }}
      >
        saviour’s product is the named ENS record. Use cast, MCP, or plain HTML —
        you do not need this Next app to resolve a MEMORY HIT.
      </p>

      <div
        style={{
          marginTop: 18,
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          alignItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
        }}
      >
        <span>// built on</span>
        <span style={{ color: "var(--ink)" }}>The Graph</span>
        <span aria-hidden>·</span>
        <span style={{ color: "var(--ink)" }}>ENS</span>
        <span aria-hidden>·</span>
        <span style={{ color: "var(--ink)" }}>Bazantic</span>
        <span aria-hidden>·</span>
        <span>&lt;address&gt;.saviours.eth</span>
      </div>

      <div
        style={{
          marginTop: 28,
          borderTop: "1px solid var(--line)",
        }}
      >
        {SURFACES.map((row) => (
          <div
            key={`${row.method}-${row.path}`}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(64px, 72px) minmax(160px, 280px) minmax(0, 1fr)",
              gap: 16,
              padding: "14px 0",
              borderBottom: "1px solid var(--line)",
              alignItems: "start",
            }}
            className="api-row"
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.06em",
                color: "var(--signal)",
                fontWeight: 600,
              }}
            >
              {row.method}
            </span>
            <code
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--ink)",
                wordBreak: "break-all",
              }}
            >
              {row.path}
            </code>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--ink-muted)",
                lineHeight: 1.5,
              }}
            >
              {row.body}
            </p>
          </div>
        ))}
      </div>

      <DarkThesis
        headline={
          <>
            Same answer from Next, plain HTML, or{" "}
            <MarkMark>cast</MarkMark>.
          </>
        }
        body={
          <>
            ATTACK-1 is named on Sepolia. Paste the call below into any machine with
            foundry — no saviour server required for the resolve.
          </>
        }
        pills={["BLOCK · ENS HIT", "0 GRAPH", "0 AI", "SDK-LESS"]}
      />

      <div style={{ marginTop: 20 }}>
        <SectionMark>QUICK START · ATTACK-1</SectionMark>
        <pre style={pre}>{CAST_ATTACK_1}</pre>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
          marginTop: 28,
        }}
      >
        <MiniCard
          title="MCP · check_target"
          body="ENS-first Shield for agents. BLOCK / WARN / ALLOW / ESCALATE. Hot path never Graph, never AI."
        />
        <MiniCard
          title="Plain shield"
          body="consumers/plain-shield.html — static path for film when Next is refused."
        />
        <MiniCard
          title="Trust · EAC"
          body="PermissionedResolver roles are caps. Prove EAC shows investigator cannot write dispute texts."
        />
      </div>

      <div style={{ marginTop: 24 }}>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") window.location.hash = "legacy";
          }}
          style={btnGhost}
        >
          Open legacy Investigate / Resolve / Govern
        </button>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .api-row {
            grid-template-columns: 1fr !important;
            gap: 6px !important;
          }
        }
      `}</style>
    </section>
  );
}

function MiniCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid var(--line)",
        borderRadius: 4,
        background: "#fff",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: 16,
          fontWeight: 500,
        }}
      >
        {title}
      </p>
      <p
        style={{
          margin: "10px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--ink-muted)",
          lineHeight: 1.5,
        }}
      >
        {body}
      </p>
    </div>
  );
}

const pre: CSSProperties = {
  margin: "12px 0 0",
  padding: 16,
  background: "#07101c",
  color: "#d5e4ef",
  borderRadius: 4,
  overflow: "auto",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
};
