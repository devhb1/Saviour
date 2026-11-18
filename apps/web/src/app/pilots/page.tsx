import Link from "next/link";
import { ProductChrome } from "../../components/ProductChrome";
import { TERM_BLOCK, TERM_DIGEST, TERM_SAFE } from "../../lib/termProof";

export default function PilotsPage() {
  const pin = `/audit?safe=${TERM_SAFE}&block=${TERM_BLOCK}&digest=${TERM_DIGEST}`;
  return (
    <ProductChrome active="pilots">
      <main className="cp-how" style={{ maxWidth: 820 }}>
        <p className="cp-how-eyebrow">// ADOPTION</p>
        <h1 className="cp-how-title" style={{ fontSize: "clamp(28px, 4vw, 40px)" }}>
          What counts as a pilot
        </h1>
        <p style={{ marginTop: 12, color: "var(--tx-lo)", lineHeight: 1.5, maxWidth: 640 }}>
          The grant bar is three operators outside this team, each running the
          same Safe twice, with a second person confirming the digest. A team
          audit does not count. A receipt does not check the names on it.
        </p>

        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 18 }}>Three ways in</h2>
          <ul style={{ lineHeight: 1.55, paddingLeft: 18 }}>
            <li>
              A signer opens <Link href="/audit">/audit</Link>, pastes the Safe,
              and copies the note for the other signer.
            </li>
            <li>
              A treasury does the same before a signer call, then downloads the
              receipt with both names.
            </li>
            <li>
              A protocol calls <code>GET /api/audit?safe=0x…&chainId=1</code> or
              installs{" "}
              <a href="https://www.npmjs.com/package/@saviours/audit">
                <code>@saviours/audit</code>
              </a>
              . Signing stays in Safe.{" "}
              <Link href="/integrate">Integrate</Link>
            </li>
          </ul>
        </section>

        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 18 }}>How an operator does one run</h2>
          <ol style={{ lineHeight: 1.55, paddingLeft: 18 }}>
            <li>
              Open <Link href="/audit">/audit</Link> and paste the treasury Safe.
            </li>
            <li>Copy the pin link. It carries the Safe, the block, and the digest.</li>
            <li>
              A second person opens that link. The page must say digest match.
            </li>
            <li>
              Download the pilot receipt with both names and keep it with the
              pin link.
            </li>
            <li>
              After a real policy change, run the same Safe again. That is run 2.
            </li>
          </ol>
        </section>

        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 18 }}>Team proof, not a pilot</h2>
          <p style={{ lineHeight: 1.5 }}>
            Term Safe {TERM_SAFE} at block {TERM_BLOCK}. Digest {TERM_DIGEST}.
            Owner set was BOUNDED because the owner is the dead address. The
            roles principal was UNKNOWN. This was run by the Saviour team on
            17 Nov 2026. It does not count.
          </p>
          <p>
            <Link href={pin}>Re-audit that block</Link>
          </p>
        </section>
      </main>
    </ProductChrome>
  );
}
