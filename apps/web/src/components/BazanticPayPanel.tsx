"use client";

import { useState, type CSSProperties } from "react";
import { btnGhost, btnPrimary } from "./AppShell";

const GATEWAY = "https://saviour.bazgateway.com";
const PAID_TX =
  "0xa9629758355a835f8859d82c118497d3cb82ba81c7f5e21f1ab9e8b74d4ae47e";

/**
 * Bazantic track surface: $0 shield vs 402 investigate — simplified + loud.
 */
export function BazanticPayPanel({
  demoAddress = "0x1111111111111111111111111111111111111111",
}: {
  demoAddress?: string;
}) {
  const [shield, setShield] = useState<string | null>(null);
  const [inv, setInv] = useState<string | null>(null);
  const [busy, setBusy] = useState<"shield" | "inv" | null>(null);

  async function probeShield() {
    setBusy("shield");
    setShield(null);
    try {
      const res = await fetch(`${GATEWAY}/api/shield/check`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chainId: 1,
          address: "0x935bfb495e33f74d2e9735df1da66ace442ede48",
          registryNetwork: "sepolia",
        }),
      });
      const json = await res.json();
      const decision = json?.check?.decision ?? json?.decision ?? res.status;
      const cost = json?.check?.cost ?? {};
      setShield(
        `${res.status} · ${decision} · graph=${cost.graphQueries ?? 0} ai=${cost.aiCalls ?? 0} · $0`,
      );
    } catch (e) {
      setShield(e instanceof Error ? e.message : "shield failed");
    } finally {
      setBusy(null);
    }
  }

  async function probeInvestigate() {
    setBusy("inv");
    setInv(null);
    try {
      const res = await fetch(`${GATEWAY}/api/investigate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chainId: 1,
          address: demoAddress,
          persist: false,
          forceFresh: true,
          registryNetwork: "sepolia",
        }),
      });
      if (res.status === 402) {
        setInv(
          "HTTP 402 · x402 · pay $0.01 USDC on Base · then retry investigate",
        );
        return;
      }
      const json = await res.json().catch(() => ({}));
      setInv(`${res.status} · ${JSON.stringify(json).slice(0, 120)}…`);
    } catch (e) {
      setInv(e instanceof Error ? e.message : "investigate failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <aside
      style={{
        marginTop: 22,
        padding: "18px 18px",
        border: "1px solid color-mix(in srgb, var(--signal) 40%, var(--line))",
        borderRadius: "var(--radius-md)",
        background: "var(--surface)",
        maxWidth: 720,
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.1em",
          color: "var(--signal)",
        }}
      >
        BAZANTIC · SIMPLIFIED SETTLEMENT
      </p>
      <p
        style={{
          margin: "10px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          color: "var(--ink)",
        }}
      >
        Shield $0 forever. Investigate $0.01 on miss.
      </p>
      <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--ink-muted)", lineHeight: 1.5 }}>
        Agents pay only when ENS has no memory. Recipe: shield first → cancel on
        BLOCK/WARN → investigate once on miss.
      </p>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <div style={cell}>
          <p style={cellTitle}>1 · shieldCheck ATTACK-1</p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void probeShield()}
            style={btnPrimary}
          >
            {busy === "shield" ? "Calling…" : "Probe $0 →"}
          </button>
          {shield ? <p style={result}>{shield}</p> : null}
        </div>
        <div style={cell}>
          <p style={cellTitle}>2 · investigate unpaid</p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void probeInvestigate()}
            style={btnGhost}
          >
            {busy === "inv" ? "Calling…" : "Expect 402 →"}
          </button>
          {inv ? <p style={result}>{inv}</p> : null}
        </div>
      </div>

      <p
        style={{
          margin: "14px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-muted)",
          wordBreak: "break-all",
          lineHeight: 1.5,
        }}
      >
        Gateway · {GATEWAY}
        <br />
        Paid settle (Base) ·{" "}
        <a
          href={`https://basescan.org/tx/${PAID_TX}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--signal)" }}
        >
          {PAID_TX.slice(0, 20)}…{PAID_TX.slice(-8)}
        </a>
      </p>
    </aside>
  );
}

const cell: CSSProperties = {
  padding: "12px 12px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-sm)",
};

const cellTitle: CSSProperties = {
  margin: "0 0 10px",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink-muted)",
};

const result: CSSProperties = {
  margin: "10px 0 0",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink)",
  lineHeight: 1.45,
};
