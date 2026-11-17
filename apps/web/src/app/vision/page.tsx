import type { CSSProperties } from "react";
import Link from "next/link";
import { ProductChrome } from "../../components/ProductChrome";

/**
 * Vision Ahead — roadmap + early improvisation (honest staged claims).
 * Blast Radius named as planned feature; shipped verdict engine gated on R0.
 */
export default function VisionPage() {
  return (
    <ProductChrome active="vision">
      <main className="cp-how" style={{ maxWidth: 900 }}>
        <p className="cp-how-eyebrow">// VISION AHEAD</p>
        <h1 className="cp-how-title" style={{ fontSize: "clamp(28px, 4vw, 40px)" }}>
          Saviour · Blast Radius in progress
        </h1>
        <p style={{ marginTop: 12, color: "var(--tx-lo)", lineHeight: 1.5, maxWidth: 640 }}>
          Brand stays <strong style={{ color: "var(--tx-hi)" }}>Saviour</strong>.{" "}
          <strong style={{ color: "var(--tx-hi)" }}>Blast Radius</strong> is the
          feature sentence: independent worst-case outcome of standing Safe /
          Roles authority — not yet the shipped verdict engine.
        </p>

        <section style={{ marginTop: 36 }}>
          <h2 style={h2}>Where we are</h2>
          <ul style={list}>
            <li>
              <strong>Shipped:</strong> `/audit` topology · Delay bypass /
              cooldown · `/review` Safe 1.3+ hash · Privilege Diff · Findings ·
              Coverage · Freshness
            </li>
            <li>
              <strong>In progress:</strong> Roles Reach preview (`pnpm reach:cli`) —
              identity + danger patterns; permission trees still Coverage gaps
            </li>
            <li>
              <strong>Archive:</strong> ENS / investigate-once at `/legacy/v1`
            </li>
          </ul>
        </section>

        <section style={{ marginTop: 32 }}>
          <h2 style={h2}>Where we&apos;re going</h2>
          <ol style={list}>
            <li>
              <strong>Reach</strong> — per principal BOUNDED / UNBOUNDED / UNKNOWN
              (token quantities)
            </li>
            <li>
              <strong>Intent</strong> — YAML ⊆ check (no USD in v1) + GitHub Action
            </li>
            <li>
              <strong>Delta</strong> — before → after bound; Review becomes evidence
            </li>
          </ol>
          <p style={{ marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--tx-lo)" }}>
            Never SAFE. Never “detects compromised keys.” Complements Zodiac App,
            pre-sign tools, and Assertions.
          </p>
        </section>

        <section style={{ marginTop: 32 }}>
          <h2 style={h2}>Early-stage improvisation</h2>
          <p style={{ color: "var(--tx-lo)", lineHeight: 1.5 }}>
            Weeks 1–4 are deliberately messy: manual 16 Nov replay, SDK
            differential oracles, paper bounds, rapid fixture churn. Report schema
            may break — pin engine versions. Improvisation means fast honest
            iteration on Roles reach, not random pivots.
          </p>
          <table style={table}>
            <thead>
              <tr>
                <th>Weeks</th>
                <th>Mode</th>
                <th>Forbidden</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1–2</td>
                <td>Manual + spike</td>
                <td>Blast Radius hero · Grant submit · “prevents drains”</td>
              </tr>
              <tr>
                <td>3–4</td>
                <td>Engine v0</td>
                <td>Hiding Coverage gaps · USD in intent</td>
              </tr>
              <tr>
                <td>5–8</td>
                <td>Harden</td>
                <td>ENS / Watch scope creep</td>
              </tr>
              <tr>
                <td>9–16</td>
                <td>Adopt</td>
                <td>Feature tourism</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section style={{ marginTop: 32 }}>
          <h2 style={h2}>Gate sequence (R0 → R3)</h2>
          <ul style={list}>
            <li>
              <strong>R0 Replay</strong> — 16 Nov fixture locked; write-up in
              progress (see repo `fixtures/authority/R0_REPLAY.md`)
            </li>
            <li>
              <strong>R1 Roles G1</strong> — external Zodiac-literate confirm vs
              App/SDK
            </li>
            <li>
              <strong>R2 Trust G4</strong> — no self-MATCH · Delay inconclusive ·
              MultiSend completeness
            </li>
            <li>
              <strong>R3 Grant</strong> — after R0–R2; pledges in parallel
            </li>
          </ul>
        </section>

        <section style={{ marginTop: 32 }}>
          <h2 style={h2}>Frozen until after M4</h2>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--tx-lo)" }}>
            ENS hero · x402 · MCP expansion · Registry V2 · Watch-as-product ·
            multi-chain · competing on pre-sign screening
          </p>
        </section>

        <section style={{ marginTop: 32 }}>
          <h2 style={h2}>Integrate now</h2>
          <p style={{ color: "var(--tx-lo)", lineHeight: 1.5 }}>
            Run Delay/topology audit and Review today. Reach CLI preview:{" "}
            <code>pnpm reach:cli</code>. In-app guides:{" "}
            <Link href="/docs">Docs</Link> ·{" "}
            <Link href="/integrate">Integrate</Link>.
          </p>
          <div className="cp-cta-row" style={{ marginTop: 18 }}>
            <Link href="/integrate" className="cp-cta-primary">
              Integrate guide →
            </Link>
            <Link href="/docs" className="cp-cta-secondary">
              How to use →
            </Link>
          </div>
          <p className="cp-honesty" style={{ marginTop: 20 }}>
            Opt-in Reach pilots after R0 write-up. Contact via README support.
            Public Blast Radius headline unlocks only if replay supports the claim.
          </p>
        </section>
      </main>
    </ProductChrome>
  );
}

const h2: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 18,
  letterSpacing: "-0.02em",
  color: "var(--tx-hi)",
};

const list: CSSProperties = {
  margin: "12px 0 0",
  paddingLeft: 18,
  color: "var(--tx)",
  lineHeight: 1.55,
  fontSize: 14,
};

const table: CSSProperties = {
  marginTop: 14,
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  fontFamily: "var(--font-mono)",
};
