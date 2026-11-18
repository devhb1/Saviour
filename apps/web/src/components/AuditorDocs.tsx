"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { TERM_BLOCK, TERM_SAFE } from "../lib/termProof";

const SECTIONS: { id: string; label: string }[] = [
  { id: "blind-spot", label: "The blind spot" },
  { id: "what-this-is", label: "What this is" },
  { id: "what-you-get", label: "What you get" },
  { id: "operator", label: "Operator flow" },
  { id: "how-it-works", label: "How a read works" },
  { id: "report", label: "The report" },
  { id: "refuses", label: "What it refuses" },
  { id: "proofs", label: "Proofs" },
  { id: "alternatives", label: "Alternatives" },
  { id: "build", label: "Build" },
  { id: "limits", label: "Known limits" },
  { id: "faq", label: "FAQ" },
];

/**
 * Product docs for the Safe permission auditor.
 * Same shape as the archived Docs screen: sidebar, sections, FAQ.
 */
export function AuditorDocs() {
  const [active, setActive] = useState(SECTIONS[0]!.id);

  useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (n): n is HTMLElement => n != null,
    );
    if (!nodes.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target?.id;
        if (top) setActive(top);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.4, 0.7] },
    );
    for (const n of nodes) obs.observe(n);
    return () => obs.disconnect();
  }, []);

  return (
    <main className="cp-tool" style={{ maxWidth: 1100 }}>
      <div className="docs-layout" style={layout}>
        <nav className="docs-sidebar" style={sidebar} aria-label="Docs sections">
          <p style={eyebrow}>DOCS</p>
          <ul style={navList}>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById(s.id)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    setActive(s.id);
                  }}
                  style={{
                    ...navLink,
                    color: active === s.id ? "var(--sig)" : "var(--tx-lo)",
                  }}
                  aria-current={active === s.id ? "true" : undefined}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div style={{ minWidth: 0 }}>
          <Section id="blind-spot">
            <p style={eyebrow}>THE BLIND SPOT</p>
            <h1 style={h1}>Who can act through a Safe beyond who can sign.</h1>
            <p style={lead}>
              An owner threshold describes the signature path. A module can
              execute through the Safe with no new owner signature. A Delay
              queues that path. A Roles policy decides which member can call
              which target. Saviour reads that standing authority at one
              pinned mainnet block.
            </p>
            <div style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Link href="/audit" className="cp-cta-primary">
                Audit a Safe
              </Link>
              <Link href="/integrate" className="cp-cta-secondary">
                Build section
              </Link>
            </div>
          </Section>

          <Section id="what-this-is" title="What this is">
            A read-only auditor for Ethereum mainnet (chain id 1). It returns
            Findings, Coverage, Freshness, and Reach. Verdicts are{" "}
            <code style={code}>BOUNDED</code>, <code style={code}>UNBOUNDED</code>
            , and <code style={code}>UNKNOWN</code>. The report never says the
            Safe is safe. The signer still approves in Safe or on a hardware
            wallet. Saviour does not hold keys and does not block a signature.
          </Section>

          <Section id="what-you-get" title="What you get today">
            <ul style={list}>
              <li>
                <strong style={hi}>Audit</strong> — paste a mainnet Safe. The
                page reads owners, modules, Delay, and Roles v2.1.1 selectors
                from chain logs at one block.
              </li>
              <li>
                <strong style={hi}>Share</strong> — the pin is the Safe, the
                block, and a digest. The other signer opens it and checks
                digest match.
              </li>
              <li>
                <strong style={hi}>Explain</strong> — plain sentences taken from
                that report. A question stays inside the report and cannot
                change the verdict.
              </li>
              <li>
                <strong style={hi}>Review</strong> — a proposed Safe
                transaction, checked against the hash shown in Safe UI. A
                missing hash is <code style={code}>UNCHECKED</code>. The checker
                does not compare a hash with itself and call that a match.
              </li>
            </ul>
          </Section>

          <Section id="operator" title="Operator flow">
            <ol style={list}>
              <li>
                <strong style={hi}>Standing check.</strong> After a module or
                Roles change, or on a monthly pass, open{" "}
                <Link href="/audit" style={a}>
                  Audit
                </Link>
                , paste the Safe, and run it. Read Coverage before Reach.{" "}
                <code style={code}>UNKNOWN</code> is not a pass.
              </li>
              <li>
                <strong style={hi}>Before you sign.</strong> Export the
                transaction from Safe UI, open{" "}
                <Link href="/review" style={a}>
                  Review
                </Link>
                , and paste the independent <code style={code}>safeTxHash</code>.
              </li>
              <li>
                <strong style={hi}>Share.</strong> Send the pin. The other
                person re-audits that block. Digest match means this engine
                produced the same report. They approve only in Safe.
              </li>
            </ol>
          </Section>

          <Section id="how-it-works" title="How a read works">
            <ol style={list}>
              <li>
                <strong style={hi}>Inventory.</strong> At the chosen block,
                read owners, threshold, enabled modules, guard, and fallback
                handler.
              </li>
              <li>
                <strong style={hi}>Delay.</strong> A module that answers{" "}
                <code style={code}>txCooldown()</code> is treated as Delay-like.
                The read stores cooldown, expiration, and the modules enabled
                on that Delay. <code style={code}>txCooldown = 0</code> is a
                critical finding: the waiting period is gone.{" "}
                <code style={code}>txExpiration = 0</code> is a warning: a queued
                item does not expire.
              </li>
              <li>
                <strong style={hi}>Roles.</strong> Roles v2.1.1 mastercopy{" "}
                <code style={code}>0xf2964ce6…b283d5</code> is replayed from
                permission logs, including a Roles module enabled only on a
                Delay. That nested module is a graph node labeled “module on
                Delay”. It does not get a direct Safe edge. AllowTarget stores
                execution options, including DelegateCall.
              </li>
              <li>
                <strong style={hi}>Reach.</strong> Each principal is{" "}
                <code style={code}>BOUNDED</code>,{" "}
                <code style={code}>UNBOUNDED</code>, or{" "}
                <code style={code}>UNKNOWN</code>. Condition trees stay{" "}
                <code style={code}>UNKNOWN</code>. An unread policy is not
                turned into a token amount.
              </li>
            </ol>
            <p style={note}>
              Roles v1 mastercopy <code style={code}>0xd8dfc1d9…011889</code>,
              including the 16 Nov 2026 module, is named and not interpreted.
            </p>
          </Section>

          <Section id="report" title="The report">
            <ul style={list}>
              <li>
                <strong style={hi}>Findings</strong> — named rules, such as a
                Delay bypass when a module sits directly on the Safe beside a
                Delay, or a zero cooldown.
              </li>
              <li>
                <strong style={hi}>Coverage</strong> —{" "}
                <code style={code}>complete: false</code> is a result. Gaps name
                what was not read: conditions, allowances, undecoded logs, a
                truncated module list, Roles v1, a guard.
              </li>
              <li>
                <strong style={hi}>Freshness</strong> — chain id 1, block
                number, and block hash. Share those with the digest.
              </li>
              <li>
                <strong style={hi}>Reach</strong> — one verdict per principal.
                Owner-set <code style={code}>BOUNDED</code> means every owner is
                the zero or dead address and cannot sign. It does not mean the
                Safe is safe. Modules are their own principals.
              </li>
            </ul>
            <p style={note}>
              The digest is SHA-256 over a canonical report. It drops generation
              time, the RPC host, errors, and the log-source lines. A match
              means this engine ran at that block. It is not a signature of who
              ran it, and it does not prove a different implementation read the
              policy.
            </p>
          </Section>

          <Section id="refuses" title="What it refuses">
            <ul style={list}>
              <li>It never stamps SAFE. An empty findings list is not an endorsement.</li>
              <li>
                <code style={code}>UNKNOWN</code> and a missing verdict are not
                a pass.
              </li>
              <li>
                The public API rejects <code style={code}>suspectFreeRecipient</code>.
                A fixture assumption cannot be injected into a live audit.
              </li>
              <li>It does not detect a compromised key. It reads what a key or module can already do.</li>
              <li>It does not custody keys, submit transactions, or block a signature.</li>
              <li>It does not claim the 16 Nov 2026 drain would have been stopped.</li>
            </ul>
          </Section>

          <Section id="proofs" title="Proofs you can check">
            <ul style={list}>
              <li>
                Term Safe{" "}
                <a
                  href={`https://etherscan.io/address/${TERM_SAFE}`}
                  style={a}
                  target="_blank"
                  rel="noreferrer"
                >
                  {TERM_SAFE}
                </a>{" "}
                at block <code style={code}>{TERM_BLOCK}</code>.{" "}
                <Link
                  href={`/audit?safe=${TERM_SAFE}&block=${TERM_BLOCK}`}
                  style={a}
                >
                  Open that pin
                </Link>
                . This is a team proof. It does not count as an outside pilot.
              </li>
              <li>
                A second person opens the same Safe, block, and digest. Match
                means this build reproduced the report.
              </li>
              <li>
                From a checkout: <code style={code}>pnpm audit:cli --safe 0x…</code>{" "}
                and <code style={code}>pnpm --filter @saviours/check test</code>.
              </li>
              <li>
                Repo write-up:{" "}
                <a
                  href="https://github.com/devhb1/Saviour/blob/main/docs/INTEGRATE.md"
                  style={a}
                  target="_blank"
                  rel="noreferrer"
                >
                  docs/INTEGRATE.md
                </a>
                ,{" "}
                <a
                  href="https://github.com/devhb1/Saviour/blob/main/docs/REPORT_FORMAT.md"
                  style={a}
                  target="_blank"
                  rel="noreferrer"
                >
                  docs/REPORT_FORMAT.md
                </a>
                .
              </li>
            </ul>
          </Section>

          <Section id="alternatives" title="Where this sits">
            <ul style={list}>
              <li>
                <strong style={hi}>Zodiac App</strong> is where an operator
                edits a Roles policy. Saviour is an independent read of what
                that policy can already do at one block.
              </li>
              <li>
                <strong style={hi}>Safe UI</strong> is where the signer
                approves. Saviour does not replace that signature.
              </li>
              <li>
                <strong style={hi}>Pre-sign simulation</strong> answers a
                proposed transaction. Saviour answers standing authority that
                can move funds when no owner signs.
              </li>
            </ul>
          </Section>

          <Section id="build" title="Build">
            <p>
              Four paths. The long copy-paste section, including HTTP, the npm
              package, the CLI, and the help notes, is the{" "}
              <Link href="/integrate" style={a}>
                build page
              </Link>
              .
            </p>
            <pre style={pre}>{`import { auditSafe, goldenReportJson, type Hex } from "@saviours/audit";

const audit = await auditSafe({
  safeAddress: "${TERM_SAFE}" as Hex,
  chainId: 1,
  blockNumber: ${TERM_BLOCK}n,
});
const golden = JSON.parse(goldenReportJson(audit));`}</pre>
            <p style={note}>
              Install <code style={code}>@saviours/audit</code>.{" "}
              <code style={code}>@saviours/check</code> on npm is the archived
              ENS counterparty check and does not install this API. Run the
              install in a fresh folder, not inside this pnpm workspace.
            </p>
            <div style={{ marginTop: 14 }}>
              <Link href="/integrate" className="cp-cta-secondary">
                Open the build section
              </Link>
            </div>
          </Section>

          <Section id="limits" title="Known limits">
            <ul style={list}>
              <li>Mainnet only. Any other chain id is rejected.</li>
              <li>
                Condition trees are counted, not evaluated. Allowances are
                detected, not calculated. Reach is a qualitative label, not a
                maximum token loss.
              </li>
              <li>
                Roles v1 is identified and not interpreted. Guards, fallback
                handlers, and the Delay queue are identified and not interpreted.
              </li>
              <li>
                Nested Safes, contract owners, and EIP-7702 owners are not
                walked. A failed owner read can still leave the owner-set
                verdict <code style={code}>UNBOUNDED</code>.
              </li>
              <li>
                Delay identity currently trusts a successful{" "}
                <code style={code}>txCooldown()</code> call. A contract that
                only implements that function can be classified as a Delay.
              </li>
              <li>
                If full module pagination throws, the reader can fall back to
                the first page of 20 without a truncation gap. A list that hits
                the 1,000-module cap does record a gap.
              </li>
              <li>
                The Roles differential compares this engine with itself through
                the Zodiac SDK. It is not a Zodiac App diff on a live Roles Safe.
              </li>
            </ul>
          </Section>

          <Section id="faq" title="FAQ">
            <Faq
              q="Does a quiet report mean the Safe is safe?"
              a="No. The product never stamps SAFE. An empty findings list is not an endorsement. Read Coverage. UNKNOWN means the path was not assessed."
            />
            <Faq
              q="What does owner-set BOUNDED mean?"
              a="Every owner is the zero address or the dead address, so that owner set cannot sign. Modules and role members are separate principals. BOUNDED on the owners does not clear them."
            />
            <Faq
              q="Would this have stopped the 16 Nov 2026 drain?"
              a="No claim of that. The module on that Safe is Roles v1. This reader names it and does not interpret the policy."
            />
            <Faq
              q="Why is Coverage still incomplete on a normal Roles Safe?"
              a="Most real policies use ScopeFunction conditions. Those stay UNKNOWN. A Blockscout fallback, an undecoded log, or an allowance also keeps the status partial."
            />
            <Faq
              q="The pin says digest mismatch."
              a="The digest changed when the report schema moved to 1.2.0. Re-run the audit and share the new pin. Keep the digest the page just computed. A mismatch means the link and this read disagree."
            />
            <Faq
              q="Can I point this at another chain?"
              a="No. chainId must be 1. The public route rejects anything else."
            />
            <Faq
              q="npm i @saviours/check did not give me auditSafe."
              a="That package is the archived ENS checker. This auditor is @saviours/audit. Install it in a fresh directory. Inside this repo, use pnpm audit:cli."
            />
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} style={{ marginTop: title ? 40 : 0, scrollMarginTop: 88 }}>
      {title ? <h2 style={h2}>{title}</h2> : null}
      <div
        style={{
          marginTop: title ? 12 : 0,
          fontSize: 15,
          color: "var(--tx)",
          lineHeight: 1.55,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--tx-hi)" }}>
        {q}
      </h3>
      <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--tx-lo)", lineHeight: 1.5 }}>
        {a}
      </p>
    </div>
  );
}

const layout: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(148px, 190px) minmax(0, 1fr)",
  gap: 28,
  alignItems: "start",
};

const sidebar: CSSProperties = {
  position: "sticky",
  top: 72,
  paddingTop: 4,
};

const navList: CSSProperties = {
  listStyle: "none",
  margin: "12px 0 0",
  padding: 0,
  display: "grid",
  gap: 6,
};

const navLink: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.04em",
  textDecoration: "none",
  lineHeight: 1.35,
};

const eyebrow: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.1em",
  color: "var(--sig)",
};

const h1: CSSProperties = {
  margin: "12px 0 0",
  fontFamily: "var(--font-display)",
  fontSize: "clamp(28px, 4vw, 40px)",
  fontWeight: 600,
  letterSpacing: "-0.03em",
  color: "var(--tx-hi)",
  lineHeight: 1.1,
};

const h2: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 22,
  fontWeight: 600,
  letterSpacing: "-0.02em",
  color: "var(--tx-hi)",
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
  color: "var(--sig)",
};

const hi: CSSProperties = { color: "var(--tx-hi)" };

const a: CSSProperties = {
  color: "var(--sig)",
  textUnderlineOffset: 3,
};

const note: CSSProperties = {
  margin: "14px 0 0",
  fontSize: 14,
  color: "var(--tx-lo)",
  lineHeight: 1.5,
};

const pre: CSSProperties = {
  margin: "14px 0 0",
  padding: 14,
  background: "var(--bg-inset)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  lineHeight: 1.5,
  color: "var(--tx)",
  overflow: "auto",
  whiteSpace: "pre-wrap",
};
