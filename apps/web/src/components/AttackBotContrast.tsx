"use client";

import { startTransition, useState } from "react";
import { DEMO_TARGETS, btnGhost } from "./AppShell";

type Profile = {
  id: string;
  address: string;
  status: string;
  rule: string;
  signalIds: string[];
  flashloanRows: number;
  atomic: boolean;
  adapterACount: number;
};

const ATTACK = DEMO_TARGETS.find((t) => t.id === "ATTACK-1")!;
const BOT = DEMO_TARGETS.find((t) => t.id === "BOT-1")!;

async function loadProfile(
  id: string,
  address: string,
): Promise<Profile> {
  const res = await fetch(`/api/evidence/1/${address}`);
  const j = (await res.json()) as {
    signals?: { id: string }[];
    signalStatus?: { status: string; rule: string };
    evidence?: { kind?: string; txHash?: string; protocol?: string }[];
    adapterACount?: number;
    error?: string;
  };
  if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
  const signals = j.signals ?? [];
  const ids = signals.map((s) => s.id);
  const evidence = j.evidence ?? [];
  const flashloanRows = evidence.filter((e) => e.kind === "flashloan").length;
  const byTx = new Map<string, Set<string>>();
  for (const e of evidence) {
    if (!e.txHash || !e.protocol) continue;
    const t = e.txHash.toLowerCase();
    const set = byTx.get(t) ?? new Set();
    set.add(e.protocol);
    byTx.set(t, set);
  }
  let atomic = false;
  for (const set of byTx.values()) {
    if (set.size >= 2) {
      atomic = true;
      break;
    }
  }
  return {
    id,
    address,
    status: j.signalStatus?.status ?? "UNKNOWN",
    rule: j.signalStatus?.rule ?? "—",
    signalIds: ids,
    flashloanRows,
    atomic,
    adapterACount: j.adapterACount ?? 0,
  };
}

function Cell({ p }: { p: Profile }) {
  const tainted = p.status === "TAINTED";
  return (
    <div
      style={{
        padding: 14,
        border: `2px solid ${tainted ? "var(--block)" : "var(--warn)"}`,
        borderRadius: 6,
        background: tainted ? "rgba(180,40,40,0.05)" : "rgba(180,120,20,0.05)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-muted)",
        }}
      >
        {p.id}
      </p>
      <p
        style={{
          margin: "6px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: 22,
          color: tainted ? "var(--block)" : "var(--warn)",
        }}
      >
        {p.status}
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--ink-muted)" }}>
        flashloan rows · {p.flashloanRows}
        <br />
        atomic same-tx · {p.atomic ? "yes" : "no"}
        <br />
        signals · {p.signalIds.join(", ") || "none"}
        <br />
        rule · {p.rule}
      </p>
    </div>
  );
}

/**
 * Side-by-side live Graph honesty beat: ATTACK-1 TAINTED vs BOT-1 WATCH.
 */
export function AttackBotContrast() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pair, setPair] = useState<[Profile, Profile] | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const [a, b] = await Promise.all([
        loadProfile(ATTACK.id, ATTACK.address),
        loadProfile(BOT.id, BOT.address),
      ]);
      startTransition(() => setPair([a, b]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Contrast failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 28 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
          }}
        >
          Live contrast · same fan-out · different signals
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run()}
          style={{ ...btnGhost, padding: "8px 12px", fontSize: 12, borderRadius: 4 }}
        >
          {busy ? "Querying Graph…" : pair ? "Refresh ATTACK vs BOT" : "Compare ATTACK-1 vs BOT-1"}
        </button>
      </div>
      {error ? (
        <p role="alert" style={{ color: "var(--block)", marginTop: 10 }}>
          {error}
        </p>
      ) : null}
      {pair ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 12,
          }}
        >
          <Cell p={pair[0]} />
          <Cell p={pair[1]} />
        </div>
      ) : null}
    </div>
  );
}
