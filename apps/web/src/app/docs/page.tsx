import type { CSSProperties } from "react";
import Link from "next/link";
import { ProductChrome, TERM_SAFE } from "../../components/ProductChrome";

/**
 * In-app product docs — how to use Saviour day-to-day.
 */
export default function DocsPage() {
  return (
    <ProductChrome active="docs">
      <main className="cp-tool" style={{ maxWidth: 820 }}>
        <p className="cp-tool-eyebrow">// DOCS</p>
        <h1 className="cp-tool-h1">How to use Saviour</h1>
        <p className="cp-tool-lead">
          Read-only Safe authority audit for treasury operators and co-signers.
          Signer always decides in Safe UI / hardware wallet. Never stamps SAFE.
        </p>

        <section style={section}>
          <h2 style={h2}>What you get today</h2>
          <ul style={ul}>
            <li>
              <strong>Audit</strong> — paste a mainnet Safe. Findings, Coverage,
              Freshness, and Reach at one block.
            </li>
            <li>
              <strong>Share</strong> — the pin link is the Safe, the block, and
              the digest. The other signer re-opens it and checks digest match.
            </li>
            <li>
              <strong>Explain</strong> — plain words under the report. A
              question stays inside that report.
            </li>
            <li>
              <strong>Review</strong> — a proposed Safe transaction, with the
              hash from Safe UI.
            </li>
          </ul>
          <p style={monoNote}>
            Roles v2.1.1 selectors come from chain logs. Condition amounts stay
            UNKNOWN. Roles v1 is identified and not read. See{" "}
            <Link href="/vision">Vision</Link> for what is still open.
          </p>
        </section>

        <section style={section}>
          <h2 style={h2}>Operator flow</h2>
          <ol className="cp-how-list" style={{ marginTop: 14 }}>
            <li>
              <span className="cp-how-n">01</span>
              <span>
                <strong style={{ color: "var(--tx-hi)" }}>Standing check</strong>{" "}
                — after any Roles/module change (or monthly), open{" "}
                <Link href="/audit">Audit</Link>, paste the Safe, run audit.
                Read Coverage gaps; UNKNOWN ≠ fine.
              </span>
            </li>
            <li>
              <span className="cp-how-n">02</span>
              <span>
                <strong style={{ color: "var(--tx-hi)" }}>Before you sign</strong>{" "}
                — export Safe JSON from Safe UI, open{" "}
                <Link href="/review">Review</Link>, paste the{" "}
                <em>independent</em> safeTxHash from Safe (never invent MATCH).
              </span>
            </li>
            <li>
              <span className="cp-how-n">03</span>
              <span>
                <strong style={{ color: "var(--tx-hi)" }}>Share</strong> — copy
                the note for the other signer. They open the pin link. Digest
                match means the same block and the same report. They approve
                only in Safe.
              </span>
            </li>
          </ol>
        </section>

        <section style={section}>
          <h2 style={h2}>Try it</h2>
          <div className="cp-cta-row" style={{ marginTop: 14 }}>
            <Link
              href={`/audit?safe=${TERM_SAFE}&run=1`}
              className="cp-cta-primary"
            >
              Term reference Audit →
            </Link>
            <Link href="/review?demo=term" className="cp-cta-secondary">
              Term Prop 5 Review →
            </Link>
          </div>
        </section>

        <section style={section}>
          <h2 style={h2}>Honesty bounds</h2>
          <ul style={ul}>
            <li>Absence of findings ≠ SAFE</li>
            <li>Static decode ≠ full fork simulation</li>
            <li>Cannot detect compromised keys</li>
            <li>Mainnet control reads only (chainId 1)</li>
            <li>Roles v2.1.1 selectors are read. Condition amounts stay UNKNOWN.</li>
            <li>Roles v1 is identified and not interpreted.</li>
            <li>A plain-language answer cannot change the verdict.</li>
          </ul>
        </section>

        <section style={section}>
          <h2 style={h2}>Build into your stack</h2>
          <p style={{ margin: "10px 0 0", color: "var(--tx)", lineHeight: 1.5 }}>
            CLI, the npm package, and the HTTP API are on the Integrate page.
            A CI job may fail on UNBOUNDED. It must leave UNKNOWN inconclusive.
          </p>
          <div className="cp-cta-row" style={{ marginTop: 16 }}>
            <Link href="/integrate" className="cp-cta-primary">
              Integrate guide →
            </Link>
            <Link href="/vision" className="cp-cta-secondary">
              Vision ahead →
            </Link>
          </div>
        </section>

        <p className="cp-honesty">
          Repo deep-dives: docs/INTEGRATE.md · docs/OPERATOR_RUNBOOK.md ·
          docs/BLAST_RADIUS.md · SECURITY.md
        </p>
      </main>
    </ProductChrome>
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
const ul: CSSProperties = {
  margin: "12px 0 0",
  paddingLeft: 18,
  lineHeight: 1.55,
  fontSize: 14,
  color: "var(--tx)",
};
const monoNote: CSSProperties = {
  marginTop: 14,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  lineHeight: 1.45,
  color: "var(--tx-lo)",
};
