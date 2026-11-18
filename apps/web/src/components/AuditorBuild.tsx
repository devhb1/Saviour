"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { PackageFlow, ReadFlow, AUDIT_NPM_URL } from "./AuditFlows";
import { TERM_BLOCK, TERM_SAFE } from "../lib/termProof";

type Tab = "web" | "http" | "sdk" | "cli" | "help";

const HTTP = `GET /api/audit?safe=${TERM_SAFE}&chainId=1
GET /api/audit?safe=${TERM_SAFE}&chainId=1&block=${TERM_BLOCK}
GET /api/audit?safe=0x…&chainId=1&member=0x…

# Share this. Opening it re-audits that block.
/audit?safe=0x…&block=<freshness.blockNumber>&digest=<64 hex>

POST /api/audit/explain   { "report", "question"? }
POST /api/report          { "report" }
POST /api/audit/receipt   { "report", "operator", "pinUrl", "digest", "witness"? }

# Rejected. Fixture-only.
GET /api/audit?safe=0x…&suspectFreeRecipient=1`;

const FETCH = `const res = await fetch(
  \`\${SAVIOUR_ORIGIN}/api/audit?safe=\${safe}&chainId=1\`,
);
const { ok, report, error } = await res.json();
if (!res.ok || !ok) throw new Error(error ?? res.statusText);

const unbounded = (report.reach?.principals ?? []).filter(
  (p) => p.verdict === "UNBOUNDED",
);
// Show report.coverage, report.findings, and unbounded.
// Do not enable a "safe to sign" state from this response.`;

const SDK = `# Fresh folder — do not run npm inside the Saviours repo
mkdir saviour-audit && cd saviour-audit
npm init -y
npm i @saviours/audit
# https://www.npmjs.com/package/@saviours/audit  (0.1.0)

# @saviours/check is the archived ENS checker.
# It does not install auditSafe.`;

const SDK_USE = `import { auditSafe, goldenReportJson, verifyGoldenDigest, type Hex } from "@saviours/audit";

const audit = await auditSafe({
  safeAddress: "${TERM_SAFE}" as Hex,
  chainId: 1,
  blockNumber: ${TERM_BLOCK}n, // omit to read the chain head
});

if (audit.errors.length) {
  // show the errors; do not treat the rest as a pass
}
if (!audit.coverage.complete) {
  // show components and gaps — incomplete is not a clean bill
}
for (const p of audit.reach?.principals ?? []) {
  // BOUNDED | UNBOUNDED | UNKNOWN
}

const golden = JSON.parse(goldenReportJson(audit));
verifyGoldenDigest(golden);
const pin =
  \`/audit?safe=\${audit.safeAddress}\` +
  \`&block=\${audit.freshness?.blockNumber}\` +
  \`&digest=\${golden.reportDigest}\`;`;

const CLI = `# ETH_RPC_URL or MAINNET_RPC_URL. Archive node for an old pin.
pnpm audit:cli --safe ${TERM_SAFE}
pnpm audit:cli --safe ${TERM_SAFE} --block ${TERM_BLOCK} --json-full

# Checked-in examples. Not a live treasury.
pnpm audit:cli --fixture reference
pnpm review:cli --fixture term
pnpm intent:cli`;

const FAQ: { q: string; a: string }[] = [
  {
    q: "npm i @saviours/check did not give me auditSafe",
    a: "That name is the archived ENS counterparty check. The published auditor is @saviours/audit at https://www.npmjs.com/package/@saviours/audit. Install it in a fresh folder. Inside this repo, pnpm’s workspace will fight a second npm install.",
  },
  {
    q: "The audit returns 500 or hangs",
    a: "Set ETH_RPC_URL or MAINNET_RPC_URL to an archive-capable mainnet node. A public node often rejects a wide eth_getLogs range. The route limit is 60 seconds. The error text has the RPC URL removed.",
  },
  {
    q: "HTTP 400",
    a: "The Safe is not 0x plus 40 hex characters, the block is not a decimal, or chainId is not 1. suspectFreeRecipient is always 400.",
  },
  {
    q: "HTTP 429",
    a: "The in-memory limit is 20 audits per IP per minute. Wait and read Retry-After. The limit trusts the first x-forwarded-for value.",
  },
  {
    q: "I want a token amount in CI",
    a: "The report does not compute one. Fail a job on UNBOUNDED for a role member. Leave UNKNOWN inconclusive. Do not fail a pull request for exceeding a quantity this audit never computed.",
  },
  {
    q: "Can I import the Safe Transaction Service or ship a Safe App?",
    a: "Not yet. Paste the Safe, or call GET /api/audit. Transaction review from a checkout is pnpm review:cli, with the Safe UI safeTxHash passed in as expectedSafeTxHash.",
  },
  {
    q: "Digest mismatch on an older link",
    a: "Schema 1.2.0 changed which fields enter the hash. Re-run and share the digest this page just computed. A match means this engine at that block, not a signed attestation.",
  },
];

export function AuditorBuild() {
  const [tab, setTab] = useState<Tab>("web");
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  return (
    <main className="cp-tool" style={{ maxWidth: 880 }}>
      <p style={eyebrow}>BUILD · INTEGRATE</p>
      <h1 style={h1}>One Safe. One block. Four ways in.</h1>
      <p style={lead}>
        The web app needs no install. A backend calls the same audit and shows
        Coverage, findings, and Reach beside Sign. Signing stays in Safe. This
        never stamps SAFE.{" "}
        <Link href="/docs" style={link}>
          Full guide
        </Link>
        {" · "}
        <a
          href="https://github.com/devhb1/Saviour/blob/main/docs/INTEGRATE.md"
          target="_blank"
          rel="noreferrer"
          style={link}
        >
          View on GitHub
        </a>
        .
      </p>

      <div role="tablist" aria-label="Build paths" style={tabs}>
        {(
          [
            ["web", "Web"],
            ["http", "HTTP"],
            ["sdk", "SDK"],
            ["cli", "CLI"],
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
                ...tabBtn,
                borderColor: on ? "var(--sig)" : "var(--line)",
                color: on ? "var(--tx-hi)" : "var(--tx-lo)",
                fontWeight: on ? 650 : 500,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "web" ? (
        <div>
          <ol style={list}>
            <li>
              Open <Link href="/audit" style={link}>Audit</Link>, paste a
              mainnet Safe (<code>0x</code> and 40 hex characters), and run it.
            </li>
            <li>
              Read errors, then Coverage, then findings, then each Reach
              verdict. <code>complete: false</code> is a result.{" "}
              <code>UNKNOWN</code> is inconclusive.
            </li>
            <li>
              Copy the note for the other signer. Their page must say digest
              match before anyone treats the pin as the same report.
            </li>
            <li>
              A pilot receipt counts only when the operator is outside Saviour
              and a witness saw that match. The Term Safe is a team proof.
            </li>
          </ol>
          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href={`/audit?safe=${TERM_SAFE}&block=${TERM_BLOCK}`} className="cp-cta-primary">
              Open the Term pin
            </Link>
            <Link href="/review?demo=term" className="cp-cta-secondary">
              Term review
            </Link>
          </div>
          <SupportStrip />
        </div>
      ) : null}

      {tab === "http" ? (
        <div>
          <div style={{ marginBottom: 16 }}>
            <ReadFlow />
          </div>
          <p style={hint}>
            Host the app, or call a deployment that has <code>ETH_RPC_URL</code>{" "}
            or <code>MAINNET_RPC_URL</code> set. <code>chainId</code> must be 1.
            Set <code>block</code> only when re-checking a pin.
          </p>
          <Block
            title="Routes"
            code={HTTP}
            copied={copied === "http"}
            onCopy={() => void copy("http", HTTP)}
          />
          <Block
            title="Read the body in this order"
            code={FETCH}
            copied={copied === "fetch"}
            onCopy={() => void copy("fetch", FETCH)}
          />
          <p style={hint}>
            <code>200</code> carries <code>ok</code> and <code>report</code>.{" "}
            <code>400</code> is a bad address, block, or chain.{" "}
            <code>429</code> is the rate limit. <code>500</code> is a read
            failure. <code>member</code> is an extra probe address. It does not
            prove membership and it does not raise severity.
          </p>
          <SupportStrip />
        </div>
      ) : null}

      {tab === "sdk" ? (
        <div>
          <p style={hint}>
            Published package:{" "}
            <a href={AUDIT_NPM_URL} style={link} target="_blank" rel="noreferrer">
              @saviours/audit@0.1.0
            </a>
            . Node 20 or newer. ESM only. Do not install{" "}
            <code>@saviours/check</code> for this API.
          </p>
          <div style={{ marginBottom: 16 }}>
            <PackageFlow />
          </div>
          <Block
            title="Fresh project · npm i @saviours/audit"
            code={SDK}
            copied={copied === "sdk"}
            onCopy={() => void copy("sdk", SDK)}
          />
          <Block
            title="auditSafe and the pin"
            code={SDK_USE}
            copied={copied === "use"}
            onCopy={() => void copy("use", SDK_USE)}
          />
          <p style={hint}>
            Set <code>ETH_RPC_URL</code> in the process that calls{" "}
            <code>auditSafe</code>. The package reads mainnet only.{" "}
            <code>probeMembers</code> is optional and is not proof of
            membership. <code>fixtureAssumptions</code> is for tests. Transaction
            review is not in this package.
          </p>
          <SupportStrip />
        </div>
      ) : null}

      {tab === "cli" ? (
        <div>
          <Block
            title="From a checkout of this repo"
            code={CLI}
            copied={copied === "cli"}
            onCopy={() => void copy("cli", CLI)}
          />
          <p style={hint}>
            <code>--safe</code> is the live command. <code>--fixture</code>{" "}
            reruns a file in the repo. <code>pnpm intent:cli</code> checks an
            intent file’s shape. Intent files reject USD fields. A CI job may
            fail on <code>UNBOUNDED</code> and must leave <code>UNKNOWN</code>{" "}
            inconclusive.
          </p>
          <p style={hint}>
            Safe App and Safe Transaction Service import are written as a later
            step in <code>docs/STS_SAFE_APP.md</code>. They are not built.
          </p>
          <SupportStrip />
        </div>
      ) : null}

      {tab === "help" ? (
        <div>
          <p style={hint}>
            Common integrator issues. The same guide in the repo is{" "}
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
              <h2 style={faqQ}>{item.q}</h2>
              <p style={faqA}>{item.a}</p>
            </div>
          ))}
          <SupportStrip />
        </div>
      ) : null}
    </main>
  );
}

function SupportStrip() {
  return (
    <div style={supportBox}>
      <p style={supportTitle}>NEED HELP INTEGRATING?</p>
      <p style={supportBody}>
        Email{" "}
        <a href="mailto:b4harshit01@gmail.com" style={link}>
          b4harshit01@gmail.com
        </a>
        {" · "}
        <a href="https://twitter.com/harshitb01" target="_blank" rel="noreferrer" style={link}>
          @harshitb01
        </a>
        {" · "}
        <a href="https://github.com/devhb1/Saviour/issues" target="_blank" rel="noreferrer" style={link}>
          open an issue
        </a>
      </p>
      <p style={{ ...supportBody, marginTop: 8 }}>
        Include the path (web, HTTP, SDK, CLI), the Safe, the block, and the
        response with any RPC URL removed.
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
      <div style={blockHead}>
        <p style={blockTitle}>{title}</p>
        <button type="button" onClick={onCopy} style={copyBtn}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre style={pre}>{code}</pre>
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

const h1: CSSProperties = {
  margin: "10px 0 0",
  fontFamily: "var(--font-display)",
  fontSize: "clamp(28px, 4vw, 40px)",
  fontWeight: 600,
  letterSpacing: "-0.03em",
  color: "var(--tx-hi)",
  lineHeight: 1.1,
};

const lead: CSSProperties = {
  margin: "12px 0 0",
  maxWidth: 640,
  fontSize: 15,
  lineHeight: 1.55,
  color: "var(--tx-lo)",
};

const tabs: CSSProperties = {
  display: "flex",
  gap: 6,
  marginTop: 28,
  marginBottom: 20,
  flexWrap: "wrap",
  borderBottom: "1px solid var(--line)",
  paddingBottom: 12,
};

const tabBtn: CSSProperties = {
  padding: "8px 14px",
  fontSize: 13,
  fontFamily: "var(--font-mono)",
  background: "transparent",
  border: "1px solid var(--line)",
  borderRadius: 6,
  cursor: "pointer",
};

const list: CSSProperties = {
  margin: 0,
  paddingLeft: 20,
  display: "grid",
  gap: 10,
  fontSize: 15,
  lineHeight: 1.55,
  color: "var(--tx)",
};

const hint: CSSProperties = {
  margin: "0 0 16px",
  fontSize: 14,
  lineHeight: 1.5,
  color: "var(--tx-lo)",
};

const link: CSSProperties = { color: "var(--sig)" };

const blockShell: CSSProperties = {
  marginBottom: 18,
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "var(--bg-raise)",
  overflow: "hidden",
};

const blockHead: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  padding: "10px 14px",
  borderBottom: "1px solid var(--line)",
};

const blockTitle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--tx)",
};

const copyBtn: CSSProperties = {
  padding: "6px 10px",
  fontSize: 12,
  fontFamily: "var(--font-mono)",
  background: "transparent",
  border: "1px solid var(--line)",
  borderRadius: 6,
  color: "var(--tx-hi)",
  cursor: "pointer",
};

const pre: CSSProperties = {
  margin: 0,
  padding: "14px 16px",
  background: "var(--bg-inset)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  lineHeight: 1.5,
  overflow: "auto",
  color: "var(--tx-hi)",
  whiteSpace: "pre-wrap",
};

const faqCard: CSSProperties = {
  marginBottom: 12,
  padding: "12px 14px",
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "var(--bg-raise)",
};

const faqQ: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--tx-hi)",
  lineHeight: 1.35,
};

const faqA: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 14,
  lineHeight: 1.45,
  color: "var(--tx-lo)",
};

const supportBox: CSSProperties = {
  marginTop: 28,
  padding: "16px 18px",
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "var(--bg-raise)",
};

const supportTitle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.08em",
  color: "var(--sig)",
};

const supportBody: CSSProperties = {
  margin: "10px 0 0",
  fontSize: 14,
  lineHeight: 1.5,
  color: "var(--tx-lo)",
};
