"use client";

import { useState, type CSSProperties } from "react";
import { btnGhost, btnPrimary } from "./AppShell";

type Tab = "agent" | "wallet" | "raw";

const MCP_CLAUDE = `claude mcp add --transport http saviour https://saviour.bazgateway.com/mcp`;

const MCP_CURSOR = `{
  "mcpServers": {
    "saviour": {
      "url": "https://saviour.bazgateway.com/mcp"
    }
  }
}`;

const AGENT_PROMPT = `Before any transfer, approve, or swap to an EVM address:
1. Call shieldCheck / check_target (chainId 1, registryNetwork sepolia).
2. If BLOCK or WARN → CANCEL. Do not sign. Cost must be $0.
3. If miss → investigate (402 → settle x402 on Base) or ask the human.
4. Optional: verify ENS text saviours.status on <addr>.saviours.eth via public Sepolia RPC.
Never invent TAINTED. Never treat UNKNOWN as SAFE. Never pay for a memory hit.`;

const SDK = `import { check, guard } from "@saviours/check";

const r = await check("0x935bfb495e33f74d2e9735df1da66ace442ede48");
// { decision: "BLOCK", status: "TAINTED", cost: { graph: 0, ai: 0, usd: 0 } }

await guard(addr); // throws on BLOCK`;

const WAGMI_HOOK = `// Before sendTransaction / signTypedData
import { check } from "@saviours/check";

async function gatedSend(to: string, send: () => Promise<string>) {
  const r = await check(to); // ens mode · $0 · no our server
  if (r.decision === "BLOCK" || r.decision === "WARN") {
    throw new Error(\`Saviours \${r.decision}: \${r.status}\`);
  }
  return send();
}`;

const CAST = `cast call 0xF479306621F718F7d76875f67506ceD33717751c \\
  "text(bytes32,string)(string)" \\
  $(cast namehash 0x935bfb495e33f74d2e9735df1da66ace442ede48.saviours.eth) \\
  "saviours.status" \\
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com
# → TAINTED`;

/**
 * ENDGAME Phase 4 — /build
 * Three tabs. Each ≤60s to a working call.
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
          maxWidth: 560,
          fontSize: "var(--t-sm)",
          lineHeight: 1.5,
          color: "var(--tx-lo)",
        }}
      >
        Agent MCP in one command. Wallet SDK in two lines. Raw{" "}
        <code>cast</code> needs none of us.
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
            ["wallet", "Wallet / App"],
            ["raw", "Raw"],
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
        <div style={{ maxWidth: 720 }}>
          <Block
            title="1. Add MCP (Claude)"
            code={MCP_CLAUDE}
            copied={copied === "claude"}
            onCopy={() => void copy("claude", MCP_CLAUDE)}
          />
          <Block
            title="2. Or Cursor MCP JSON"
            code={MCP_CURSOR}
            copied={copied === "cursor"}
            onCopy={() => void copy("cursor", MCP_CURSOR)}
          />
          <Block
            title="3. Paste this policy into the agent"
            code={AGENT_PROMPT}
            copied={copied === "prompt"}
            onCopy={() => void copy("prompt", AGENT_PROMPT)}
          />
          <p style={hint}>
            Full skill file: <code>SKILL.md</code> at the repo root. Gateway:{" "}
            <a href="https://saviour.bazgateway.com" style={link}>
              saviour.bazgateway.com
            </a>
            . Published Bazantic recipe:{" "}
            <strong style={{ color: "var(--tx-hi)" }}>saviour-check-before-sign</strong>{" "}
            (shield first · cancel on BLOCK · $0 memory).
          </p>
        </div>
      ) : null}

      {tab === "wallet" ? (
        <div style={{ maxWidth: 720 }}>
          <Block
            title="pnpm add @saviours/check"
            code={SDK}
            copied={copied === "sdk"}
            onCopy={() => void copy("sdk", SDK)}
          />
          <Block
            title="Pre-sign gate (any wallet / wagmi app)"
            code={WAGMI_HOOK}
            copied={copied === "hook"}
            onCopy={() => void copy("hook", WAGMI_HOOK)}
          />
          <p style={hint}>
            Live demo: <strong>Playground → Wallet gate</strong> — MetaMask never
            opens on BLOCK. Browser extension is V2.
          </p>
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
          <a href="/#hook" style={{ ...btnPrimary, display: "inline-block", textDecoration: "none" }}>
            Try the Hook →
          </a>
        </div>
      ) : null}
    </section>
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
        <button type="button" onClick={onCopy} style={{ ...btnGhost, padding: "6px 10px", fontSize: 12 }}>
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
