"use client";

import { useState, type CSSProperties } from "react";
import { btnGhost, btnPrimary, DEMO_TARGETS } from "./AppShell";
import { EnsPassport } from "./EnsPassport";

export type WorkRow = {
  id: string;
  category: string;
  address: string;
  expected: string;
  note: string;
};

const DEFAULT_ROWS: WorkRow[] = [
  {
    id: "ATTACK-1",
    category: "Graph-verified TAINTED",
    address: DEMO_TARGETS[0].address,
    expected: "BLOCK · ens",
    note: "MakinaFi · FLASHLOAN ∧ ATOMIC",
  },
  {
    id: "BOT-1",
    category: "Graph-verified WATCH",
    address: DEMO_TARGETS[2].address,
    expected: "WARN · ens",
    note: "BOT_PROFILE — not overfit to TAINTED",
  },
  {
    id: "BENIGN-1",
    category: "Clean / not named",
    address: DEMO_TARGETS[3].address,
    expected: "ALLOW / no ENS name",
    note: "Circle treasury — SAFE ≠ endorsement",
  },
  {
    id: "ATTACK-2",
    category: "Provenance (labeled)",
    address: DEMO_TARGETS[1].address,
    expected: "may BLOCK if named",
    note: "HopeLend — not Graph-credited",
  },
];

type RowResult = {
  decision: string;
  source: string;
  ensName?: string;
  status?: string;
  threat?: string;
  latencyMs?: number;
  costNote?: string;
  error?: string;
};

/**
 * Live multi-address runner — shieldCheck per row (real gateway / local API).
 */
export function AgentWorklist({
  onSelect,
  onOpenIdentity,
}: {
  onSelect?: (address: string) => void;
  onOpenIdentity?: (address: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, RowResult>>({});
  const [passportAddr, setPassportAddr] = useState<string | null>(null);

  async function runOne(row: WorkRow) {
    setBusy(row.id);
    const t0 = performance.now();
    try {
      const res = await fetch("/api/shield/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chainId: 1,
          address: row.address,
          registryNetwork: "sepolia",
        }),
      });
      const json = (await res.json()) as {
        check?: {
          decision?: string;
          source?: string;
          ensName?: string;
          latencyMs?: number;
          records?: Record<string, string>;
        };
        error?: string;
      };
      const latencyMs = Math.round(performance.now() - t0);
      if (!res.ok) {
        setResults((r) => ({
          ...r,
          [row.id]: {
            decision: "ERROR",
            source: "—",
            error: json.error || res.statusText,
            latencyMs,
          },
        }));
        return;
      }
      const c = json.check;
      const status = c?.records?.["saviours.status"];
      const threat = c?.records?.["saviours.threat"];
      const hit = (c?.source || "").includes("ens") || c?.source === "registry";
      setResults((r) => ({
        ...r,
        [row.id]: {
          decision: c?.decision || "—",
          source: c?.source || "—",
          ensName: c?.ensName,
          status,
          threat,
          latencyMs: c?.latencyMs ?? latencyMs,
          costNote: hit
            ? "Settled $0 via Bazantic path · 0 Graph · 0 AI"
            : "Miss / no memory — investigate would meter via Bazantic",
        },
      }));
      if (c?.ensName && (status === "TAINTED" || status === "WATCH")) {
        setPassportAddr(row.address);
      }
      onSelect?.(row.address);
    } catch (e) {
      setResults((r) => ({
        ...r,
        [row.id]: {
          decision: "ERROR",
          source: "—",
          error: e instanceof Error ? e.message : "failed",
        },
      }));
    } finally {
      setBusy(null);
    }
  }

  async function runAll() {
    for (const row of DEFAULT_ROWS) {
      await runOne(row);
    }
  }

  const passportRow = DEFAULT_ROWS.find((r) => r.address === passportAddr);
  const passportRes = passportRow ? results[passportRow.id] : null;

  return (
    <div style={{ marginTop: 28 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "baseline",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              color: "var(--signal)",
            }}
          >
            REAL AGENT WORKLIST · LIVE SHIELD
          </p>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 14,
              color: "var(--ink-muted)",
              maxWidth: 560,
              lineHeight: 1.45,
            }}
          >
            Run categories live. Graph-verified heroes first. Clean addresses stay
            unnamed. Costs: MEMORY HIT = $0.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runAll()}
          disabled={busy !== null}
          style={btnPrimary}
        >
          {busy ? `Running ${busy}…` : "Run all live →"}
        </button>
      </div>

      <div style={{ overflowX: "auto", marginTop: 14 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            minWidth: 720,
          }}
        >
          <thead>
            <tr style={{ color: "var(--ink-muted)", textAlign: "left" }}>
              <th style={th}>category</th>
              <th style={th}>expected</th>
              <th style={th}>result</th>
              <th style={th}>source · cost</th>
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {DEFAULT_ROWS.map((row) => {
              const r = results[row.id];
              return (
                <tr key={row.id}>
                  <td style={td}>
                    <div style={{ color: "var(--ink)", fontWeight: 600 }}>
                      {row.category}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--ink-muted)",
                        marginTop: 4,
                      }}
                    >
                      {row.id} · {row.address.slice(0, 10)}…
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>
                      {row.note}
                    </div>
                  </td>
                  <td style={td}>{row.expected}</td>
                  <td style={td}>
                    {r ? (
                      <>
                        <strong
                          style={{
                            color:
                              r.decision === "BLOCK"
                                ? "var(--block)"
                                : r.decision === "WARN"
                                  ? "var(--warn)"
                                  : "var(--ink)",
                          }}
                        >
                          {r.decision}
                        </strong>
                        {r.latencyMs != null ? (
                          <span style={{ color: "var(--ink-muted)" }}>
                            {" "}
                            · {r.latencyMs}ms
                          </span>
                        ) : null}
                        {r.error ? (
                          <div style={{ color: "var(--block)", fontSize: 11 }}>
                            {r.error}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <span style={{ color: "var(--ink-muted)" }}>—</span>
                    )}
                  </td>
                  <td style={td}>
                    {r ? (
                      <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                        {r.source}
                        <br />
                        {r.costNote}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={td}>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void runOne(row)}
                      style={{ ...btnGhost, padding: "6px 10px", fontSize: 12 }}
                    >
                      Run
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {passportRes?.ensName ? (
        <div style={{ marginTop: 18 }}>
          <EnsPassport
            ensName={passportRes.ensName}
            status={passportRes.status}
            threat={passportRes.threat}
            address={passportAddr || undefined}
            onOpenIdentity={
              onOpenIdentity && passportAddr
                ? () => onOpenIdentity(passportAddr)
                : undefined
            }
          />
        </div>
      ) : null}

      <p
        style={{
          margin: "14px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-muted)",
          lineHeight: 1.5,
        }}
      >
        Terminal twin:{" "}
        <code style={{ color: "var(--ink)" }}>
          cd consumers/live-agent && pnpm start
        </code>{" "}
        — zero @saviours imports on ENS hot path.
      </p>
    </div>
  );
}

const th: CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid var(--line)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 500,
};

const td: CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid color-mix(in srgb, var(--line) 70%, transparent)",
  verticalAlign: "top",
};
