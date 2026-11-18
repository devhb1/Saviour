"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TERM_BLOCK, TERM_DIGEST, TERM_SAFE } from "../lib/termProof";
import {
  HERO_BODY,
  HERO_FRAMING,
  HERO_LINE_1,
  HERO_LINE_2,
  HERO_SOFT,
  heroBodySegments,
} from "../lib/productStory";

const HEX = /^0x[a-fA-F0-9]{40}$/;

const TERM_PIN = `/audit?safe=${TERM_SAFE}&block=${TERM_BLOCK}&digest=${TERM_DIGEST}`;

/**
 * First viewport. Same composition as the archived Hook:
 * thesis and a field on the left, a result card on the right.
 */
export function LandingHook() {
  const router = useRouter();
  const [draft, setDraft] = useState(TERM_SAFE);
  const [error, setError] = useState<string | null>(null);

  function audit(next?: string) {
    const safe = (next ?? draft).trim();
    if (!HEX.test(safe)) {
      setError("Paste a mainnet Safe: 0x and 40 hex characters.");
      return;
    }
    setError(null);
    setDraft(safe);
    router.push(`/audit?safe=${safe}&run=1`);
  }

  return (
    <section className="landing-hook" aria-label="Hero">
      <div className="landing-pills" aria-label="Scope">
        <span>MAINNET</span>
        <span>CHAIN ID 1</span>
        <span className="landing-pill-live">READ-ONLY</span>
      </div>

      <div className="landing-grid">
        <div>
          <p className="landing-soft">{HERO_SOFT}</p>
          <h1 className="landing-h1">
            <span>{HERO_LINE_1}</span>
            <span className="landing-mark">{HERO_LINE_2}</span>
          </h1>
          <p className="landing-body">
            {heroBodySegments(HERO_BODY).map((seg, i) =>
              seg.bold ? (
                <strong key={i}>{seg.text}</strong>
              ) : (
                <span key={i}>{seg.text}</span>
              ),
            )}
          </p>

          <div className="landing-field">
            <p className="landing-framing">{HERO_FRAMING}</p>
            <div className="landing-field-row">
              <input
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") audit();
                }}
                aria-label="Safe address to audit"
                spellCheck={false}
              />
              <button type="button" onClick={() => audit()}>
                AUDIT
              </button>
            </div>
            <div className="landing-chips">
              <button
                type="button"
                data-on={draft.toLowerCase() === TERM_SAFE.toLowerCase()}
                onClick={() => {
                  setDraft(TERM_SAFE);
                  setError(null);
                }}
              >
                Term Safe
              </button>
            </div>
            {error ? (
              <p className="landing-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="landing-actions">
            <Link href={TERM_PIN} className="landing-go">
              Explore pinned reference report →
            </Link>
            <Link href="/integrate" className="landing-ghost">
              Add to your product
            </Link>
          </div>
        </div>

        <div className="landing-card-col">
          <article className="landing-card" aria-label="Term Safe report shape">
            <header className="landing-card-top">
              <span>SAMPLE · block {TERM_BLOCK}</span>
              <span>illustrative</span>
            </header>
            <p className="landing-verdict">INCONCLUSIVE</p>
            <p className="landing-status">COVERAGE INCOMPLETE</p>
            <p className="landing-card-copy">
              Owner set on this pin is burned, so those owners cannot sign.
              Roles conditions stay unread. Incomplete Coverage is not a finding
              that the Safe is malicious.
            </p>
            <ul className="landing-card-rows" aria-label="Sample Reach rows">
              <li>
                <span>Owner set</span>
                <strong>BOUNDED</strong>
              </li>
              <li>
                <span>Roles permissions</span>
                <strong>UNKNOWN</strong>
              </li>
              <li>
                <span>Delay lifecycle</span>
                <strong>PARTIAL</strong>
              </li>
            </ul>
            <p className="landing-addr">{TERM_SAFE}</p>
            <p className="landing-meter">
              digest {TERM_DIGEST.slice(0, 12)}… · mainnet · $0
            </p>
          </article>

          <div className="landing-proof">
            <div>
              <p className="landing-proof-kicker">THE REPORT NEVER SAYS SAFE</p>
              <p className="landing-proof-title">YOU DECIDE IN SAFE.</p>
              <p className="landing-proof-body">
                Open the pin with block and digest. A second person re-audits
                that block and checks digest match. Saviour does not hold the
                key and does not block the signature.
              </p>
            </div>
            <Link href={TERM_PIN} className="landing-proof-btn">
              Open the pin →
            </Link>
          </div>

          <ul className="landing-stats">
            <li>Mainnet</li>
            <li>Roles v2.1.1 selectors</li>
            <li>amounts UNKNOWN</li>
            <li>digest = re-run</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
