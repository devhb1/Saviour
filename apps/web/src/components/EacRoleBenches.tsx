"use client";

import { useState, type CSSProperties } from "react";
import { btnPrimary } from "./AppShell";
import {
  BOT_1_ADDRESS,
  DEMO_TARGETS,
  isDemoHero,
} from "./demoTargets";
import { fetchJson, FetchJsonError } from "../lib/fetchJson";
import { clientWritesAllowed, writeHeaders } from "../lib/writeGuard";
import { Sheet } from "../ui";

/** Official Sepolia operators — docs/ENS.md · deployments/sepolia-ens-identity.json */
export const EAC_ROLES = [
  {
    id: "relayer",
    title: "Relayer",
    accent: "var(--sig)",
    wash: "color-mix(in srgb, var(--sig) 10%, var(--bg-raise))",
    address: "0x679997b836Cf84D32d7f68C1c662546E797f15FA",
    can: "register · renew · unregister · grant roles",
    cannot: "— (root admin)",
    sell: "Names the memory",
  },
  {
    id: "investigator",
    title: "Investigator",
    accent: "var(--amber)",
    wash: "color-mix(in srgb, var(--amber) 10%, var(--bg-raise))",
    address: "0xc8A19951234d6f59f08E7EcB65506Ef34f5bf27d",
    ens: "investigator-01.saviours.eth",
    can: "verdict texts (status, threat, evidenceHash, …)",
    cannot: "saviours.dispute — reverts on-chain",
    sell: "Writes the charge",
  },
  {
    id: "disputer",
    title: "Disputer",
    accent: "var(--green)",
    wash: "color-mix(in srgb, var(--green) 10%, var(--bg-raise))",
    address: "0xc26ADf0053C876047d2CbF5CC38a01312b410e7C",
    can: "saviours.status + saviours.dispute",
    cannot: "register / unregister",
    sell: "Only role that can clear",
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
  const safeProbe = isDemoHero(probeAddress) ? BOT_1_ADDRESS : probeAddress.trim().toLowerCase();
  const [busy, setBusy] = useState(false);
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [failClosed, setFailClosed] = useState(false);
  const [readBusy, setReadBusy] = useState(false);
  const [readSnap, setReadSnap] = useState<ResolveSnap | null>(null);
  const [readErr, setReadErr] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);

  async function runProbe() {
    setBusy(true);
    setProbe(null);
    setFailClosed(false);
    try {
      const json = await fetchJson<ProbeResult>("/api/govern/eac-probe", {
        method: "POST",
        headers: { "content-type": "application/json", ...writeHeaders() },
        body: JSON.stringify({ address: safeProbe }),
        timeoutMs: 45_000,
      });
      setProbe(json);
      setToastOpen(true);
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
      setToastOpen(true);
    } finally {
      setBusy(false);
    }
  }

  async function readLive() {
    setReadBusy(true);
    setReadErr(null);
    setReadSnap(null);
    try {
      const json = await fetchJson<ResolveSnap>(
        `/api/resolve?address=${encodeURIComponent(safeProbe)}`,
        { timeoutMs: 20_000 },
      );
      setReadSnap(json);
    } catch (e) {
      setReadErr(e instanceof Error ? e.message : "resolve failed");
    } finally {
      setReadBusy(false);
    }
  }

  const ok = !!(failClosed || probe?.reverted);

  return (
    <div aria-label="EAC role benches">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: compact ? 8 : 10,
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 280px" }}>
          <p style={eyebrow}>EAC · ON-CHAIN ROLE CEILINGS</p>
          <p
            style={{
              margin: "6px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: compact ? 16 : 22,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--tx-hi)",
              lineHeight: 1.2,
            }}
          >
            Investigator writes the charge.{" "}
            <span style={{ color: "var(--amber)" }}>Cannot</span> clear it.
          </p>
          {compact ? null : (
            <p style={{ ...body, marginTop: 6, maxWidth: 560 }}>
              Per-key Enhanced Access Control on PermissionedResolver — not a
              backend policy. Probe uses{" "}
              <code style={{ fontSize: 11 }}>{safeProbe.slice(0, 10)}…</code>{" "}
              (BOT-1) — never ATTACK-1.
            </p>
          )}
        </div>
      </div>

      <div
        className="eac-role-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: compact ? 6 : 10,
        }}
      >
        {EAC_ROLES.map((r) => (
          <div
            key={r.id}
            style={{
              ...card,
              background: r.wash,
              borderColor: `color-mix(in srgb, ${r.accent} 40%, var(--line))`,
              boxShadow: `inset 3px 0 0 ${r.accent}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "baseline",
              }}
            >
              <p style={{ ...roleTitle, color: r.accent }}>{r.title}</p>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.04em",
                  color: "var(--tx-faint)",
                  textTransform: "uppercase",
                }}
              >
                {r.sell}
              </p>
            </div>
            <p style={addr}>{compact ? `${r.address.slice(0, 10)}…${r.address.slice(-4)}` : r.address}</p>
            {"ens" in r && r.ens && !compact ? (
              <p style={{ ...meta, color: "var(--sig)" }}>{r.ens}</p>
            ) : null}
            <p style={{ ...meta, marginTop: 8 }}>
              <span style={{ color: "var(--safe)", fontWeight: 600 }}>can</span>{" "}
              · {r.can}
            </p>
            <p style={meta}>
              <span style={{ color: "var(--warn)", fontWeight: 600 }}>
                cannot
              </span>{" "}
              · {r.cannot}
            </p>
          </div>
        ))}
      </div>

      {/* Permission matrix strip — sell the split in one glance */}
      {!compact ? (
        <div style={matrix}>
          <p style={matrixLabel}>KEY SPLIT · live on Sepolia</p>
          <div style={matrixRow}>
            <span style={matrixKey}>saviours.status</span>
            <span style={chipOk}>investigator</span>
            <span style={chipOk}>disputer</span>
          </div>
          <div style={matrixRow}>
            <span style={matrixKey}>saviours.dispute</span>
            <span style={chipNo}>investigator REVERT</span>
            <span style={chipOk}>disputer only</span>
          </div>
        </div>
      ) : null}

      <div
        style={{
          marginTop: 12,
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
          {busy ? "Probing… (≤45s)" : "Probe investigator → dispute"}
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
          <span
            style={{
              fontSize: 11,
              color: "var(--tx-faint)",
              fontFamily: "var(--font-mono)",
            }}
          >
            public · writes fail-closed
          </span>
        ) : null}
      </div>

      {readErr ? (
        <p style={{ marginTop: 8, fontSize: 12, color: "var(--warn)" }}>
          {readErr}
        </p>
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

      <Sheet
        open={toastOpen && !!(failClosed || probe)}
        onClose={() => setToastOpen(false)}
        eyebrow="EAC LIVE PROBE"
        title={ok ? "REVERTED" : "UNEXPECTED"}
        width={400}
      >
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 14,
            lineHeight: 1.5,
            color: ok ? "var(--safe)" : "var(--warn)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {failClosed
            ? "Writes closed on public host · film on local grant. Expected: investigator dispute reverts under EAC."
            : probe?.reverted
              ? "✓ Investigator cannot write saviours.dispute — on-chain EAC held."
              : probe?.message || probe?.error || JSON.stringify(probe)}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "var(--tx-lo)", lineHeight: 1.45 }}>
          That separation is the ENS track sell: the operator who investigates is
          structurally not the operator who can clear a verdict.
        </p>
        <button
          type="button"
          onClick={() => setToastOpen(false)}
          style={{ ...btnPrimary, marginTop: 16, width: "100%" }}
        >
          Close
        </button>
      </Sheet>

      <style>{`
        @media (max-width: 720px) {
          .eac-role-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
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
  lineHeight: 1.45,
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

const matrix: CSSProperties = {
  marginTop: 12,
  padding: "10px 12px",
  border: "1px solid var(--line-mid)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-inset, var(--bg))",
};

const matrixLabel: CSSProperties = {
  margin: "0 0 8px",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  color: "var(--tx-faint)",
};

const matrixRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  alignItems: "center",
  marginTop: 6,
};

const matrixKey: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--tx-hi)",
  minWidth: 140,
};

const chipOk: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  padding: "3px 8px",
  borderRadius: 6,
  border: "1px solid color-mix(in srgb, var(--safe) 40%, var(--line))",
  color: "var(--safe)",
  background: "color-mix(in srgb, var(--safe) 10%, transparent)",
};

const chipNo: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  padding: "3px 8px",
  borderRadius: 6,
  border: "1px solid color-mix(in srgb, var(--warn) 45%, var(--line))",
  color: "var(--warn)",
  background: "color-mix(in srgb, var(--warn) 12%, transparent)",
  fontWeight: 600,
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
  maxHeight: 160,
};
