import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gateway · SAVIOURS",
  description:
    "Bazantic agent gateway for Saviours — MCP and REST. The bare host has no HTML page; use /mcp and /api/*.",
};

const MCP = "https://saviour.bazgateway.com/mcp";
const SHIELD = "https://saviour.bazgateway.com/api/shield/check";
const INVESTIGATE = "https://saviour.bazgateway.com/api/investigate";
const OPENAPI = "https://www.saviours.xyz/openapi-saviours.json";

/**
 * Human landing for “Gateway” links.
 * Bazantic serves POST-only APIs at saviour.bazgateway.com — GET / returns 404.
 */
export default function GatewayPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 20px 64px",
        maxWidth: 720,
        margin: "0 auto",
        fontFamily: "var(--font-mono, ui-monospace, monospace)",
        color: "var(--tx-hi, #e8eaef)",
        background: "var(--bg-base, #0b0d10)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          letterSpacing: "0.12em",
          color: "var(--sig, #4c8dff)",
        }}
      >
        SAVIOURS · AGENT GATEWAY
      </p>
      <h1
        style={{
          margin: "12px 0 0",
          fontFamily: "var(--font-display, Georgia, serif)",
          fontSize: "clamp(28px, 5vw, 40px)",
          fontWeight: 600,
          letterSpacing: "-0.03em",
          lineHeight: 1.15,
        }}
      >
        The gateway is an API — not a website.
      </h1>
      <p
        style={{
          margin: "14px 0 0",
          fontSize: 14,
          lineHeight: 1.55,
          color: "var(--tx-lo, #9aa3b2)",
          maxWidth: 560,
        }}
      >
        Visiting{" "}
        <code style={{ color: "var(--tx-hi, #e8eaef)" }}>
          https://saviour.bazgateway.com/
        </code>{" "}
        returns <strong>not found</strong> on purpose. Bazantic only accepts{" "}
        <strong>POST</strong> to MCP and REST paths. Use the links below.
      </p>

      <section style={{ marginTop: 36 }}>
        <Row label="MCP (Claude / Cursor)" value={MCP} />
        <Row label="Shield $0" value={SHIELD} hint="POST JSON · memory hit" />
        <Row
          label="Investigate"
          value={INVESTIGATE}
          hint="POST · unpaid → HTTP 402 x402 on Base"
        />
        <Row label="OpenAPI" value={OPENAPI} />
      </section>

      <pre
        style={{
          marginTop: 28,
          padding: 16,
          border: "1px solid var(--line, #2a3038)",
          borderRadius: 8,
          background: "var(--bg-inset, #12151a)",
          fontSize: 12,
          lineHeight: 1.5,
          overflow: "auto",
          whiteSpace: "pre-wrap",
        }}
      >{`claude mcp add --transport http saviour ${MCP}

# smoke
curl -sS -X POST ${SHIELD} \\
  -H 'content-type: application/json' \\
  -d '{"chainId":1,"address":"0x935bfb495e33f74d2e9735df1da66ace442ede48","registryNetwork":"sepolia"}'`}</pre>

      <p style={{ marginTop: 28, fontSize: 13 }}>
        <Link href="/#build" style={{ color: "var(--sig, #4c8dff)" }}>
          ← Build · Customer quick start
        </Link>
        {" · "}
        <Link href="/" style={{ color: "var(--sig, #4c8dff)" }}>
          Home
        </Link>
      </p>

      <p
        style={{
          marginTop: 32,
          fontSize: 12,
          lineHeight: 1.5,
          color: "var(--tx-faint, #6b7380)",
        }}
      >
        Support:{" "}
        <a href="mailto:b4harshit01@gmail.com" style={{ color: "var(--sig, #4c8dff)" }}>
          b4harshit01@gmail.com
        </a>
        {" · "}
        <a
          href="https://twitter.com/harshitb01"
          style={{ color: "var(--sig, #4c8dff)" }}
        >
          @harshitb01
        </a>
        {" · "}
        <a href="https://github.com/devhb1" style={{ color: "var(--sig, #4c8dff)" }}>
          github.com/devhb1
        </a>
      </p>
    </main>
  );
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          letterSpacing: "0.08em",
          color: "var(--tx-faint, #6b7380)",
        }}
      >
        {label}
        {hint ? ` · ${hint}` : ""}
      </p>
      <a
        href={value}
        style={{
          display: "inline-block",
          marginTop: 6,
          fontSize: 13,
          color: "var(--sig, #4c8dff)",
          wordBreak: "break-all",
        }}
      >
        {value}
      </a>
    </div>
  );
}
