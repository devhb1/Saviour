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
          Read one mainnet Safe at one block. A signer shares the pin link. A
          backend calls the same audit and shows Coverage, findings, and Reach
          beside Sign. Signing stays in Safe. This never stamps SAFE.
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
              body="Open the pin link. The page must say digest match."
              href="/docs"
              cta="Read Docs"
            />
            <PathCard
              title="Your backend"
              body="GET /api/audit or auditSafe. Show the report beside Sign."
              href="#api"
              cta="HTTP API"
            />
            <PathCard
              title="CI"
              body="UNKNOWN is inconclusive. Do not fail a PR on a token amount."
              href="#ci"
              cta="What CI can check"
            />
          </div>
        </section>

        <section style={section} id="cli">
          <h2 style={h2}>1 · CLI (ops & auditors)</h2>
          <pre className="cp-evidence">{`# Live mainnet. Set ETH_RPC_URL or MAINNET_RPC_URL first.
pnpm audit:cli --safe 0xYourSafe
pnpm audit:cli --safe 0xYourSafe --json-full

# Checked-in examples only. Not a live treasury.
pnpm audit:cli --fixture reference
pnpm review:cli --fixture term`}</pre>
          <p style={monoNote}>
            The production command is <code>--safe</code>. A fixture reruns a
            file in the repo.
          </p>
        </section>

        <section style={section} id="sdk">
          <h2 style={h2}>2 · SDK — wire into your product</h2>
          <p style={body}>
            Install <code>@saviours/check</code> where the process can see{" "}
            <code>ETH_RPC_URL</code>. <code>chainId</code> must be 1.{" "}
            <code>blockNumber</code> is only for re-checking a pin.
          </p>
          <pre className="cp-evidence">{`npm i @saviours/check`}</pre>
          <pre className="cp-evidence">{`import { auditSafe, goldenReportJson, type Hex } from "@saviours/check";

const audit = await auditSafe({
  safeAddress: "0x…" as Hex,
  chainId: 1,
});

if (audit.errors.length) {
  // show the errors; do not treat the rest as a pass
}
if (!audit.coverage.complete) {
  // show components and gaps — incomplete is not a clean bill
}
for (const p of audit.reach?.principals ?? []) {
  // BOUNDED | UNBOUNDED | UNKNOWN
  // owner-set BOUNDED means those owners cannot sign
  // it does not mean the Safe is safe
}

const golden = JSON.parse(goldenReportJson(audit));
const pin =
  \`/audit?safe=\${audit.safeAddress}&block=\${audit.freshness?.blockNumber}&digest=\${golden.reportDigest}\`;`}</pre>
        </section>

        <section style={section} id="api">
          <h2 style={h2}>3 · HTTP API (this app)</h2>
          <pre className="cp-evidence">{`GET /api/audit?safe=0x…&chainId=1
GET /api/audit?safe=0x…&chainId=1&block=26435999
GET /api/audit?safe=0x…&chainId=1&member=0x…

# Share this. Opening it re-audits that block.
/audit?safe=0x…&block=<freshness.blockNumber>&digest=<64 hex>

POST /api/audit/explain   { "report", "question"? }
POST /api/report          { "report" }     # golden JSON; disk store is optional
POST /api/audit/receipt   { "report", "operator", "pinUrl", "digest", "witness"? }

# Rejected. Fixture-only.
GET /api/audit?safe=0x…&suspectFreeRecipient=1`}</pre>
          <p style={body}>
            Read <code>errors</code>, then <code>coverage.complete</code>, then
            findings, then each <code>reach.principals[].verdict</code>. An
            empty findings list is not an endorsement. <code>UNKNOWN</code> is
            inconclusive. <code>UNBOUNDED</code> is the fail for a keeper-style
            check. <code>400</code> is a bad address or block. <code>429</code>{" "}
            is the rate limit. <code>500</code> is a read failure, with the RPC
            URL removed from the message.
          </p>
        </section>

        <section style={section} id="ci">
          <h2 style={h2}>4 · What a CI job may check</h2>
          <p style={body}>
            The report does not produce token amounts. A workflow can fail on{" "}
            <code>UNBOUNDED</code> for a role member, and it must leave{" "}
            <code>UNKNOWN</code> inconclusive. It must not fail a pull request
            for exceeding a quantity this audit never computed. Intent files
            reject USD fields. The shape check is <code>pnpm intent:cli</code>.
          </p>
        </section>

        <section style={section}>
          <h2 style={h2}>5 · Where this sits vs other tools</h2>
          <ul style={ul}>
            <li>
              <strong>Zodiac App</strong> — where Roles are edited. Saviour is
              the independent read of what those modules can already do.
            </li>
            <li>
              <strong>Safe UI</strong> — where the signer approves. Saviour
              does not block the transaction.
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
            A Safe App that receives the open Safe, and a pull of queued
            transactions from the Safe Transaction Service, are later steps.
            Today a protocol pastes the Safe or calls <code>GET /api/audit</code>.
            Condition amounts and Roles v1 are not interpreted.
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
