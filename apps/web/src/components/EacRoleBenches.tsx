"use client";

import { useState, type CSSProperties } from "react";
import { btnPrimary } from "./AppShell";
import { DEMO_TARGETS } from "./demoTargets";
import { fetchJson, FetchJsonError } from "../lib/fetchJson";
import { clientWritesAllowed, writeHeaders } from "../lib/writeGuard";

/** Official Sepolia operators — docs/ENS.md · deployments/sepolia-ens-identity.json */
export const EAC_ROLES = [
  {
    id: "relayer",
    title: "Relayer",
    address: "0x679997b836Cf84D32d7f68C1c662546E797f15FA",
    can: "register · renew · unregister · grant roles",
    cannot: "— (root admin)",
  },
  {
    id: "investigator",
    title: "Investigator",
    address: "0xc8A19951234d6f59f08E7EcB65506Ef34f5bf27d",
    ens: "investigator-01.saviours.eth",
    can: "verdict texts (status, threat, evidenceHash, …)",
    cannot: "saviours.dispute — reverts on-chain",
  },
  {
    id: "disputer",
    title: "Disputer",
    address: "0xc26ADf0053C876047d2CbF5CC38a01312b410e7C",
    can: "saviours.status + saviours.dispute",
    cannot: "register / unregister",
  },
] as const;

/** Never probe ATTACK-1 — use BOT-1 so film cannot dispute the hero again. */
const PROBE_ADDRESS = DEMO_TARGETS[2].address;

type ProbeResult = {
  reverted?: boolean;
  message?: string;
  error?: string;
  ensName?: string;
};

type ResolveSnap = {
  ensName?: string;
  records?: Record<string, string>;
  hit?: boolean;
};

/**
 * Three role benches + live investigator→dispute EAC probe.
 * Public Vercel: writes fail-closed (401) — show honest copy.
 * Local / film grant: expect reverted:true.
 */
export function EacRoleBenches({
  compact = false,
  probeAddress = PROBE_ADDRESS,
}: {
  compact?: boolean;
  /** Address whose name we probe (must NOT be ATTACK-1). */
  probeAddress?: string;
}) {
  const writesOpen = clientWritesAllowed();
  const [busy, setBusy] = useState(false);
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [failClosed, setFailClosed] = useState(false);
  const [readBusy, setReadBusy] = useState(false);
  const [readSnap, setReadSnap] = useState<ResolveSnap | null>(null);
  const [readErr, setReadErr] = useState<string | null>(null);

  async function runProbe() {
    setBusy(true);
    setProbe(null);
    setFailClosed(false);
    try {
      const json = await fetchJson<ProbeResult>("/api/govern/eac-probe", {
        method: "POST",
        headers: { "content-type": "application/json", ...writeHeaders() },
        body: JSON.stringify({ address: probeAddress.trim().toLowerCase() }),
      });
      setProbe(json);
    } catch (e) {
      const status = e instanceof FetchJsonError ? e.status : 0;
      const msg = e instanceof Error ? e.message : "EAC probe failed";
      if (status === 401 || /writes disabled|write token|fail-closed/i.test(msg)) {
        setFailClosed(true);
        setProbe({
          reverted: true,
          message:
            "Writes closed on public host · film on local grant. Expected live result: investigator setText(saviours.dispute) reverts under EAC.",
        });
      } else {
        setProbe({
          reverted: /revert/i.test(msg),
          message: msg,
          error: msg,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function readLive() {
    setReadBusy(true);
    setReadErr(null);
    setReadSnap(null);
    try {
      const a = probeAddress.trim().toLowerCase();
      const json = await fetchJson<ResolveSnap>(
        `/api/resolve?address=${encodeURIComponent(a)}`,
        { timeoutMs: 20_000 },
      );
      setReadSnap(json);
    } catch (e) {
      setReadErr(e instanceof Error ? e.message : "resolve failed");
    } finally {
      setReadBusy(false);
    }
  }

  return (
    <div aria-label="EAC role benches">
      <p style={eyebrow}>EAC · THREE ROLES</p>
      <p style={{ ...body, marginTop: 8 }}>
        Investigator may write verdict texts. Investigator may{" "}
        <strong style={{ color: "var(--tx-hi)" }}>not</strong> write{" "}
        <code>saviours.dispute</code>. Probe uses{" "}
        <code style={{ fontSize: 11 }}>{probeAddress.slice(0, 10)}…</code>{" "}
        (BOT-1) — never the hero.
      </p>

      <div
        style={{
          marginTop: compact ? 10 : 14,
          display: "grid",
          gridTemplateColumns: compact
            ? "1fr"
            : "repeat(3, minmax(0, 1fr))",
          gap: compact ? 8 : 10,
        }}
      >
        {EAC_ROLES.map((r) => (
          <div key={r.id} style={card}>
            <p style={roleTitle}>{r.title}</p>
            <p style={addr}>{r.address}</p>
            {"ens" in r && r.ens ? (
              <p style={{ ...meta, color: "var(--sig)" }}>{r.ens}</p>
            ) : null}
            <p style={meta}>
              <span style={{ color: "var(--safe)" }}>can</span> · {r.can}
            </p>
            <p style={meta}>
              <span style={{ color: "var(--warn)" }}>cannot</span> · {r.cannot}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={() => void runProbe()}
          disabled={busy}
          style={btnPrimary}
        >
          {busy ? "Probing…" : "Probe investigator → dispute"}
        </button>
        <button
          type="button"
          onClick={() => void readLive()}
          disabled={readBusy}
          style={btnGhost}
        >
          {readBusy ? "Reading…" : "Read live texts (BOT-1)"}
        </button>
        {!writesOpen ? (
          <span style={{ fontSize: 11, color: "var(--tx-faint)", fontFamily: "var(--font-mono)" }}>
            public · writes fail-closed
          </span>
        ) : null}
      </div>

      {failClosed || probe ? (
        <p
          style={{
            marginTop: 12,
            fontFamily: "var(--font-mono)",
            fontSize: "var(--t-floor)",
            color: probe?.reverted ? "var(--safe)" : "var(--warn)",
            lineHeight: 1.45,
          }}
        >
          {failClosed
            ? "Writes closed on public host · film on local grant. Expected: investigator dispute reverts under EAC."
            : probe?.reverted
              ? "✓ Reverted as expected"
              : probe?.message || probe?.error || JSON.stringify(probe)}
        </p>
      ) : null}

      {readErr ? (
        <p style={{ marginTop: 8, fontSize: 12, color: "var(--warn)" }}>{readErr}</p>
      ) : null}
      {readSnap ? (
        <pre style={pre}>
          {JSON.stringify(
            {
              ensName: readSnap.ensName,
              hit: readSnap.hit,
              status: readSnap.records?.["saviours.status"],
              dispute: readSnap.records?.["saviours.dispute"] || "(empty)",
            },
            null,
            2,
          )}
        </pre>
      ) : null}
    </div>
  );
}

const eyebrow: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-floor)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--tx-faint)",
};

const body: CSSProperties = {
  margin: 0,
  fontSize: "var(--t-sm)",
  lineHeight: 1.5,
  color: "var(--tx-lo)",
};

const card: CSSProperties = {
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md, 8px)",
  background: "var(--bg-raise, var(--surface))",
};

const roleTitle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--tx-hi)",
};

const addr: CSSProperties = {
  margin: "6px 0 0",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "var(--tx)",
  wordBreak: "break-all",
  lineHeight: 1.35,
};

const meta: CSSProperties = {
  margin: "6px 0 0",
  fontSize: 11,
  lineHeight: 1.4,
  color: "var(--tx-lo)",
};

const btnGhost: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  padding: "8px 12px",
  borderRadius: "var(--r-md, 8px)",
  border: "1px solid var(--line)",
  background: "transparent",
  color: "var(--tx)",
  cursor: "pointer",
};

const pre: CSSProperties = {
  marginTop: 10,
  padding: 10,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  lineHeight: 1.4,
  color: "var(--tx-lo)",
  background: "var(--bg-inset, var(--bg))",
  border: "1px solid var(--line)",
  borderRadius: 6,
  overflow: "auto",
};
