"use client";

import type { CSSProperties } from "react";
import { CoverageStrip, btnGhost } from "./AppShell";

const CAST_ATTACK_1 = `cast call 0xF479306621F718F7d76875f67506ceD33717751c \\
  "text(bytes32,string)(string)" \\
  $(cast namehash 0x935bfb495e33f74d2e9735df1da66ace442ede48.savioursqsy56o.eth) \\
  "saviours.status"`;

export function DevelopersScreen() {
  return (
    <section className="rise">
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: 28,
          fontWeight: 500,
        }}
      >
        Developers
      </h2>
      <p style={{ margin: "8px 0 0", color: "var(--ink-muted)", maxWidth: 560 }}>
        Resolve with none of our Next code — ENS text records, plain shield, or MCP.
        This page is the under-the-hood surface for judges and integrators.
      </p>

      <div style={cardGrid}>
        <div style={card}>
          <p style={cardEyebrow}>SDK-less read</p>
          <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5 }}>
            Any agent that can call ENS <code>text()</code> can check{" "}
            <code>saviours.status</code> on{" "}
            <code>&lt;address&gt;.savioursqsy56o.eth</code>. No API key. No our
            server.
          </p>
          <pre style={pre}>{CAST_ATTACK_1}</pre>
        </div>

        <div style={card}>
          <p style={cardEyebrow}>MCP · check_target</p>
          <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5 }}>
            ENS-first Shield. Returns BLOCK / WARN / ALLOW / ESCALATE. Never Graph,
            never AI on the hot path.
          </p>
          <p style={{ margin: "10px 0 0", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            packages/mcp · tool check_target
          </p>
        </div>

        <div style={card}>
          <p style={cardEyebrow}>Plain shield</p>
          <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5 }}>
            Static HTML / cast path for film and agents that refuse Next.js. Memory
            check only — 0 Graph · 0 AI.
          </p>
          <p style={{ margin: "10px 0 0", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            Shield tab · /api/shield/check
          </p>
        </div>

        <div style={card}>
          <p style={cardEyebrow}>Trust · EAC</p>
          <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5 }}>
            PermissionedResolver roles are caps, not decentralization. Registry tab
            → Prove EAC revert shows investigator cannot write dispute texts.
          </p>
        </div>
      </div>

          <div style={{ marginTop: 20 }}>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.location.hash = "legacy";
              }}
              style={{ ...btnGhost }}
            >
              Open legacy Investigate / Resolve / Govern
            </button>
          </div>

      <CoverageStrip />
    </section>
  );
}

const cardGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
  marginTop: 22,
};

const card: CSSProperties = {
  padding: 16,
  border: "1px solid var(--line)",
  borderRadius: 4,
  background: "rgba(255,255,255,0.45)",
};

const cardEyebrow: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.06em",
  color: "var(--ink-muted)",
  textTransform: "uppercase",
};

const pre: CSSProperties = {
  margin: "12px 0 0",
  padding: 12,
  background: "rgba(14,18,16,0.92)",
  color: "#d5ded7",
  borderRadius: 4,
  overflow: "auto",
  fontSize: 11,
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
};
