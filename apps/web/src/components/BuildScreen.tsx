"use client";

import { useState, type CSSProperties } from "react";
import { btnGhost, btnPrimary } from "./AppShell";
import { AgentQuickStart, AGENT_POLICY } from "./AgentQuickStart";
import { SafeSwapRecipePanel } from "./SafeSwapRecipePanel";

type Tab = "agent" | "recipe" | "wallet" | "raw" | "help";

const SDK = `pnpm add @saviours/check
# npm i @saviours/check

import { check, guard } from "@saviours/check";

const r = await check("0x935bfb495e33f74d2e9735df1da66ace442ede48");
// default ens mode · Sepolia · $0 · no our server
// { decision: "BLOCK", status: "TAINTED", … }

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
// POST https://saviour.bazgateway.com/api/shield/check`;

const CAST = `cast call 0xF479306621F718F7d76875f67506ceD33717751c \\
  "text(bytes32,string)(string)" \\
  $(cast namehash 0x935bfb495e33f74d2e9735df1da66ace442ede48.saviours.eth) \\
  "saviours.status" \\
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com
# → TAINTED`;

const FAQ: { q: string; a: string }[] = [
  {
    q: "Browser shows “not found” on saviour.bazgateway.com",
    a: "Expected. The gateway has no HTML homepage — only POST /mcp and /api/*. Use www.saviours.xyz/gateway or the MCP / curl snippets.",
  },
  {
    q: "MCP GET /mcp returns 405",
    a: "MCP is POST-only. Add it via Claude/Cursor (Customer quick start), don’t open /mcp in a browser tab.",
  },
  {
    q: "check() / shieldCheck returns ALLOW or UNKNOWN on a “bad” address",
    a: "Only named threats BLOCK for $0. Unnamed addresses miss → call investigate (402 → pay on Base) or ask a human. UNKNOWN ≠ SAFE.",
  },
  {
    q: "investigate returns HTTP 402",
    a: "Correct unpaid invoice. The calling agent settles x402 USDC on Base (Bazantic grant), then retries. Memory hits stay free.",
  },
  {
    q: "npm install @saviours/check fails",
    a: "Need Node ≥ 20. Package: npmjs.com/package/@saviours/check. Try pnpm add @saviours/check@0.1.0 and clear the store if needed.",
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
export function BuildScreen() {
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
        <code>cast</code> needs none of us. Full guide:{" "}
        <a href="https://github.com/devhb1/Saviour/blob/main/docs/INTEGRATE.md" style={link}>
          docs/INTEGRATE.md
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
          <Block
            title="Paste this policy into the agent"
            code={AGENT_POLICY}
            copied={copied === "prompt"}
            onCopy={() => void copy("prompt", AGENT_POLICY)}
          />
          <p style={hint}>
            Live gateway: <strong style={{ color: "var(--tx-hi)" }}>15 tools</strong>
            {" · "}
            <code>shieldCheck</code> $0 forever (no payment handshake) ·{" "}
            <code>investigate</code> metered · dispute/revoke operator-only.
            OpenAPI{" "}
            <a href="https://www.saviours.xyz/openapi-saviours.json" style={link}>
              openapi-saviours.json
            </a>
            . Recipes: <code>saviour-check-before-sign</code> ·{" "}
            <code>safe-swap-with-memory</code> (multi-service).
          </p>
          <SupportStrip />
        </div>
      ) : null}

      {tab === "recipe" ? (
        <div style={{ maxWidth: 760 }}>
          <SafeSwapRecipePanel />
          <p style={{ ...hint, marginTop: 16 }}>
            Register both recipes at{" "}
            <a
              href="https://bazantic.com/dashboard/recipes/new"
              target="_blank"
              rel="noreferrer"
              style={link}
            >
              bazantic.com/dashboard/recipes/new
            </a>
            . Paste from{" "}
            <code>docs/recipes/safe-swap-with-memory.md</code> and{" "}
            <code>docs/recipes/saviours-agent-shield.md</code>.
          </p>
        </div>
      ) : null}

      {tab === "wallet" ? (
        <div style={{ maxWidth: 720 }}>
          <Block
            title="pnpm add @saviours/check  ·  npm i @saviours/check"
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
            Live demo: <strong>Playground → Wallet gate</strong>.
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
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: "var(--t-floor)",
            letterSpacing: "0.06em",
            color: "var(--tx-faint)",
          }}
        >
          {title}
        </p>
        <button
          type="button"
          onClick={onCopy}
          style={{ ...btnGhost, padding: "6px 10px", fontSize: 12 }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre style={pre}>{code}</pre>
    </div>
  );
}

const pre: CSSProperties = {
  margin: 0,
  padding: "14px 16px",
  background: "var(--bg-inset)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md)",
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
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  background: "var(--surface)",
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
