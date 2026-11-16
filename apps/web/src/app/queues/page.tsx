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
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        maxWidth: 900,
        margin: "0 auto",
        fontFamily: "ui-monospace, Menlo, monospace",
        color: "#e8eaef",
        background: "#0b0d10",
      }}
    >
      <p style={{ fontSize: 12, opacity: 0.7 }}>
        <Link href="/" style={{ color: "#7dd3a7" }}>
          saviours
        </Link>{" "}
        · Watch prototype (not the product)
      </p>
      <h1 style={{ fontSize: 22 }}>Queue tip health</h1>
      <p style={{ fontSize: 13, opacity: 0.75 }}>
        Product is{" "}
        <Link href="/review" style={{ color: "#7dd3a7" }}>
          Transaction Review
        </Link>
        . DEMO alerts are synthetic — never treat as live CRITICAL.
      </p>
      <div
        style={{
          marginTop: 16,
          padding: 12,
          border: `1px solid ${health.stale ? "#a35d5d" : "#1a6b4a"}`,
          background: "#14181d",
          fontSize: 12,
        }}
      >
        Feed: {health.stale ? "STALE" : "OK"} · lastProcessedBlock={" "}
        {health.lastProcessedBlock ?? "—"} · updated={health.updatedAt ?? "—"}
        {health.lastCriticalAt ? ` · last CRITICAL ${health.lastCriticalAt}` : ""}
        {health.note ? (
          <div style={{ marginTop: 8, opacity: 0.75 }}>{health.note}</div>
        ) : null}
      </div>

      <h2 style={{ fontSize: 14, marginTop: 28, opacity: 0.8 }}>Recent alerts</h2>
      <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 12 }}>
        {alerts.length === 0 ? <li>None — run indexer replay/start</li> : null}
        {alerts.map((a) => (
          <li key={a.id} style={{ marginBottom: 10 }}>
            <strong>{a.severity}</strong> · {a.protocol} · {a.summary}{" "}
            <a href={a.reviewPath} style={{ color: "#7dd3a7" }}>
              review
            </a>
            <div style={{ opacity: 0.55 }}>{a.at}</div>
          </li>
        ))}
      </ul>

      <table style={{ width: "100%", marginTop: 20, fontSize: 11, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", opacity: 0.7 }}>
            <th>Protocol</th>
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
              style={{ borderTop: "1px solid #2a333c" }}
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
    </main>
  );
}
