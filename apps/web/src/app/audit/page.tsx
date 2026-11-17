"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AuthorityAuditReport } from "@saviours/check";
import { TERM_SAFE } from "../../components/ProductChrome";

/**
 * Control-Path Auditor — Safe address → Findings · Coverage · Freshness
 */
export default function AuditPage() {
  const [safe, setSafe] = useState(TERM_SAFE);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AuthorityAuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const autoRan = useRef(false);

  const runAudit = useCallback(
    async (addr?: string) => {
      const target = (addr ?? safe).trim();
      setSafe(target);
      setLoading(true);
      setError(null);
      try {
        const q = new URLSearchParams({ safe: target, chainId: "1" });
        const r = await fetch(`/api/audit?${q}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? r.statusText);
        setReport(j.report as AuthorityAuditReport);
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.set("safe", target);
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
    [safe],
  );

  useEffect(() => {
    if (typeof window === "undefined" || autoRan.current) return;
    const q = new URLSearchParams(window.location.search);
    const fromUrl = q.get("safe");
    const run = q.get("run") === "1";
    if (fromUrl && /^0x[a-fA-F0-9]{40}$/.test(fromUrl)) {
      setSafe(fromUrl);
      if (run || q.has("safe")) {
        autoRan.current = true;
        void runAudit(fromUrl);
      }
    } else if (run) {
      autoRan.current = true;
      void runAudit(TERM_SAFE);
    }
  }, [runAudit]);

  async function copyShareLink() {
    const url = `${window.location.origin}/audit?safe=${encodeURIComponent(safe.trim())}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="cp-tool">
      <p className="cp-tool-eyebrow">Control-Path Auditor · mainnet</p>
      <h1 className="cp-tool-h1">Audit the power behind your Safe</h1>
      <p className="cp-tool-lead">
        Reconstruct owners, modules, Delay settings, and execution paths.
        Report axes: <strong>Findings</strong> · <strong>Coverage</strong> ·{" "}
        <strong>Freshness</strong>.
      </p>
      <p className="cp-honesty-rail" role="note">
        Absence of findings ≠ SAFE · incomplete Coverage must not be read as
        safe · cannot detect compromised keys
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
          onClick={() => void runAudit(TERM_SAFE)}
        >
          Load Term reference Safe
        </button>
        {report ? (
          <button
            type="button"
            className="cp-btn-quiet"
            onClick={() => void copyShareLink()}
          >
            {copied ? "Copied" : "Copy share link"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" style={{ color: "var(--red)", marginTop: 16 }}>
          {error}
        </p>
      ) : null}

      {report ? <ReportPanel report={report} safe={safe} /> : null}

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
        CLI <code>pnpm audit:cli --safe 0x…</code>
      </p>
    </main>
  );
}

function ReportPanel({
  report,
  safe,
}: {
  report: AuthorityAuditReport;
  safe: string;
}) {
  return (
    <div style={{ marginTop: 8 }}>
      <h2 className="cp-section-label">Freshness</h2>
      {report.freshness ? (
        <pre className="cp-evidence">
          {`chain ${report.freshness.chainId} · block ${report.freshness.blockNumber}\nhash ${report.freshness.blockHash}`}
        </pre>
      ) : (
        <p style={{ color: "var(--tx-lo)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
          Unavailable
        </p>
      )}

      <h2 className="cp-section-label">Coverage</h2>
      <p style={{ margin: "0 0 8px", fontSize: 14 }}>
        complete:{" "}
        <strong>{report.coverage.complete ? "true" : "false"}</strong>
        {" — "}incomplete Coverage must not be read as SAFE
      </p>
      <pre className="cp-evidence">
        {JSON.stringify(
          {
            reconstructed: report.coverage.reconstructed,
            gaps: report.coverage.gaps,
          },
          null,
          2,
        )}
      </pre>

      <h2 className="cp-section-label">Findings</h2>
      {report.findings.length === 0 ? (
        <p style={{ color: "var(--tx-lo)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
          (none — check Coverage)
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {report.findings.map((f) => (
            <li
              key={f.id}
              className="cp-finding"
              data-sev={f.severity}
            >
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
            </li>
          ))}
        </ul>
      )}

      {report.graph ? (
        <>
          <h2 className="cp-section-label">Graph summary</h2>
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
        </>
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
