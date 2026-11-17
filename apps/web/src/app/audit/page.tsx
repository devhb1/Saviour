"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import type { AuthorityAuditReport } from "@saviours/check";

const REFERENCE = "0x46DA347d1Db6EdCA62BF6Cd5892Dc284fC938613";

/**
 * Control-Path Auditor — Safe address → Findings · Coverage · Freshness
 */
export default function AuditPage() {
  const [safe, setSafe] = useState(REFERENCE);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AuthorityAuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAudit() {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ safe, chainId: "1" });
      const r = await fetch(`/api/audit?${q}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? r.statusText);
      setReport(j.report as AuthorityAuditReport);
    } catch (e) {
      setReport(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "32px 20px 64px", maxWidth: 880, margin: "0 auto" }}>
      <p style={eyebrow}>Control-Path Auditor · mainnet</p>
      <h1 style={{ fontSize: 28, margin: "8px 0 12px", letterSpacing: "-0.02em" }}>
        Audit the power behind your Safe
      </h1>
      <p style={{ color: "var(--muted, #8b919a)", marginBottom: 24, lineHeight: 1.5 }}>
        Reconstruct owners, modules, Delay settings, and execution paths. Report
        axes: <strong>Findings</strong> · <strong>Coverage</strong> ·{" "}
        <strong>Freshness</strong>. Absence of findings ≠ SAFE. Cannot detect
        compromised keys.
      </p>

      <label style={label}>
        Safe address
        <input
          value={safe}
          onChange={(e) => setSafe(e.target.value.trim())}
          placeholder="0x…"
          style={input}
        />
      </label>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <button
          type="button"
          onClick={() => void runAudit()}
          disabled={loading}
          style={primaryBtn}
        >
          {loading ? "Auditing…" : "Run audit"}
        </button>
        <button
          type="button"
          onClick={() => setSafe(REFERENCE)}
          style={chip}
        >
          Load Term reference Safe
        </button>
      </div>

      {error ? (
        <p role="alert" style={{ color: "var(--red, #f07178)", marginTop: 16 }}>
          {error}
        </p>
      ) : null}

      {report ? <ReportPanel report={report} /> : null}

      <p style={{ ...monoMuted, marginTop: 32 }}>
        Change review ·{" "}
        <Link href="/review" style={{ color: "var(--sig, #4c8dff)" }}>
          /review
        </Link>
        {" · "}
        CLI <code>pnpm audit:cli --safe 0x…</code>
      </p>
    </main>
  );
}

function ReportPanel({ report }: { report: AuthorityAuditReport }) {
  return (
    <div style={{ marginTop: 28 }}>
      <Section title="Freshness">
        {report.freshness ? (
          <pre style={pre}>
            {`chain ${report.freshness.chainId} · block ${report.freshness.blockNumber}\nhash ${report.freshness.blockHash}`}
          </pre>
        ) : (
          <p style={monoMuted}>Unavailable</p>
        )}
      </Section>

      <Section title="Coverage">
        <p style={{ marginBottom: 8 }}>
          complete:{" "}
          <strong>{report.coverage.complete ? "true" : "false"}</strong>
          {" — "}incomplete Coverage must not be read as SAFE
        </p>
        <pre style={pre}>
          {JSON.stringify(
            {
              reconstructed: report.coverage.reconstructed,
              gaps: report.coverage.gaps,
            },
            null,
            2,
          )}
        </pre>
      </Section>

      <Section title="Findings">
        {report.findings.length === 0 ? (
          <p style={monoMuted}>(none — check Coverage)</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {report.findings.map((f) => (
              <li
                key={f.id}
                style={{
                  borderLeft: `3px solid ${
                    f.severity === "CRITICAL"
                      ? "var(--red, #f07178)"
                      : "var(--amber, #e0a84a)"
                  }`,
                  padding: "10px 12px",
                  marginBottom: 10,
                  background: "var(--panel, #12151a)",
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  [{f.severity}] {f.rule}
                </div>
                <div>{f.title}</div>
                <div style={{ ...monoMuted, marginTop: 4 }}>{f.detail}</div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {report.graph ? (
        <Section title="Graph summary">
          <pre style={pre}>
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
        </Section>
      ) : null}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted, #8b919a)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

const eyebrow: CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "var(--sig, #4c8dff)",
  margin: 0,
};
const label: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  color: "var(--muted, #8b919a)",
};
const input: CSSProperties = {
  fontFamily: "ui-monospace, monospace",
  fontSize: 14,
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid var(--border, #2a3038)",
  background: "var(--panel, #12151a)",
  color: "inherit",
};
const primaryBtn: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 6,
  border: "none",
  background: "var(--sig, #4c8dff)",
  color: "#0b0d10",
  fontWeight: 600,
  cursor: "pointer",
};
const chip: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid var(--border, #2a3038)",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  fontSize: 13,
};
const monoMuted: CSSProperties = {
  fontFamily: "ui-monospace, monospace",
  fontSize: 12,
  color: "var(--muted, #8b919a)",
};
const pre: CSSProperties = {
  ...monoMuted,
  padding: 12,
  background: "var(--panel, #12151a)",
  borderRadius: 6,
  overflow: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
};
