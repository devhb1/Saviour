"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Button } from "../ui";
import { WhatWeDont } from "./WhatWeDont";
import { DocsDiagrams } from "./diagrams/DocsDiagrams";
import { HowMemoryWorks } from "./HowMemoryWorks";
import { SystemFlowBoard } from "./SystemFlowBoard";
import { ColdOpenPaint } from "./ColdOpenPaint";

const SECTIONS: { id: string; label: string }[] = [
  { id: "blind-spot", label: "The blind spot" },
  { id: "what-this-is", label: "What this is" },
  { id: "why-public", label: "Why public" },
  { id: "how-it-works", label: "How it works" },
  { id: "under-hood", label: "Under the hood" },
  { id: "refuses", label: "What it refuses" },
  { id: "proofs", label: "Proofs" },
  { id: "alternatives", label: "Alternatives" },
  { id: "integrate", label: "Integrate" },
  { id: "roadmap", label: "Roadmap" },
  { id: "tracks", label: "Stack depth" },
  { id: "faq", label: "FAQ" },
];

/**
 * On-product docs — 12 persuasion sections, sidebar + scrollspy.
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
  const [active, setActive] = useState(SECTIONS[0]!.id);

  useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean,
    ) as HTMLElement[];
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
    <section className="rise" style={{ maxWidth: 1100, position: "relative" }}>
      <ColdOpenPaint label="Docs" />
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
            <h1 style={h1}>
              An agent is about to sign with an address that already drained a
              protocol.
            </h1>
            <p style={lead}>
              Nobody tells it. Private scanners stay private. Dashboards stay in
              tabs humans forgot to open. The counterparty question has no public
              answer at the moment of signature.
            </p>
            <div style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 10 }}>
              {onOpenLive ? (
                <Button onClick={onOpenLive}>Run it live →</Button>
              ) : null}
              {onOpenBuild ? (
                <Button variant="ghost" onClick={onOpenBuild}>
                  Integrate
                </Button>
              ) : null}
            </div>
          </Section>

          <Section id="what-this-is" title="What this is">
            Public, evidence-backed threat memory for counterparties. Readable via
            ENS by anything that speaks RPC. Shield checks stay{" "}
            <strong style={hi}>$0 forever</strong>. Bazantic meters discovery only:
            Free $0 · Standard ~$0.01 (investigate) · Complex ~$0.05 (evidence /
            ask). Five published recipes on Build.
          </Section>

          <Section id="why-public" title="Why it must be public">
            A private API is a moat. A name is infrastructure. The second agent —
            and the hundredth — should pay nothing to learn what the first already
            proved. That only works if the memory lives where agents already
            resolve: ENS text records, not our billable endpoint.
          </Section>

          <Section id="how-it-works" title="How it works">
            <HowMemoryWorks compact />
            <SystemFlowBoard compact />
            <ol style={{ ...list, marginTop: 24 }}>
              <li>
                <strong style={hi}>Investigate</strong> — Messari 1×8 + Adapter A →
                deterministic signals → AI cites → validator decides.
              </li>
              <li>
                <strong style={hi}>Name</strong> — only WATCH / TAINTED →{" "}
                <code style={code}>&lt;addr&gt;.saviours.eth</code> on Sepolia ENSv2.
              </li>
              <li>
                <strong style={hi}>Resolve</strong> — Shield / cast / MCP / Bazantic ·
                ENS resolve · $0 on MEMORY HIT.
              </li>
            </ol>
            <div style={{ marginTop: 20 }}>
              <DocsDiagrams />
            </div>
          </Section>

          <Section id="under-hood" title="Under the hood">
            <ul style={list}>
              <li>
                <strong style={hi}>Graph fan-out</strong> — one Messari template across
                eight deployments; honest empties stay empty.
              </li>
              <li>
                <strong style={hi}>Signals</strong> — deterministic; AI may explain
                cited rows only.
              </li>
              <li>
                <strong style={hi}>AI boundary</strong> — AI explains, code decides (
                <code style={code}>validateAssessment</code>).
              </li>
              <li>
                <strong style={hi}>ENS write</strong> — investigator EOA → UserRegistry
                → PermissionedResolver → six text records.
              </li>
              <li>
                <strong style={hi}>EAC</strong> — wrong-role writes revert; dispute /
                revoke are operator-capped demos, not decentralization theater.
              </li>
            </ul>
          </Section>

          <Section id="refuses" title="What it refuses to do">
            <WhatWeDont compact />
          </Section>

          <Section id="proofs" title="Proofs you can check right now">
            <ul style={list}>
              <li>
                Heroes:{" "}
                <a
                  href="https://sepolia.etherscan.io/address/0x935bfb495e33f74d2e9735df1da66ace442ede48"
                  style={a}
                  target="_blank"
                  rel="noreferrer"
                >
                  ATTACK-1
                </a>{" "}
                → TAINTED / BLOCK ·{" "}
                <a
                  href="https://sepolia.etherscan.io/address/0x352423e2fa5d5c99343d371c9e3bc56c87723cc7"
                  style={a}
                  target="_blank"
                  rel="noreferrer"
                >
                  BOT-1
                </a>{" "}
                → WATCH / WARN (Graph-verified).
              </li>
              <li>
                Cast{" "}
                <code style={code}>saviours.status</code> on Sepolia — no our server
                (Build page has the one-liner).
              </li>
              <li>
                Live API:{" "}
                <a
                  href="https://www.saviours.xyz"
                  style={a}
                  target="_blank"
                  rel="noreferrer"
                >
                  www.saviours.xyz
                </a>{" "}
                · gateway{" "}
                <a
                  href="https://saviours.bazgateway.com"
                  style={a}
                  target="_blank"
                  rel="noreferrer"
                >
                  saviours.bazgateway.com
                </a>
                .
              </li>
              <li>
                OpenAPI:{" "}
                <a href="/openapi-saviours.json" style={a}>
                  /openapi-saviours.json
                </a>{" "}
                (17 MCP tools · body + path forms).
              </li>
              <li>
                Gates: <code style={code}>pnpm check:shield</code> ·{" "}
                <code style={code}>check:ens-story</code> ·{" "}
                <code style={code}>check:mcp</code> ·{" "}
                <code style={code}>bazantic:e2e</code>.
              </li>
              <li>
                Fleet Run on Live — pick a class, Shield a batch; misses stay misses.
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
          </Section>

          <Section id="alternatives" title="Why not the alternatives">
            <ul style={list}>
              <li>
                <strong style={hi}>≠ NpmGuard</strong> — packages ≠ live attackers
                signing transactions.
              </li>
              <li>
                <strong style={hi}>≠ Mandate</strong> — leash on <em>your</em> agent ≠
                naming the counterparty.
              </li>
              <li>
                <strong style={hi}>≠ Immunity</strong> — LLM opinion behind a paid SDK ≠
                Graph evidence under a castable name.
              </li>
              <li>
                <strong style={hi}>≠ Blockaid / GoPlus</strong> — useful scanners; not
                public ENS memory that the next agent resolves without an account.
              </li>
            </ul>
          </Section>

          <Section id="integrate" title="Integrate in two lines">
            <pre style={pre}>{`import { check } from "@saviours/check";
const r = await check("0x935bfb…ede48"); // ens · $0 · no our server
if (r.decision === "BLOCK") throw new Error("TAINTED");`}</pre>
            <p
              style={{
                margin: "14px 0 0",
                fontSize: 14,
                color: "var(--tx-lo)",
                lineHeight: 1.5,
              }}
            >
              Modes: <code style={code}>ens</code> (default) ·{" "}
              <code style={code}>shield</code> · <code style={code}>full</code>. Also{" "}
              <code style={code}>guard()</code>, <code style={code}>castCommand()</code>,
              MCP stdio, Bazantic recipe. Details on Build.
            </p>

            <h3 style={{ ...h2, fontSize: 18, marginTop: 28 }}>Three personas</h3>
            <ul style={list}>
              <li>
                <strong style={hi}>Agent builder</strong> —{" "}
                <code style={code}>@saviours/check</code> · MCP{" "}
                <code style={code}>check_target</code> ·{" "}
                <code style={code}>consumers/live-agent</code>. Don&apos;t sign with
                known threats.
              </li>
              <li>
                <strong style={hi}>Wallet / Safe</strong> — Guard sketch{" "}
                <code style={code}>contracts/examples/SavioursGuard.sol</code> · pre-exec
                counterparty gate.
              </li>
              <li>
                <strong style={hi}>Human investigator</strong> — Identity passport + Case
                depth · cast without our server.
              </li>
            </ul>
            <pre style={{ ...pre, marginTop: 14 }}>{`// React (this app)
import { useSavioursCheck } from "../lib/useSavioursCheck";
const { result } = useSavioursCheck(address); // Shield via gateway`}</pre>
            {onOpenBuild ? (
              <div style={{ marginTop: 14 }}>
                <Button variant="ghost" onClick={onOpenBuild}>
                  Open Build →
                </Button>
              </div>
            ) : null}
          </Section>

          <Section id="roadmap" title="Roadmap">
            <ol style={list}>
              <li>
                <strong style={hi}>Now</strong> — Loop live · Naming Ceremony · Fleet
                Run · Bazantic $0/402/pay · Identity · rate-limited costly routes.
              </li>
              <li>
                <strong style={hi}>Weeks</strong> — honest Graph-verified growth
                one-at-a-time · wagmi pre-sign helpers · live QuoterV2 safe-swap.
              </li>
              <li>
                <strong style={hi}>Later (when sponsors ship it)</strong> — ENSv2
                mainnet memory · multi-investigator dispute court · index{" "}
                <code style={code}>TextChanged</code> for <code style={code}>saviours.*</code>{" "}
                · Hedera only if entering that track.
              </li>
              <li>
                <strong style={hi}>Year</strong> — L2 mirrors · ambient pre-sign ·
                never auto-TAINTED bytecode leads.
              </li>
            </ol>
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--tx-lo)" }}>
              Pricing permanent: ENS reads, cast, Shield, memory hits — $0 forever.
              Detail: <code style={code}>docs/PLATFORM-ROADMAP.md</code>.
            </p>
          </Section>

          <Section id="tracks" title="How deep the integration goes">
            <ul style={list}>
              <li>
                <strong style={hi}>ENS</strong> — PermissionedResolver + EAC roles,
                hierarchical <code style={code}>*.saviours.eth</code>, mirrored{" "}
                <code style={code}>saviours.verdict</code>, honest wildcard miss.
                Cast <code style={code}>saviours.status</code> with no Saviours
                server. Artifact: Naming Ceremony + Identity passport + Playground
                ENSv2 panel.
              </li>
              <li>
                <strong style={hi}>Graph</strong> — 1 Messari template × 8 deployments;
                AI cites, code decides. Artifact: Fan-Out Console with live ms/rows.
              </li>
              <li>
                <strong style={hi}>Bazantic</strong> — Free $0 / Standard ~$0.01 /
                Complex ~$0.05 · 5 published recipes ·{" "}
                <code style={code}>investigate-once-explain</code> (Graph + memory) ·{" "}
                <code style={code}>safe-swap-with-memory</code> QuoterV2 + Shield.
                Artifact: Probe → 402 → Basescan settle ·{" "}
                <a href="/gateway" style={a}>
                  /gateway
                </a>
                .
              </li>
              <li>
                <strong style={hi}>Product loop</strong> — a stranger can run Live →
                name → free resolve → Fleet honesty without a pitch deck.
              </li>
            </ul>
          </Section>

          <Section id="faq" title="FAQ">
            <Faq
              q="How fast is a memory hit?"
              a="Shield / ENS text reads typically land around ~150 ms end-to-end on public Sepolia RPC — we print the measured ms rather than saying “instant.” Cold starts and RPC congestion vary."
            />
            <Faq
              q="Only 2 Graph-verified?"
              a="Yes, and we say so. Fleet Run is how coverage grows legitimately — misses stay misses; we do not invent Graph-verified rows."
            />
            <Faq
              q="Why Sepolia?"
              a="ENSv2 + PermissionedResolver + EAC are live there for the demo window. Threat evidence is still mainnet Graph. Mainnet parent is roadmap."
            />
            <Faq
              q="Isn't this a blocklist?"
              a="No. We name WATCH/TAINTED with evidence hashes and expiry. SAFE and REJECT are never named. Dispute/revoke exist as operator demos."
            />
            <Faq
              q="What if you're wrong?"
              a="Validator refuses AI overreach; WATCH expires in days; TAINTED can be disputed/revoked by role. We do not claim omniscience."
            />
            <Faq
              q="Who can write?"
              a="Investigator EOAs with roles on PermissionedResolver. Wrong-role writes revert — probe it on Build / Govern."
            />
          </Section>
        </div>
      </div>
    </section>
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
    <div id={id} style={{ marginTop: title ? 40 : 0, scrollMarginTop: 88 }}>
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
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ margin: 0, fontWeight: 600, color: "var(--tx-hi)" }}>{q}</p>
      <p
        style={{
          margin: "6px 0 0",
          fontSize: 14,
          color: "var(--tx-lo)",
          lineHeight: 1.5,
        }}
      >
        {a}
      </p>
    </div>
  );
}

const layout: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(140px, 180px) minmax(0, 1fr)",
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
  fontSize: "var(--t-display)",
  fontWeight: 500,
  letterSpacing: "-0.03em",
  color: "var(--tx-hi)",
  lineHeight: 1.1,
};

const h2: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 22,
  fontWeight: 500,
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
  color: "var(--sig-hi, var(--sig))",
};

const hi: CSSProperties = { color: "var(--tx-hi)" };

const a: CSSProperties = {
  color: "var(--sig)",
  textUnderlineOffset: 3,
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

const pre: CSSProperties = {
  margin: 0,
  padding: 14,
  background: "var(--bg-inset, var(--surface))",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-sm)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  lineHeight: 1.5,
  color: "var(--tx)",
  overflow: "auto",
  whiteSpace: "pre-wrap",
};
