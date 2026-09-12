import type { Metadata } from "next";
import Link from "next/link";
import {
  BAZANTIC_GATEWAY_DEFAULT,
  BAZANTIC_MCP_DEFAULT,
  BAZANTIC_RECIPES,
  BAZANTIC_TIERS,
  MCP_TOOL_COUNT,
} from "../../lib/bazanticGateway";

export const metadata: Metadata = {
  title: "Gateway",
  description:
    "Bazantic agent gateway for Saviours — MCP and REST. Memory hit $0 forever. Free / ~$0.01 / ~$0.05 tiers.",
};

const MCP = BAZANTIC_MCP_DEFAULT;
const SHIELD = `${BAZANTIC_GATEWAY_DEFAULT}/api/shield/check`;
const INVESTIGATE = `${BAZANTIC_GATEWAY_DEFAULT}/api/investigate`;
const EVIDENCE = `${BAZANTIC_GATEWAY_DEFAULT}/api/evidence`;
const ASK = `${BAZANTIC_GATEWAY_DEFAULT}/api/case/ask`;
const OPENAPI = "https://www.saviours.xyz/openapi-saviours.json";

/**
 * Human landing for “Gateway” links.
 * Bazantic serves POST-only APIs at saviours.bazgateway.com — GET / returns 404.
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 8,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/saviours-mark-glow.png"
          alt=""
          width={44}
          height={44}
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            display: "block",
          }}
        />
        <div>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-display, Georgia, serif)",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              color: "var(--tx-hi, #e8eaef)",
            }}
          >
            saviours
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 11,
              letterSpacing: "0.12em",
              color: "var(--sig, #4c8dff)",
            }}
          >
            AGENT GATEWAY
          </p>
        </div>
      </div>
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
          https://saviours.bazgateway.com/
        </code>{" "}
        returns <strong>not found</strong> on purpose. Bazantic only accepts{" "}
        <strong>POST</strong> to MCP and REST paths. Use the links below.
      </p>

      <section style={{ marginTop: 36 }}>
        <Row
          label={`MCP (${MCP_TOOL_COUNT} tools)`}
          value={MCP}
          hint="POST only · browser GET = 405"
        />
        <Row label="Shield $0" value={SHIELD} hint="POST JSON · memory hit · Free" />
        <Row
          label="Investigate ~$0.01"
          value={INVESTIGATE}
          hint="POST · unpaid → HTTP 402 · Standard"
        />
        <Row
          label="Evidence ~$0.05"
          value={EVIDENCE}
          hint="POST body {chainId,address} · Complex"
        />
        <Row
          label="Ask case ~$0.05"
          value={ASK}
          hint="POST body {address,question} · Complex"
        />
        <Row label="OpenAPI" value={OPENAPI} />
      </section>

      <section style={{ marginTop: 28 }}>
        <p
          style={{
            margin: "0 0 10px",
            fontSize: 11,
            letterSpacing: "0.08em",
            color: "var(--tx-faint, #6b7380)",
          }}
        >
          PRICING TIERS
        </p>
        {BAZANTIC_TIERS.map((t) => (
          <p
            key={t.id}
            style={{
              margin: "0 0 8px",
              fontSize: 13,
              lineHeight: 1.45,
              color: "var(--tx-lo, #9aa3b2)",
            }}
          >
            <strong style={{ color: "var(--tx-hi, #e8eaef)" }}>{t.label}</strong>{" "}
            {t.price} — {t.routes}
          </p>
        ))}
      </section>

      <section style={{ marginTop: 24 }}>
        <p
          style={{
            margin: "0 0 10px",
            fontSize: 11,
            letterSpacing: "0.08em",
            color: "var(--tx-faint, #6b7380)",
          }}
        >
          PUBLISHED RECIPES · 5
        </p>
        {BAZANTIC_RECIPES.map((r) => (
          <p
            key={r.handle}
            style={{
              margin: "0 0 8px",
              fontSize: 13,
              lineHeight: 1.45,
              color: "var(--tx-lo, #9aa3b2)",
            }}
          >
            <code style={{ color: "var(--tx-hi, #e8eaef)" }}>{r.handle}</code>{" "}
            · {r.role} · {r.spend}
          </p>
        ))}
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
      >{`claude mcp add --transport http saviours ${MCP}

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
