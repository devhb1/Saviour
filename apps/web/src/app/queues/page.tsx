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
};

export default function QueuesPage() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [health, setHealth] = useState<Health>({
    lastProcessedBlock: null,
    stale: true,
    updatedAt: null,
  });

  useEffect(() => {
    fetch("/api/queues/health")
      .then((r) => r.json())
      .then((j) => {
        setRows(j.queues ?? []);
        setHealth(j.health ?? health);
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
          Saviours
        </Link>{" "}
        · Queue feed
      </p>
      <h1 style={{ fontSize: 22 }}>Monitored queues</h1>
      <p style={{ fontSize: 13, opacity: 0.75 }}>
        Initial gate: 5 queues E2E. Scale target: 40. Stale-feed indicator when indexer lags.
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
      </div>
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
          {rows.map((r) => (
            <tr key={`${r.chainId}-${r.queue}`} style={{ borderTop: "1px solid #2a333c" }}>
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
