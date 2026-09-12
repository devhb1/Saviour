"use client";

import { useState, type CSSProperties } from "react";
import { btnGhost } from "./AppShell";
import {
  BAZANTIC_GATEWAY_DEFAULT,
  BAZANTIC_MCP_DEFAULT,
  MCP_AGENT_SAFE_TOOLS,
  MCP_TOOL_COUNT,
} from "../lib/bazanticGateway";

const MCP_URL = BAZANTIC_MCP_DEFAULT;
const OPENAPI = "https://www.saviours.xyz/openapi-saviours.json";
const GW = BAZANTIC_GATEWAY_DEFAULT;
const SAFE_TOOLS_JSON = JSON.stringify([...MCP_AGENT_SAFE_TOOLS], null, 2);

type QuickId = "claude" | "cursor" | "openai" | "custom" | "cli";

const QUICK: {
  id: QuickId;
  label: string;
  mark: string;
  title: string;
  body: string;
  note?: string;
}[] = [
  {
    id: "claude",
    label: "Add to Claude",
    mark: "✶",
    title: "SAVIOUR",
    body: `claude mcp add --transport http saviours ${MCP_URL}`,
    note: "Then paste the check-before-sign policy (copy below the panel).",
  },
  {
    id: "cursor",
    label: "Add to Cursor",
    mark: "⌘",
    title: "mcp.json",
    body: `{
  "mcpServers": {
    "saviours": {
      "url": "${MCP_URL}"
    }
  }
}`,
    note: "Cursor Settings → MCP → paste. Restart MCP after save.",
  },
  {
    id: "openai",
    label: "ChatGPT / Codex",
    mark: "◎",
    title: "OpenAPI + policy",
    body: `# ChatGPT custom GPT → Actions → Import from URL
${OPENAPI}

# Codex / Agents SDK — same REST (or MCP URL below)
MCP: ${MCP_URL}
POST ${GW}/api/shield/check
POST ${GW}/api/investigate

# Minimal Action body (shield)
{"chainId":1,"address":"0x935bfb495e33f74d2e9735df1da66ace442ede48","registryNetwork":"sepolia"}`,
    note: "OpenAPI import verified live. Wire shieldCheck first; investigate returns 402 until x402 settles.",
  },
  {
    id: "custom",
    label: "Custom MCP",
    mark: "⬡",
    title: "Remote MCP",
    body: `{
  "name": "saviours",
  "transport": "http",
  "url": "${MCP_URL}",
  "tools": ${SAFE_TOOLS_JSON}
}`,
    note: `MCP exposes ${MCP_TOOL_COUNT} tools; agent recipes bind this safe subset only — never dispute / revoke / eacProbe.`,
  },
  {
    id: "cli",
    label: "CLI",
    mark: "›",
    title: "curl",
    body: `# $0 memory — ATTACK-1 → BLOCK
curl -sS -X POST ${GW}/api/shield/check \\
  -H 'content-type: application/json' \\
  -d '{"chainId":1,"address":"0x935bfb495e33f74d2e9735df1da66ace442ede48","registryNetwork":"sepolia"}'

# Miss → HTTP 402 (agent settles on Base, then retries)
curl -sS -X POST ${GW}/api/investigate \\
  -H 'content-type: application/json' \\
  -d '{"chainId":1,"address":"0x1111111111111111111111111111111111111113","forceFresh":true,"registryNetwork":"sepolia"}'`,
  },
];

export const AGENT_POLICY = `Before any transfer, approve, or swap to an EVM address:
1. Call MCP tool shieldCheck with requestBody { chainId: 1, address, registryNetwork: "sepolia" }.
2. If decision is BLOCK or WARN → CANCEL. Do not sign. Cost must be $0 (memory hit).
3. If miss / ESCALATE → call investigate (HTTP 402 → settle x402 on Base via Bazantic grant) OR ask the human.
4. Optional: ENS text saviours.status on <lowercase-addr>.saviours.eth via public Sepolia RPC.
Never invent TAINTED. Never treat UNKNOWN as SAFE. Never pay for a memory hit.`;

/**
 * Bazantic-style customer quick start — platform pills + one copyable snippet.
 */
export function AgentQuickStart() {
  const [active, setActive] = useState<QuickId>("claude");
  const [copied, setCopied] = useState(false);
  const item = QUICK.find((q) => q.id === active) ?? QUICK[0];

  async function copyBody() {
    try {
      await navigator.clipboard.writeText(item.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  return (
    <div style={shell} className="rise">
      <div style={headerRow}>
        <p style={eyebrow}>Customer quick start</p>
        <a
          href="https://www.saviours.xyz/gateway"
          target="_blank"
          rel="noreferrer"
          style={gatewayLink}
        >
          Gateway guide ↗
        </a>
      </div>

      <div style={pillRow} role="tablist" aria-label="Add Saviours to an agent">
        {QUICK.map((q) => {
          const on = q.id === active;
          return (
            <button
              key={q.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                setActive(q.id);
                setCopied(false);
              }}
              style={{
                ...pill,
                background: on ? "var(--tx-hi)" : "transparent",
                color: on ? "var(--bg-base)" : "var(--tx-lo)",
                borderColor: on ? "var(--tx-hi)" : "var(--line)",
              }}
            >
              <span style={pillMark} aria-hidden>
                {q.mark}
              </span>
              {q.label}
            </button>
          );
        })}
      </div>

      <div style={snippetCard}>
        <div style={snippetHead}>
          <span style={snippetTitle}>{item.title}</span>
          <button type="button" onClick={() => void copyBody()} style={copyBtn}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre style={snippetPre}>{item.body}</pre>
      </div>

      {item.note ? <p style={note}>{item.note}</p> : null}
    </div>
  );
}

const shell: CSSProperties = {
  marginTop: 8,
  marginBottom: 28,
  padding: "18px 18px 16px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  background:
    "linear-gradient(165deg, color-mix(in srgb, var(--sig) 6%, var(--surface)) 0%, var(--surface) 55%)",
  maxWidth: 760,
};

const headerRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
  marginBottom: 14,
};

const eyebrow: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-floor)",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--sig)",
};

const gatewayLink: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-floor)",
  color: "var(--tx-faint)",
  textDecoration: "none",
};

const pillRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 14,
};

const pill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "8px 12px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-chip)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: "0.02em",
  cursor: "pointer",
  transition: "background 120ms ease, color 120ms ease, border-color 120ms ease",
};

const pillMark: CSSProperties = {
  opacity: 0.85,
  fontSize: 13,
};

const snippetCard: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  overflow: "hidden",
  background: "var(--bg-inset)",
};

const snippetHead: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "10px 14px",
  borderBottom: "1px solid var(--line)",
  background: "color-mix(in srgb, var(--bg-raise) 80%, transparent)",
};

const snippetTitle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-floor)",
  letterSpacing: "0.08em",
  color: "var(--tx-hi)",
  fontWeight: 600,
};

const copyBtn: CSSProperties = {
  ...btnGhost,
  padding: "5px 10px",
  fontSize: 11,
};

const snippetPre: CSSProperties = {
  margin: 0,
  padding: "14px 16px",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-floor)",
  lineHeight: 1.55,
  color: "var(--tx-hi)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  overflow: "auto",
  maxHeight: 280,
};

const note: CSSProperties = {
  margin: "10px 0 0",
  fontSize: "var(--t-sm)",
  lineHeight: 1.4,
  color: "var(--tx-lo)",
};
