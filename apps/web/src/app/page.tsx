import Link from "next/link";
import { ProductChrome } from "../components/ProductChrome";
import { LandingHook } from "../components/LandingHook";
import { HowMemoryWorks } from "../components/HowMemoryWorks";
import { SystemFlowBoard } from "../components/SystemFlowBoard";

export default function Home() {
  return (
    <ProductChrome active="home">
      <div className="cp-landing">
        <LandingHook />
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
