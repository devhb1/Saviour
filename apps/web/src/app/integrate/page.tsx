import type { CSSProperties } from "react";
import Link from "next/link";
import { ProductChrome } from "../../components/ProductChrome";

/**
 * In-app integrate guide — how products / teams wire Saviour in.
 */
export default function IntegratePage() {
  return (
    <ProductChrome active="integrate">
      <main className="cp-tool" style={{ maxWidth: 880 }}>
        <p className="cp-tool-eyebrow">// INTEGRATE</p>
        <h1 className="cp-tool-h1">Add Saviour to your stack</h1>
        <p className="cp-tool-lead">
          Same engine for humans and machines: Audit a Safe, Review a payload,
          optionally check Intent in CI. You keep signing in Safe — we never
          auto-block.
        </p>

        <section style={section}>
          <h2 style={h2}>Pick your path (≤60s)</h2>
          <div style={pathGrid}>
            <PathCard
              title="Treasury ops"
              body="Use the web app. No install."
              href="/audit"
              cta="Open Audit"
            />
            <PathCard
              title="Co-signer"
              body="Open a shared Audit/Review link. Verify Freshness + hash."
              href="/docs"
              cta="Read Docs"
            />
            <PathCard
              title="Wallet / backend"
              body="npm @saviours/check or GET /api/audit before you show Sign."
              href="#sdk"
              cta="SDK + API"
            />
            <PathCard
              title="CI / permissions repo"
              body="Intent YAML (token amounts) — fail PRs that exceed policy."
              href="#ci"
              cta="Intent CI"
            />
          </div>
        </section>

        <section style={section} id="cli">
          <h2 style={h2}>1 · CLI (ops & auditors)</h2>
          <pre className="cp-evidence">{`# In the Saviour monorepo (or your checkout)
export ETH_RPC_URL=https://your-mainnet-rpc   # recommended in prod

pnpm audit:cli --safe 0xYourSafe
pnpm reach:cli --safe 0xYourSafe --out report.json
pnpm review:cli --json ./safe-tx.json          # include Safe UI hash
pnpm intent:cli --intent ./intent.json`}</pre>
          <p style={monoNote}>
            Golden report format: Findings · Coverage · Freshness · Reach.
            Re-run with the same Safe to re-verify.
          </p>
        </section>

        <section style={section} id="sdk">
          <h2 style={h2}>2 · SDK — wire into your product</h2>
          <p style={body}>
            Install in a wallet, Safe App backend, monitoring bot, or audit
            tooling:
          </p>
          <pre className="cp-evidence">{`npm i @saviours/check
# or: pnpm add @saviours/check`}</pre>
          <pre className="cp-evidence">{`import {
  auditSafe,
  assessAndExplain,
  checkIntent,
  parseIntentJson,
  goldenReportJson,
} from "@saviours/check";

// Standing authority (no pending tx required)
const audit = await auditSafe({
  safeAddress: "0x…",
  chainId: 1,
});
if (!audit.coverage.complete) {
  // show Coverage gaps — do not imply SAFE
}
for (const p of audit.reach?.principals ?? []) {
  // p.verdict: BOUNDED | UNBOUNDED | UNKNOWN
}

// Pre-sign Delta evidence
const assessed = await assessAndExplain({
  kind: "SAFE_TRANSACTION",
  chainId: 1,
  safeAddress: "0x…",
  safeVersion: "1.3.0",
  safeTx: { /* from Safe UI export */ },
  expectedSafeTxHash: "0x…", // MUST be independent (Safe UI) — never self-MATCH
});
// assessed.integrity · privilegeDiff · explanation

// Optional: ship a stable JSON blob to co-signers
const blob = goldenReportJson(audit);`}</pre>
          <p style={body}>
            <strong>Product rule:</strong> surface{" "}
            <code>coverage.gaps</code> and never map empty findings → “safe to
            sign.”
          </p>
        </section>

        <section style={section} id="api">
          <h2 style={h2}>3 · HTTP API (this app)</h2>
          <pre className="cp-evidence">{`# Baseline audit + Reach preview
GET /api/audit?safe=0x…&chainId=1

# Optional known role members / Nov16-style suspect flag
GET /api/audit?safe=0x…&member=0x…&suspectFreeRecipient=1

# Live Delay/Safe controls for Privilege Diff before-state
GET /api/review/controls?safe=0x…&delay=0x…`}</pre>
          <p style={monoNote}>
            Mainnet only for control reads. Set ETH_RPC_URL on the host.
          </p>
        </section>

        <section style={section} id="ci">
          <h2 style={h2}>4 · Intent CI (permissions-as-code)</h2>
          <p style={body}>
            Declare what a role <em>may</em> do in token quantities (no USD in
            v1). Fail the PR if Reach exceeds intent.
          </p>
          <pre className="cp-evidence">{`{
  "safe": "0x…",
  "chain": 1,
  "role": "keeper-bot",
  "may_call": [{
    "target": "AaveV3Pool",
    "functions": ["supply", "withdraw"],
    "recipient": "must_equal_safe",
    "max_amount": { "token": "USDC", "per_day": "250000000000" }
  }],
  "must_not": ["delegatecall", "call_to_self", "approve_to_unlisted_spender"]
}`}</pre>
          <pre className="cp-evidence">{`pnpm intent:cli --intent ./intent.json --safe 0x…
# GitHub Action: .github/workflows/intent-check.yml in the Saviour repo`}</pre>
        </section>

        <section style={section}>
          <h2 style={h2}>5 · Where this sits vs other tools</h2>
          <ul style={ul}>
            <li>
              <strong>Zodiac App</strong> — configure Roles; Saviour is
              independent worst-case / audit view
            </li>
            <li>
              <strong>Safe UI / HW</strong> — you sign there; we only report
            </li>
            <li>
              <strong>Onay / Hexagate / Hypernative</strong> — pre-sign
              simulation; we cover standing authority when no owner signs
            </li>
            <li>
              <strong>Assertions</strong> — enforce at execution; we
              detect/explain bounds that can become asserts
            </li>
          </ul>
        </section>

        <section style={section}>
          <h2 style={h2}>Next integrations (after Reach trust)</h2>
          <p style={monoNote}>
            Safe Transaction Service pending-tx import → Safe App iframe →
            alerts. Do not skip trust gates — see{" "}
            <Link href="/vision">Vision</Link>.
          </p>
        </section>

        <div className="cp-cta-row" style={{ marginTop: 28 }}>
          <Link href="/audit" className="cp-cta-primary">
            Try Audit →
          </Link>
          <Link href="/docs" className="cp-cta-secondary">
            Product docs →
          </Link>
        </div>
        <p className="cp-honesty">
          Deep repo docs: INTEGRATE.md · INTENT_SPEC.md · REPORT_FORMAT.md ·
          OPERATOR_RUNBOOK.md · ENV.md · SECURITY.md
        </p>
      </main>
    </ProductChrome>
  );
}

function PathCard({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div style={card}>
      <strong style={{ color: "var(--tx-hi)", fontSize: 14 }}>{title}</strong>
      <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.45, color: "var(--tx-lo)" }}>
        {body}
      </p>
      <Link
        href={href}
        style={{
          display: "inline-block",
          marginTop: 12,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--sig)",
        }}
      >
        {cta} →
      </Link>
    </div>
  );
}

const section: CSSProperties = { marginTop: 36 };
const h2: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 18,
  letterSpacing: "-0.02em",
  color: "var(--tx-hi)",
};
const body: CSSProperties = {
  margin: "10px 0 0",
  fontSize: 14,
  lineHeight: 1.5,
  color: "var(--tx)",
};
const ul: CSSProperties = {
  margin: "12px 0 0",
  paddingLeft: 18,
  lineHeight: 1.55,
  fontSize: 14,
  color: "var(--tx)",
};
const monoNote: CSSProperties = {
  marginTop: 12,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  lineHeight: 1.45,
  color: "var(--tx-lo)",
};
const pathGrid: CSSProperties = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};
const card: CSSProperties = {
  padding: "14px 14px 16px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md, 8px)",
  background: "var(--bg-raise)",
};
