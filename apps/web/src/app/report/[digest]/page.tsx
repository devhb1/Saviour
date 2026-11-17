"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { GoldenReport } from "@saviours/check";

export default function PinnedReportPage() {
  const params = useParams();
  const digest = String(params.digest ?? "");
  const [golden, setGolden] = useState<GoldenReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!digest || !/^[a-f0-9]{64}$/i.test(digest)) {
      setError("Invalid digest");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(
          `/api/report?digest=${encodeURIComponent(digest.toLowerCase())}`,
        );
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? r.statusText);
        if (!cancelled) setGolden(j.golden as GoldenReport);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [digest]);

  return (
    <main className="cp-tool">
      <p className="cp-tool-eyebrow">Pinned report · immutable artifact</p>
      <h1 className="cp-tool-h1">Pinned Permission Audit</h1>
      <p className="cp-honesty-rail" role="note">
        This page shows a <strong>pinned</strong> snapshot. It is not a live
        re-run.{" "}
        {golden?.safeAddress ? (
          <Link
            href={`/audit?safe=${encodeURIComponent(golden.safeAddress)}`}
            style={{ color: "var(--sig)" }}
          >
            Live re-run latest →
          </Link>
        ) : null}
      </p>
      <pre className="cp-evidence">digest {digest}</pre>

      {loading ? <p>Loading…</p> : null}
      {error ? (
        <p role="alert" style={{ color: "var(--red)" }}>
          {error}
          <br />
          <span style={{ color: "var(--tx-lo)", fontSize: 13 }}>
            Pinned storage may be instance-local. Re-run audit and export golden
            JSON if this digest is unavailable.
          </span>
        </p>
      ) : null}

      {golden ? (
        <div style={{ marginTop: 16 }}>
          <h2 className="cp-section-label">Freshness (pinned)</h2>
          <pre className="cp-evidence">
            {`safe ${golden.safeAddress}
engine ${golden.engineVersion} · rolesModel ${golden.rolesModelVersion}
block ${golden.freshness?.blockNumber ?? "?"}
hash ${golden.freshness?.blockHash ?? "?"}
digest ${golden.reportDigest}`}
          </pre>

          <h2 className="cp-section-label">Coverage</h2>
          <ul
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              listStyle: "none",
              padding: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          >
            {(golden.coverage.components ?? []).map((c) => (
              <li
                key={c.id}
                style={{
                  border: "1px solid var(--line,#333)",
                  padding: "4px 8px",
                }}
              >
                {c.id}: {c.status}
              </li>
            ))}
          </ul>

          <h2 className="cp-section-label">Reach</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {(golden.reach?.principals ?? []).map((p) => (
              <li
                key={p.principalId}
                className="cp-finding"
                data-sev={
                  p.verdict === "UNBOUNDED" ? "CRITICAL" : "WARN"
                }
              >
                [{p.verdict}] {p.principalId}
              </li>
            ))}
          </ul>

          <h2 className="cp-section-label">Findings</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {golden.findings.map((f) => (
              <li key={f.id} className="cp-finding" data-sev={f.severity}>
                [{f.severity}] {f.rule} — {f.title}
              </li>
            ))}
          </ul>

          <details>
            <summary>Full golden JSON</summary>
            <pre className="cp-evidence">{JSON.stringify(golden, null, 2)}</pre>
          </details>
        </div>
      ) : null}
    </main>
  );
}
