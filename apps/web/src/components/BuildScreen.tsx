"use client";

import { useState, type CSSProperties } from "react";
import { btnGhost, btnPrimary } from "./AppShell";
import { AgentQuickStart, AGENT_POLICY } from "./AgentQuickStart";
import {
  BazanticRecipesList,
  BazanticTiersTable,
} from "./BazanticCatalog";
import { SafeSwapRecipePanel } from "./SafeSwapRecipePanel";
import {
  BAZANTIC_PUBLISH_KIT,
  MCP_TOOL_COUNT,
} from "../lib/bazanticGateway";

type Tab = "agent" | "recipe" | "wallet" | "raw" | "help";

const SDK = `# Fresh project — do NOT run this inside the Saviours monorepo
mkdir saviours-demo && cd saviours-demo
npm init -y
npm i @saviours/check
# or: pnpm init && pnpm add @saviours/check

# ESM smoke (package is ESM-only)
node --input-type=module -e "
import { check } from '@saviours/check';
const r = await check('0x935bfb495e33f74d2e9735df1da66ace442ede48');
console.log(r.decision, r.status); // named → BLOCK|WARN
"

import { check, guard } from "@saviours/check";

const r = await check("0x935bfb495e33f74d2e9735df1da66ace442ede48");
// default ens mode · Sepolia · $0 · no our server

await guard(addr); // throws on BLOCK

// Optional gateway modes:
// await check(addr, { mode: "shield" })  // POST /api/shield/check · $0
// await check(addr, { mode: "full" })    // investigate · pay on miss`;

const WAGMI_HOOK = `// Before sendTransaction / signTypedData
import { check } from "@saviours/check";

async function gatedSend(to: string, send: () => Promise<string>) {
  const r = await check(to);
  if (r.decision === "BLOCK" || r.decision === "WARN") {
    throw new Error(\`Saviours \${r.decision}: \${r.status}\`);
  }
  return send();
}

// Or raw gateway (no package):
// POST https://saviours.bazgateway.com/api/shield/check`;

const CAST = `cast call 0xF479306621F718F7d76875f67506ceD33717751c \\
  "text(bytes32,string)(string)" \\
  $(cast namehash 0x935bfb495e33f74d2e9735df1da66ace442ede48.saviours.eth) \\
  "saviours.status" \\
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com
# → TAINTED | WATCH when named`;

const FAQ: { q: string; a: string }[] = [
  {
    q: "Browser shows “not found” on saviours.bazgateway.com",
    a: "Expected. The gateway has no HTML homepage — only POST /mcp and /api/*. Use www.saviours.xyz/gateway or the MCP / curl snippets.",
  },
  {
    q: "MCP GET /mcp returns 405",
    a: "MCP is POST-only. Add it via Claude/Cursor (Customer quick start), don’t open /mcp in a browser tab.",
  },
  {
    q: "check() / shieldCheck returns ALLOW or UNKNOWN on a “bad” address",
    a: "Only named threats BLOCK/WARN for $0. Unnamed addresses miss → call investigate (402 → pay on Base) or ask a human. UNKNOWN ≠ SAFE.",
  },
  {
    q: "investigate returns HTTP 402",
    a: "Correct unpaid invoice. The calling agent settles x402 USDC on Base (Bazantic grant), then retries. Memory hits stay free.",
  },
  {
    q: "npm install @saviours/check fails",
    a: "Don’t run npm inside the Saviours git repo (pnpm workspace — arborist crashes). Fresh folder: mkdir demo && cd demo && npm init -y && npm i @saviours/check. Need Node ≥ 20. Package is ESM-only (import / node --input-type=module), not require().",
  },
  {
    q: "cast / ENS read is empty",
    a: "Use Sepolia RPC, lowercase address in the name, and confirm the name exists. Unnamed addresses have no saviours.status text.",
  },
  {
    q: "MetaMask doesn’t open after BLOCK",
    a: "Intended. Shield stops the signature. Override must be an explicit click so the wallet keeps the user-gesture.",
  },
  {
    q: "CORS errors from my frontend",
    a: "Prefer @saviours/check ens mode (talks to Sepolia RPC, not our origin) or proxy shield/check through your backend.",
  },
];

/**
 * ENDGAME Phase 4 — /build
 * Agent · Wallet · Raw · Help — integrator-ready.
 */
export function BuildScreen({ onOpenDocs }: { onOpenDocs?: () => void }) {
  const [tab, setTab] = useState<Tab>("agent");
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      // ignore
    }
  }

  return (
    <section className="app-content rise">
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: "var(--t-floor)",
          letterSpacing: "0.1em",
          color: "var(--sig)",
        }}
      >
        BUILD · INTEGRATE
      </p>
      <h1
        style={{
          margin: "10px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: "var(--t-display)",
          fontWeight: 600,
          letterSpacing: "-0.03em",
          color: "var(--tx-hi)",
        }}
      >
        Two lines. Three modes. Zero excuses.
      </h1>
      <p
        style={{
          margin: "10px 0 0",
          maxWidth: 580,
          fontSize: "var(--t-sm)",
          lineHeight: 1.5,
          color: "var(--tx-lo)",
        }}
      >
        Agent MCP in one command. Wallet SDK on npm. Raw{" "}
        <code>cast</code> needs none of us.{" "}
        {onOpenDocs ? (
          <button
            type="button"
            onClick={onOpenDocs}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "var(--sig)",
              font: "inherit",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Full guide → Docs
          </button>
        ) : (
          <a href="#docs" style={link}>
            Full guide → Docs
          </a>
        )}
        {" · "}
        <a
          href="https://github.com/devhb1/Saviour/blob/main/docs/INTEGRATE.md"
          target="_blank"
          rel="noreferrer"
          style={link}
        >
          View on GitHub ↗
        </a>
        .
      </p>

      <div
        role="tablist"
        style={{
          display: "flex",
          gap: 6,
          marginTop: 28,
          marginBottom: 20,
          flexWrap: "wrap",
          borderBottom: "1px solid var(--line)",
          paddingBottom: 12,
        }}
      >
        {(
          [
            ["agent", "Agent"],
            ["recipe", "Recipe"],
            ["wallet", "Wallet / App"],
            ["raw", "Raw"],
            ["help", "Help"],
          ] as const
        ).map(([id, label]) => {
          const on = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(id)}
              style={{
                ...btnGhost,
                padding: "8px 14px",
                fontSize: 13,
                borderColor: on ? "var(--sig)" : "var(--line)",
                fontWeight: on ? 600 : 500,
                color: on ? "var(--tx-hi)" : "var(--tx-lo)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "agent" ? (
        <div style={{ maxWidth: 760 }}>
          <AgentQuickStart />
          <BazanticTiersTable />
          <Block
            title="Paste this policy into the agent"
            code={AGENT_POLICY}
            copied={copied === "prompt"}
            onCopy={() => void copy("prompt", AGENT_POLICY)}
          />
          <p style={hint}>
            Live gateway:{" "}
            <strong style={{ color: "var(--tx-hi)" }}>
              {MCP_TOOL_COUNT} MCP tools
            </strong>
            {" · "}
            agent recipes bind the safe subset only ·{" "}
            <code>shieldCheck</code> $0 forever (no payment handshake) ·{" "}
            <code>investigate</code> ~$0.01 · evidence/ask ~$0.05 ·
            dispute/revoke/eacProbe operator-only. OpenAPI{" "}
            <a href="https://www.saviours.xyz/openapi-saviours.json" style={link}>
              openapi-saviours.json
            </a>
            .
          </p>
          <BazanticRecipesList showPaste={false} />
          <SupportStrip />
        </div>
      ) : null}

      {tab === "recipe" ? (
        <div style={{ maxWidth: 760 }}>
          <p
            style={{
              margin: "0 0 14px",
              fontSize: "var(--t-sm)",
              color: "var(--tx)",
              lineHeight: 1.5,
              maxWidth: 640,
            }}
          >
            Lead recipe for judges:{" "}
            <code>investigate-once-explain</code> — real Graph fan-out + Saviours
            memory ($0 hit / pay on miss / optional evidence ask).{" "}
            <code>safe-swap-with-memory</code> below is an Uniswap-shaped{" "}
            <strong>fixture</strong> + live Shield — not a live Uniswap quote.
          </p>
          <BazanticRecipesList />
          <SafeSwapRecipePanel />
          <p style={{ ...hint, marginTop: 16 }}>
            All five are <strong style={{ color: "var(--tx-hi)" }}>PUBLISHED</strong>{" "}
            on Bazantic. Paste kit: <code>{BAZANTIC_PUBLISH_KIT}</code> · canonical
            core recipe <code>docs/recipes/saviours-check-before-sign.md</code>.
            Dashboard:{" "}
            <a
              href="https://bazantic.com/dashboard/recipes"
              target="_blank"
              rel="noreferrer"
              style={link}
            >
              bazantic.com/dashboard/recipes
            </a>
            .
          </p>
        </div>
      ) : null}

      {tab === "wallet" ? (
        <div style={{ maxWidth: 720 }}>
          <Block
            title="Fresh project · npm i @saviours/check"
            code={SDK}
            copied={copied === "sdk"}
            onCopy={() => void copy("sdk", SDK)}
          />
          <Block
            title="Pre-sign gate (wagmi / any wallet)"
            code={WAGMI_HOOK}
            copied={copied === "hook"}
            onCopy={() => void copy("hook", WAGMI_HOOK)}
          />
          <p style={hint}>
            Package:{" "}
            <a
              href="https://www.npmjs.com/package/@saviours/check"
              target="_blank"
              rel="noreferrer"
              style={link}
            >
              npmjs.com/package/@saviours/check
            </a>
            {" · "}
            Live demo: <strong>Playground → Wallet gate</strong>. Don’t install
            inside this monorepo — use a fresh folder (see snippet).
          </p>
          <SupportStrip />
        </div>
      ) : null}

      {tab === "raw" ? (
        <div style={{ maxWidth: 720 }}>
          <Block
            title="cast — no SDK, no API key, no us"
            code={CAST}
            copied={copied === "cast"}
            onCopy={() => void copy("cast", CAST)}
          />
          <p style={hint}>
            Resolver <code>0xF479…751c</code> · public Sepolia RPC · also{" "}
            <code>consumers/plain-shield.html</code>
          </p>
          <a
            href="/#hook"
            style={{ ...btnPrimary, display: "inline-block", textDecoration: "none" }}
          >
            Try the Hook →
          </a>
          <div style={{ marginTop: 24 }}>
            <SupportStrip />
          </div>
        </div>
      ) : null}

      {tab === "help" ? (
        <div style={{ maxWidth: 720 }}>
          <p style={{ ...hint, marginBottom: 20 }}>
            Common integrator issues. Full write-up:{" "}
            <a
              href="https://github.com/devhb1/Saviour/blob/main/docs/INTEGRATE.md"
              style={link}
            >
              docs/INTEGRATE.md
            </a>
            .
          </p>
          {FAQ.map((item) => (
            <div key={item.q} style={faqCard}>
              <p style={faqQ}>{item.q}</p>
              <p style={faqA}>{item.a}</p>
            </div>
          ))}
          <SupportStrip />
        </div>
      ) : null}
    </section>
  );
}

function SupportStrip() {
  return (
    <div style={supportBox}>
      <p style={supportTitle}>Need help integrating?</p>
      <p style={supportBody}>
        Email{" "}
        <a href="mailto:b4harshit01@gmail.com" style={link}>
          b4harshit01@gmail.com
        </a>
        {" · "}
        <a
          href="https://twitter.com/harshitb01"
          target="_blank"
          rel="noreferrer"
          style={link}
        >
          @harshitb01
        </a>
        {" · "}
        <a
          href="https://github.com/devhb1"
          target="_blank"
          rel="noreferrer"
          style={link}
        >
          github.com/devhb1
        </a>
        {" · "}
        <a
          href="https://github.com/devhb1/Saviour/issues"
          target="_blank"
          rel="noreferrer"
          style={link}
        >
          open an issue
        </a>
      </p>
      <p style={{ ...supportBody, marginTop: 8, color: "var(--tx-faint)" }}>
        Include stack (agent / wallet / HTTP), address checked, and response JSON
        (no secrets).
      </p>
    </div>
  );
}

function Block({
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
    <div style={blockShell}>
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
            fontSize: "var(--t-floor)",
            letterSpacing: "0.04em",
            color: "var(--tx)",
            lineHeight: 1.35,
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
            borderColor: "var(--line-mid)",
            color: "var(--tx-hi)",
            flexShrink: 0,
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre style={pre}>{code}</pre>
    </div>
  );
}

const blockShell: CSSProperties = {
  marginBottom: 22,
  border: "1px solid var(--line-mid)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-raise)",
  boxShadow: "var(--edge), var(--lift)",
  overflow: "hidden",
};

const pre: CSSProperties = {
  margin: 0,
  padding: "14px 16px",
  background: "var(--bg-inset)",
  border: "none",
  borderRadius: 0,
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-floor)",
  lineHeight: 1.5,
  overflow: "auto",
  color: "var(--tx-hi)",
  whiteSpace: "pre-wrap",
};

const hint: CSSProperties = {
  margin: "0 0 16px",
  fontSize: "var(--t-sm)",
  lineHeight: 1.5,
  color: "var(--tx-lo)",
};

const link: CSSProperties = {
  color: "var(--sig)",
};

const faqCard: CSSProperties = {
  marginBottom: 12,
  padding: "12px 14px",
  border: "1px solid var(--line-mid)",
  borderRadius: "var(--radius-md)",
  background: "var(--bg-raise)",
  boxShadow: "var(--edge), var(--lift)",
};

const faqQ: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-sm)",
  fontWeight: 600,
  color: "var(--tx-hi)",
  lineHeight: 1.35,
};

const faqA: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "var(--t-sm)",
  lineHeight: 1.45,
  color: "var(--tx-lo)",
};

const supportBox: CSSProperties = {
  marginTop: 28,
  padding: "16px 18px",
  border: "1px solid var(--sig-line)",
  borderRadius: "var(--radius-md)",
  background: "color-mix(in srgb, var(--sig) 6%, var(--surface))",
};

const supportTitle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-floor)",
  letterSpacing: "0.08em",
  color: "var(--sig)",
};

const supportBody: CSSProperties = {
  margin: "10px 0 0",
  fontSize: "var(--t-sm)",
  lineHeight: 1.5,
  color: "var(--tx-lo)",
};
