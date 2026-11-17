import Link from "next/link";
import { ProductChrome, TERM_SAFE } from "../components/ProductChrome";
import { ControlPlaneStage } from "../components/ControlPlaneStage";
import { HowMemoryWorks } from "../components/HowMemoryWorks";
import { SystemFlowBoard } from "../components/SystemFlowBoard";
import {
  BRAND,
  HERO_BODY,
  HERO_LINE_1,
  HERO_LINE_2,
  HERO_SOFT,
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
            <p className="cp-landing-brand">{BRAND}</p>
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
            <div className="cp-cta-row">
              <Link href="/audit" className="cp-cta-primary">
                Audit a Safe →
              </Link>
              <Link href="/review" className="cp-cta-secondary">
                Review a transaction →
              </Link>
            </div>
            <div className="cp-demo-row">
              <Link
                href={`/audit?safe=${TERM_SAFE}&run=1`}
                className="cp-demo-link"
              >
                Try Term reference Safe
              </Link>
              <Link href="/review?demo=term" className="cp-demo-link">
                Try Term Prop 5 review
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
            <Link href="/review" className="cp-cta-secondary">
              Review a transaction →
            </Link>
          </div>
          <p className="cp-honesty">
            Absence of findings ≠ SAFE. Static decode ≠ fork simulation. Cannot
            detect compromised keys. Mainnet Delay/module reads only (chainId 1).
          </p>
        </section>
      </div>
    </ProductChrome>
  );
}
