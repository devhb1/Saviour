"use client";

import type { CSSProperties, ReactNode } from "react";
import { Button } from "../ui";
import { UnderHoodDiagrams } from "./UnderHoodDiagrams";
import { WhatWeDont } from "./WhatWeDont";

/**
 * On-product docs — why we exist, how it works, honesty, differentiation.
 * Full Phase-5 depth can expand; this is the nav destination scaffold.
 */
export function DocsScreen({
  onOpenLive,
  onOpenBuild,
  onOpenRegistry,
}: {
  onOpenLive?: () => void;
  onOpenBuild?: () => void;
  onOpenRegistry?: () => void;
}) {
  return (
    <section className="rise" style={{ maxWidth: 820 }}>
      <p style={eyebrow}>DOCS · WHY THIS EXISTS</p>
      <h1
        style={{
          margin: "12px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: "var(--t-display)",
          fontWeight: 500,
          letterSpacing: "-0.03em",
          color: "var(--tx-hi)",
          lineHeight: 1.1,
        }}
      >
        An agent is about to sign with an address that already drained a protocol.
      </h1>
      <p style={lead}>
        Nobody tells it. Private scanners stay private. We investigate once on The
        Graph, name the finding on ENS, and every agent after that resolves for free —
        with no SDK and no server of ours in the path.
      </p>

      <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 10 }}>
        {onOpenLive ? (
          <Button onClick={onOpenLive}>Run it live →</Button>
        ) : null}
        {onOpenBuild ? (
          <Button variant="ghost" onClick={onOpenBuild}>
            Integrate
          </Button>
        ) : null}
      </div>

      <DocBlock title="What this is">
        Public, evidence-backed threat memory for counterparties. Readable via ENS by
        anything that speaks RPC. Shield checks stay $0 forever; only a fresh
        investigation is metered by Bazantic (~$0.01 on Base).
      </DocBlock>

      <DocBlock title="The loop">
        <ol style={list}>
          <li>
            <strong style={{ color: "var(--tx-hi)" }}>Investigate</strong> — Messari
            1×8 + Adapter A → deterministic signals → AI cites → validator decides.
          </li>
          <li>
            <strong style={{ color: "var(--tx-hi)" }}>Name</strong> — only WATCH /
            TAINTED →{" "}
            <code style={code}>&lt;addr&gt;.saviours.eth</code> on Sepolia ENSv2.
          </li>
          <li>
            <strong style={{ color: "var(--tx-hi)" }}>Resolve</strong> — Shield / cast /
            MCP / Bazantic · 0 Graph · 0 AI · $0 on MEMORY HIT.
          </li>
        </ol>
      </DocBlock>

      <div style={{ marginTop: 32 }}>
        <p style={eyebrow}>UNDER THE HOOD</p>
        <div style={{ marginTop: 14 }}>
          <UnderHoodDiagrams />
        </div>
      </div>

      <DocBlock title="Why not the alternatives">
        <ul style={list}>
          <li>
            <strong style={{ color: "var(--tx-hi)" }}>≠ NpmGuard</strong> — packages ≠
            live attackers signing transactions.
          </li>
          <li>
            <strong style={{ color: "var(--tx-hi)" }}>≠ Mandate</strong> — leash on{" "}
            <em>your</em> agent ≠ naming the counterparty.
          </li>
          <li>
            <strong style={{ color: "var(--tx-hi)" }}>≠ Immunity</strong> — LLM opinion
            behind a paid SDK ≠ Graph evidence under a castable name.
          </li>
        </ul>
      </DocBlock>

      <DocBlock title="Proofs you can check">
        <ul style={list}>
          <li>
            Heroes: ATTACK-1 → TAINTED / BLOCK · BOT-1 → WATCH / WARN (Graph-verified).
          </li>
          <li>
            Cast{" "}
            <code style={code}>saviours.status</code> on Sepolia — no our server.
          </li>
          <li>
            Bazantic: Probe $0 → 402 invoice → pay on Base (local{" "}
            <code style={code}>pnpm dev</code> + film-base).
          </li>
          <li>
            Fleet Run on Live — pick a threat class, Shield a batch; misses stay
            misses.
          </li>
          {onOpenRegistry ? (
            <li>
              <button type="button" onClick={onOpenRegistry} style={linkBtn}>
                Open Registry →
              </button>{" "}
              Graph-verified gallery · Live·Remember · Provenance honesty.
            </li>
          ) : null}
        </ul>
      </DocBlock>

      <div style={{ marginTop: 28 }}>
        <WhatWeDont compact />
      </div>

      <DocBlock title="Track claims (artifacts, not adjectives)">
        <ul style={list}>
          <li>
            <strong style={{ color: "var(--tx-hi)" }}>ENS</strong> — PermissionedResolver
            · EAC roles · cast without our app.
          </li>
          <li>
            <strong style={{ color: "var(--tx-hi)" }}>Graph</strong> — 1 Messari template
            × 8 deployments · AI cites · code decides.
          </li>
          <li>
            <strong style={{ color: "var(--tx-hi)" }}>Bazantic</strong> — shieldCheck $0 ·
            investigate x402 · recipe check-before-sign.
          </li>
        </ul>
      </DocBlock>
    </section>
  );
}

function DocBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginTop: 36 }}>
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--tx-hi)",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          marginTop: 12,
          fontSize: 15,
          color: "var(--tx)",
          lineHeight: 1.55,
        }}
      >
        {children}
      </div>
    </div>
  );
}

const eyebrow: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.1em",
  color: "var(--sig)",
};

const lead: CSSProperties = {
  margin: "14px 0 0",
  fontSize: 16,
  color: "var(--tx-lo)",
  lineHeight: 1.55,
  maxWidth: 640,
};

const list: CSSProperties = {
  margin: 0,
  paddingLeft: 20,
  display: "grid",
  gap: 10,
};

const code: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--sig-hi)",
};

const linkBtn: CSSProperties = {
  border: "none",
  background: "none",
  padding: 0,
  color: "var(--sig)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "inherit",
  textDecoration: "underline",
  textUnderlineOffset: 3,
};
