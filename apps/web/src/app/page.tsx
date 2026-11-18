import Link from "next/link";
import { ProductChrome } from "../components/ProductChrome";
import { TERM_BLOCK, TERM_DIGEST, TERM_SAFE } from "../lib/termProof";
import { ControlPlaneStage } from "../components/ControlPlaneStage";
import { HowMemoryWorks } from "../components/HowMemoryWorks";
import { SystemFlowBoard } from "../components/SystemFlowBoard";
import {
  HERO_BODY,
  HERO_LINE_1,
  HERO_LINE_2,
  HERO_SOFT,
  PRODUCT_STATUS_CHIPS,
  heroBodySegments,
} from "../lib/productStory";

/**
 * Control-Path landing — Instrument Paper hero + legacy-bone stage grid / flow board.
 */
export default function Home() {
  const bodyParts = heroBodySegments(HERO_BODY);

  return (
    <ProductChrome active="home">
      <div className="cp-landing">
        <section className="cp-landing-hero" aria-label="Hero">
          <div className="cp-landing-copy">
            <p className="cp-landing-soft">{HERO_SOFT}</p>
            <h1 className="cp-landing-h1">
              <span style={{ display: "block" }}>{HERO_LINE_1}</span>
              <span className="cp-landing-h1-mark">{HERO_LINE_2}</span>
            </h1>
            <p className="cp-landing-body">
              {bodyParts.map((p, i) =>
                p.bold ? (
                  <strong key={i} style={{ color: "var(--tx-hi)", fontWeight: 650 }}>
                    {p.text}
                  </strong>
                ) : (
                  <span key={i}>{p.text}</span>
                ),
              )}
            </p>
            <ul className="cp-status-chips" aria-label="Product status">
              {PRODUCT_STATUS_CHIPS.map((c) => (
                <li key={c.label} data-status={c.status}>
                  {c.label}
                  {c.status === "ready" ? " ✓" : " · limited"}
                </li>
              ))}
            </ul>
            <div className="cp-cta-row">
              <Link href="/audit" className="cp-cta-primary">
                Audit a Safe →
              </Link>
            </div>
            <div className="cp-demo-row">
              <Link
                href={`/audit?safe=${TERM_SAFE}&block=${TERM_BLOCK}&digest=${TERM_DIGEST}`}
                className="cp-demo-link"
              >
                Open the Term proof
              </Link>
              <Link href="/pilots" className="cp-demo-link">
                What counts as a pilot
              </Link>
              <Link href="/docs" className="cp-demo-link">
                Docs
              </Link>
            </div>
          </div>
          <div className="cp-landing-stage-wrap">
            <ControlPlaneStage />
          </div>
        </section>

        <section className="cp-how" aria-labelledby="how-memory-title">
          <HowMemoryWorks />
          <SystemFlowBoard />
          <div className="cp-cta-row" style={{ marginTop: 28 }}>
            <Link href="/audit" className="cp-cta-primary">
              Audit a Safe →
            </Link>
            <Link href="/integrate" className="cp-cta-secondary">
              Integrate into your product →
            </Link>
          </div>
          <p className="cp-honesty">
            Absence of findings ≠ SAFE. Static decode ≠ fork simulation. Cannot
            detect compromised keys. Roles v1 is named and not interpreted.
            Condition amounts stay unknown. Mainnet only (chainId 1). How to
            use: <a href="/docs">/docs</a> · Builders:{" "}
            <a href="/integrate">/integrate</a> · Roadmap:{" "}
            <a href="/vision">/vision</a>.
          </p>
        </section>
      </div>
    </ProductChrome>
  );
}
