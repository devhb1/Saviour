import Link from "next/link";
import { ProductChrome } from "../components/ProductChrome";
import { LandingHook } from "../components/LandingHook";
import { TERM_SAFE } from "../lib/termProof";

export default function Home() {
  return (
    <ProductChrome active="home">
      <div className="cp-landing">
        <LandingHook />
        <section className="cp-how" aria-labelledby="how-title">
          <p className="cp-how-eyebrow">// HOW IT WORKS</p>
          <h2 id="how-title" className="cp-how-title">
            Audit. Pin. Second person checks.
          </h2>
          <p className="cp-tool-lead" style={{ marginTop: 12 }}>
            Standing authority on a mainnet Safe at one block. The signer still
            decides in Safe. This report never says the Safe is safe.
          </p>
          <ol className="cp-how-list" style={{ marginTop: 20 }}>
            <li>
              <span className="cp-how-n">01</span>
              <span>
                Paste a Safe. Read owners, modules, Delay, and Roles v2.1.1
                selectors.
              </span>
            </li>
            <li>
              <span className="cp-how-n">02</span>
              <span>
                Share the pin: Safe, block, and digest. A quiet report is not a
                pass — read Coverage.
              </span>
            </li>
            <li>
              <span className="cp-how-n">03</span>
              <span>
                A second person opens the pin. Digest match means this engine
                reproduced the report. They approve only in Safe.
              </span>
            </li>
          </ol>

          <h3
            style={{
              margin: "36px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: 18,
              color: "var(--tx-hi)",
            }}
          >
            What it cannot do
          </h3>
          <ul
            style={{
              margin: "12px 0 0",
              paddingLeft: 18,
              lineHeight: 1.55,
              fontSize: 14,
              color: "var(--tx)",
              maxWidth: 640,
            }}
          >
            <li>Never stamps SAFE. Empty findings are not an endorsement.</li>
            <li>
              Roles v1, including the 16 Nov 2026 module, is named and not
              interpreted.
            </li>
            <li>
              Condition amounts stay unknown. Unread modules stay UNKNOWN as
              their own principals.
            </li>
            <li>
              Does not detect compromised keys, hold keys, or block a signature.
            </li>
          </ul>

          <div className="cp-cta-row" style={{ marginTop: 28 }}>
            <Link href="/audit" className="cp-cta-primary">
              Audit a Safe →
            </Link>
            <Link
              href={`/audit?safe=${TERM_SAFE}&run=1`}
              className="cp-cta-secondary"
            >
              Try the Term Safe
            </Link>
            <Link href="/integrate" className="cp-cta-secondary">
              Integrate →
            </Link>
          </div>
          <p className="cp-honesty">
            Mainnet only (chainId 1). How to use: <a href="/docs">/docs</a> ·
            Builders: <a href="/integrate">/integrate</a> · Roadmap:{" "}
            <a href="/vision">/vision</a>.
          </p>
        </section>
      </div>
    </ProductChrome>
  );
}
