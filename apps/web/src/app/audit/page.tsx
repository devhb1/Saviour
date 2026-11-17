"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AuthorityAuditReport, GoldenReport } from "@saviours/check";
import { TERM_SAFE } from "../../components/ProductChrome";
import { ExplainPanel } from "./ExplainPanel";

/**
 * Permission Auditor — Safe → Findings · Coverage · Freshness · Reach
 */
export default function AuditPage() {
  const [safe, setSafe] = useState("");
  const [block, setBlock] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AuthorityAuditReport | null>(null);
  const [golden, setGolden] = useState<GoldenReport | null>(null);
  const [pinUrl, setPinUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [noteCopied, setNoteCopied] = useState(false);
  const [digestCheck, setDigestCheck] = useState<"match" | "mismatch" | null>(
    null,
  );
  const [operatorName, setOperatorName] = useState("");
  const [witnessName, setWitnessName] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const autoRan = useRef(false);
  const expectedDigest = useRef<string | null>(null);

  const runAudit = useCallback(
    async (addr?: string, blockOverride?: string | null) => {
      const target = (addr ?? safe).trim();
      const pinned = blockOverride !== undefined ? blockOverride : block;
      if (!/^0x[a-fA-F0-9]{40}$/.test(target)) {
        setError("Enter a mainnet Safe address (0x + 40 hex).");
        setLoading(false);
        return;
      }
      setSafe(target);
      if (blockOverride !== undefined) setBlock(blockOverride);
      setLoading(true);
      setError(null);
      setPinUrl(null);
      setGolden(null);
      setDigestCheck(null);
      try {
        const q = new URLSearchParams({ safe: target, chainId: "1" });
        if (pinned) q.set("block", pinned);
        const r = await fetch(`/api/audit?${q}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? r.statusText);
        setReport(j.report as AuthorityAuditReport);

        const pin = await fetch("/api/report", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ report: j.report }),
        });
        const pj = await pin.json();
        if (pin.ok && pj.golden) {
          setGolden(pj.golden as GoldenReport);
        }
        const pinnedBlock = j.report?.freshness?.blockNumber as
          | string
          | undefined;
        const digest = (pj.golden?.reportDigest ?? pj.digest) as
          | string
          | undefined;
        const expected = expectedDigest.current;
        if (expected && digest) {
          setDigestCheck(
            expected.toLowerCase() === digest.toLowerCase()
              ? "match"
              : "mismatch",
          );
        }
        if (pinnedBlock && digest) {
          const shareDigest =
            expected && digest && expected.toLowerCase() !== digest.toLowerCase()
              ? expected
              : digest;
          setPinUrl(
            `${window.location.origin}/audit?safe=${encodeURIComponent(target)}&block=${pinnedBlock}&digest=${shareDigest}`,
          );
        }

        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.set("safe", target);
          if (pinnedBlock) url.searchParams.set("block", pinnedBlock);
          else url.searchParams.delete("block");
          const shareDigest =
            expected && digest && expected.toLowerCase() !== digest.toLowerCase()
              ? expected
              : digest;
          if (shareDigest) url.searchParams.set("digest", shareDigest);
          url.searchParams.delete("run");
          window.history.replaceState(
            {},
            "",
            url.pathname + "?" + url.searchParams.toString(),
          );
        }
      } catch (e) {
        setReport(null);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [safe, block],
  );

  useEffect(() => {
    if (typeof window === "undefined" || autoRan.current) return;
    const q = new URLSearchParams(window.location.search);
    const fromUrl = q.get("safe");
    const fromBlock = q.get("block");
    const fromDigest = q.get("digest");
    const run = q.get("run") === "1";
    if (fromDigest && /^[a-fA-F0-9]{64}$/.test(fromDigest)) {
      expectedDigest.current = fromDigest.toLowerCase();
    }
    if (fromBlock && /^\d+$/.test(fromBlock)) setBlock(fromBlock);
    if (fromUrl && /^0x[a-fA-F0-9]{40}$/.test(fromUrl)) {
      setSafe(fromUrl);
      if (run || q.has("safe")) {
        autoRan.current = true;
        void runAudit(
          fromUrl,
          fromBlock && /^\d+$/.test(fromBlock) ? fromBlock : null,
        );
      }
    } else if (run) {
      autoRan.current = true;
      void runAudit(TERM_SAFE);
    }
  }, [runAudit]);

  async function copyPinnedOrLive() {
    const url =
      pinUrl ??
      `${window.location.origin}/audit?safe=${encodeURIComponent(safe.trim())}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function copyForSigner() {
    if (!pinUrl) return;
    const note = [
      "Read of our Safe before we sign.",
      `Open this and check it says digest match: ${pinUrl}`,
      "It says who can act. It does not say the Safe is safe.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(note);
      setNoteCopied(true);
      window.setTimeout(() => setNoteCopied(false), 2000);
    } catch {
      setNoteCopied(false);
    }
  }

  function downloadGolden() {
    if (!golden) return;
    const blob = new Blob([JSON.stringify(golden, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `saviour-audit-${golden.reportDigest?.slice(0, 12) ?? "report"}.json`;
    a.click();
  }

  async function buildReceipt() {
    if (!report || !golden?.reportDigest || !pinUrl) return;
    setReceiptError(null);
    try {
      const r = await fetch("/api/audit/receipt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          report,
          operator: operatorName,
          witness: witnessName,
          pinUrl,
          digest: golden.reportDigest,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? r.statusText);
      setReceipt(j.markdown as string);
      const blob = new Blob([j.markdown], { type: "text/markdown" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `saviour-pilot-${golden.reportDigest.slice(0, 12)}.md`;
      a.click();
    } catch (e) {
      setReceipt(null);
      setReceiptError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="cp-tool">
      <p className="cp-tool-eyebrow">
        Safe Treasury Permission Auditor · mainnet
      </p>
      <h1 className="cp-tool-h1">Audit who can act through your Safe</h1>
      <p className="cp-tool-lead">
        Independent reconstruction from mainnet. No fixture injection on this
        page. Report axes: <strong>Findings</strong> · <strong>Coverage</strong>{" "}
        · <strong>Freshness</strong> · <strong>Reach</strong>. Roles v2.1.1
        permissions come from chain logs; condition quantities stay unassessed.
      </p>
      <p className="cp-honesty-rail" role="note">
        Absence of findings ≠ SAFE · incomplete Coverage ≠ safe · cannot detect
        compromised keys · never SAFE
      </p>

      <label className="cp-field">
        Safe address
        <input
          value={safe}
          onChange={(e) => setSafe(e.target.value.trim())}
          placeholder="0x…"
        />
      </label>

      <div className="cp-actions">
        <button
          type="button"
          className="cp-btn-loud"
          onClick={() => void runAudit()}
          disabled={loading}
        >
          {loading ? "Auditing…" : "Run audit"}
        </button>
        <button
          type="button"
          className="cp-btn-quiet"
          onClick={() => void runAudit(TERM_SAFE, null)}
        >
          Audit Term Safe (live mainnet)
        </button>
        {report ? (
          <>
            <button
              type="button"
              className="cp-btn-quiet"
              onClick={() => void copyPinnedOrLive()}
            >
              {copied
                ? "Copied"
                : pinUrl
                  ? "Copy pinned report link"
                  : "Copy live re-run link"}
            </button>
            {golden ? (
              <button
                type="button"
                className="cp-btn-quiet"
                onClick={downloadGolden}
              >
                Export golden JSON
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {pinUrl ? (
        <p
          style={{
            marginTop: 12,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--sig)",
          }}
        >
          Pinned block: <a href={pinUrl}>{pinUrl}</a>
          {digestCheck === "match" ? " · digest match" : null}
          {digestCheck === "mismatch" ? " · digest mismatch" : null}
          {" · "}
          <Link
            href={`/audit?safe=${encodeURIComponent(safe.trim())}`}
            style={{ color: "var(--tx-lo)" }}
          >
            Live re-run (latest state)
          </Link>
        </p>
      ) : null}

      {pinUrl && /^0x[a-fA-F0-9]{40}$/.test(safe.trim()) ? (
        <section style={{ marginTop: 16 }}>
          <h2 className="cp-section-label">Hand this to someone else</h2>
          <p style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.45 }}>
            A signer pastes the note into chat. A protocol calls the same Safe
            from their own app. Either one counts as adoption only when they
            are outside this team.
          </p>
          <div className="cp-actions">
            <button
              type="button"
              className="cp-btn-quiet"
              onClick={() => void copyForSigner()}
            >
              {noteCopied ? "Copied note" : "Copy note for the other signer"}
            </button>
            <Link href="/integrate#sdk" className="cp-btn-quiet">
              Use it inside your app
            </Link>
          </div>
          <pre className="cp-evidence" style={{ marginTop: 8 }}>{`GET /api/audit?safe=${safe.trim()}&chainId=1`}</pre>
        </section>
      ) : null}

      {report && golden?.reportDigest && pinUrl ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void buildReceipt();
          }}
          style={{ marginTop: 16 }}
        >
          <h2 className="cp-section-label">Pilot receipt</h2>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--tx-lo)" }}>
            A receipt counts only when the operator is outside this team and a
            second person opens the pin link and sees digest match.{" "}
            <Link href="/pilots" style={{ color: "var(--sig)" }}>
              What counts
            </Link>
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label style={{ flex: 1, minWidth: 180 }}>
              <span className="cp-section-label">Operator</span>
              <input
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="Name"
                maxLength={80}
                style={{ width: "100%", marginTop: 4 }}
              />
            </label>
            <label style={{ flex: 1, minWidth: 180 }}>
              <span className="cp-section-label">Witness</span>
              <input
                value={witnessName}
                onChange={(e) => setWitnessName(e.target.value)}
                placeholder="Second person, if any"
                maxLength={80}
                style={{ width: "100%", marginTop: 4 }}
              />
            </label>
            <button
              type="submit"
              className="cp-btn-quiet"
              disabled={operatorName.trim().length < 2}
              style={{ alignSelf: "end" }}
            >
              Download receipt
            </button>
          </div>
          {receiptError ? (
            <p role="alert" style={{ color: "var(--red)", marginTop: 8 }}>
              {receiptError}
            </p>
          ) : null}
          {receipt ? (
            <pre className="cp-evidence" style={{ marginTop: 8 }}>
              {receipt}
            </pre>
          ) : null}
        </form>
      ) : null}

      {error ? (
        <p role="alert" style={{ color: "var(--red)", marginTop: 16 }}>
          {error}
        </p>
      ) : null}

      {report ? (
        <ReportPanel report={report} safe={safe} golden={golden} />
      ) : null}

      <p
        style={{
          marginTop: 32,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--tx-lo)",
        }}
      >
        Change review ·{" "}
        <Link
          href={`/review?safe=${encodeURIComponent(safe.trim())}`}
          style={{ color: "var(--sig)" }}
        >
          Review a change on this Safe
        </Link>
        {" · "}
        <Link href="/docs" style={{ color: "var(--sig)" }}>
          Docs
        </Link>
        {" · "}
        <Link href="/integrate" style={{ color: "var(--sig)" }}>
          Integrate
        </Link>
      </p>
    </main>
  );
}

function ReportPanel({
  report,
  safe,
  golden,
}: {
  report: AuthorityAuditReport;
  safe: string;
  golden: GoldenReport | null;
}) {
  const sevOrder = { CRITICAL: 0, WARN: 1, INFO: 2 } as const;
  const findings = [...report.findings].sort(
    (a, b) => sevOrder[a.severity] - sevOrder[b.severity],
  );

  return (
    <div style={{ marginTop: 8 }}>
      <ExplainPanel report={report} />

      <h2 className="cp-section-label">Freshness</h2>
      {report.freshness ? (
        <pre className="cp-evidence">
          {`engine ${report.version}${golden?.rolesModelVersion ? ` · rolesModel ${golden.rolesModelVersion}` : ""}
chain ${report.freshness.chainId} · block ${report.freshness.blockNumber}
hash ${report.freshness.blockHash}${report.freshness.rpcUrlHost ? `\nrpc ${report.freshness.rpcUrlHost}` : ""}${golden?.reportDigest ? `\ndigest ${golden.reportDigest}` : ""}`}
        </pre>
      ) : (
        <p
          style={{
            color: "var(--tx-lo)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}
        >
          Unavailable
        </p>
      )}

      <h2 className="cp-section-label">Coverage components</h2>
      <p style={{ margin: "0 0 8px", fontSize: 14 }}>
        complete:{" "}
        <strong>{report.coverage.complete ? "true" : "false"}</strong>
        {" — "}Roles-only assessed never means the whole Safe is assessed
      </p>
      <ul
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          listStyle: "none",
          padding: 0,
          margin: "0 0 12px",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
        }}
      >
        {(report.coverage.components ?? []).map((c) => (
          <li
            key={c.id}
            style={{
              border: "1px solid var(--line, #333)",
              padding: "4px 8px",
            }}
            title={c.detail}
          >
            {c.id}: <strong>{c.status}</strong>
          </li>
        ))}
      </ul>
      {report.coverage.gaps.length ? (
        <details>
          <summary style={{ cursor: "pointer", fontSize: 13 }}>
            Gaps ({report.coverage.gaps.length})
          </summary>
          <pre className="cp-evidence">
            {JSON.stringify(report.coverage.gaps, null, 2)}
          </pre>
        </details>
      ) : null}

      <h2 className="cp-section-label">Reach</h2>
      {report.reach?.principals?.length ? (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px" }}>
          {report.reach.principals.map((p) => (
            <li
              key={p.principalId}
              className="cp-finding"
              data-sev={
                p.verdict === "UNBOUNDED"
                  ? "CRITICAL"
                  : p.verdict === "UNKNOWN"
                    ? "WARN"
                    : "INFO"
              }
            >
              <div style={{ fontWeight: 600 }}>
                [{p.verdict}] {p.principalId}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--tx-lo)",
                }}
              >
                {p.reasons[0] ?? ""}
                {p.patterns.length
                  ? ` · ${p.patterns.slice(0, 4).join(", ")}`
                  : ""}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p
          style={{
            color: "var(--tx-lo)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          (no Reach principals — see Coverage)
        </p>
      )}

      <h2 className="cp-section-label">Findings</h2>
      {findings.length === 0 ? (
        <p
          style={{
            color: "var(--tx-lo)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}
        >
          (none — check Coverage)
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {findings.map((f) => (
            <li key={f.id} className="cp-finding" data-sev={f.severity}>
              <div style={{ fontWeight: 600 }}>
                [{f.severity}] {f.rule}
              </div>
              <div>{f.title}</div>
              <div
                style={{
                  marginTop: 4,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--tx-lo)",
                }}
              >
                {f.detail}
              </div>
              {f.evidence?.length ? (
                <details style={{ marginTop: 6 }}>
                  <summary style={{ cursor: "pointer", fontSize: 12 }}>
                    Evidence
                  </summary>
                  <pre className="cp-evidence">
                    {f.evidence.join("\n")}
                  </pre>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {report.errors?.length ? (
        <>
          <h2 className="cp-section-label">Errors</h2>
          <pre className="cp-evidence">{report.errors.join("\n")}</pre>
        </>
      ) : null}

      {report.assumptions?.length ? (
        <>
          <h2 className="cp-section-label">Assumptions (fixture)</h2>
          <pre className="cp-evidence">{report.assumptions.join("\n")}</pre>
        </>
      ) : null}

      <h2 className="cp-section-label">Limitations</h2>
      <ul
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--tx-lo)",
          marginBottom: 16,
        }}
      >
        <li>Does not detect compromised keys or guarantee drain prevention.</li>
        <li>Non-2.1.1 Roles identified only — not silently interpreted.</li>
        <li>
          Roles v2.1.1 targets and members come from chain logs. Condition
          trees are counted, not turned into token amounts.
        </li>
        <li>Delay lifecycle not fully assessed.</li>
        <li>
          A shared link re-audits the pinned block. A stored /report digest
          exists only when this server can write the golden file.
        </li>
      </ul>

      {report.graph ? (
        <details>
          <h2 className="cp-section-label" style={{ display: "inline" }}>
            Graph summary
          </h2>
          <pre className="cp-evidence">
            {JSON.stringify(
              {
                version: report.graph.safe.version,
                threshold: report.graph.safe.threshold,
                owners: report.graph.safe.owners,
                modules: report.graph.safe.modules,
                delays: report.graph.delays.map((d) => ({
                  address: d.address,
                  txCooldown: d.txCooldown,
                  txExpiration: d.txExpiration,
                })),
                edgeKinds: report.graph.edges.map((e) => e.kind),
              },
              null,
              2,
            )}
          </pre>
        </details>
      ) : null}

      <p style={{ marginTop: 20 }}>
        <Link
          href={`/review?safe=${encodeURIComponent(safe.trim())}`}
          className="cp-btn-loud"
          style={{ display: "inline-block", textDecoration: "none" }}
        >
          Review a change on this Safe →
        </Link>
      </p>
    </div>
  );
}
