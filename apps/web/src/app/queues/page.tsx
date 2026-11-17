"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type QueueRow = {
  protocol: string;
  queue: string;
  chainId: number;
  authorityTarget: string;
  adapter: string;
};

type Health = {
  lastProcessedBlock: number | null;
  stale: boolean;
  updatedAt: string | null;
  lastCriticalAt?: string | null;
  note?: string;
};

type Alert = {
  id: string;
  at: string;
  severity: string;
  summary: string;
  protocol: string;
  reviewPath: string;
};

export default function QueuesPage() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [health, setHealth] = useState<Health>({
    lastProcessedBlock: null,
    stale: true,
    updatedAt: null,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    fetch("/api/queues/health")
      .then((r) => r.json())
      .then((j) => {
        setRows(j.queues ?? []);
        setHealth(j.health ?? health);
        setAlerts(j.recentAlerts ?? []);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="cp-tool">
      <p className="cp-tool-eyebrow">Queues · prototype</p>
      <h1 className="cp-tool-h1">Queue tip health</h1>
      <p className="cp-tool-lead">
        Product is{" "}
        <Link href="/review" style={{ color: "var(--sig)" }}>
          Transaction Review
        </Link>
        . DEMO alerts are synthetic — never treat as live CRITICAL.
      </p>
      <p className="cp-honesty-rail" role="note">
        Prototype — not durable monitoring · prefer /audit and /review
      </p>

      <div
        className="cp-diff-claim"
        style={{
          marginTop: 20,
          borderColor: health.stale ? "var(--red-line)" : "var(--green-line)",
        }}
      >
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
          Feed: {health.stale ? "STALE" : "OK"} · lastProcessedBlock={" "}
          {health.lastProcessedBlock ?? "—"} · updated={health.updatedAt ?? "—"}
          {health.lastCriticalAt
            ? ` · last CRITICAL ${health.lastCriticalAt}`
            : ""}
        </div>
        {health.note ? (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "var(--tx-lo)",
            }}
          >
            {health.note}
          </div>
        ) : null}
      </div>

      <h2 className="cp-section-label">Recent alerts</h2>
      <ul
        style={{
          marginTop: 8,
          paddingLeft: 18,
          fontSize: 12,
          fontFamily: "var(--font-mono)",
        }}
      >
        {alerts.length === 0 ? <li>None — run indexer replay/start</li> : null}
        {alerts.map((a) => (
          <li key={a.id} style={{ marginBottom: 10 }}>
            <strong>{a.severity}</strong> · {a.protocol} · {a.summary}{" "}
            <Link href={a.reviewPath} style={{ color: "var(--sig)" }}>
              review
            </Link>
            <div style={{ color: "var(--tx-lo)" }}>{a.at}</div>
          </li>
        ))}
      </ul>

      <h2 className="cp-section-label">Queues</h2>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            marginTop: 8,
            fontSize: 11,
            borderCollapse: "collapse",
            fontFamily: "var(--font-mono)",
          }}
        >
          <thead>
            <tr style={{ textAlign: "left", color: "var(--tx-lo)" }}>
              <th style={{ padding: "8px 4px" }}>Protocol</th>
              <th>Chain</th>
              <th>Queue</th>
              <th>Authority</th>
              <th>Adapter</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.protocol}-${r.chainId}-${r.queue}-${i}`}
                style={{ borderTop: "1px solid var(--line)" }}
              >
                <td style={{ padding: "8px 4px" }}>{r.protocol}</td>
                <td>{r.chainId}</td>
                <td style={{ fontSize: 10 }}>{r.queue}</td>
                <td style={{ fontSize: 10 }}>{r.authorityTarget}</td>
                <td>{r.adapter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
