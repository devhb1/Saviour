"use client";

import { useState, type CSSProperties } from "react";
import { btnGhost, btnPrimary } from "./AppShell";

const GATEWAY = "https://saviour.bazgateway.com";

type PaidResult = {
  ok: boolean;
  live?: boolean;
  transaction?: string;
  explorerUrl?: string;
  amountUsd?: string;
  payer?: string;
  assessmentStatus?: string | null;
  settledAt?: string;
  error?: string;
  detail?: string;
};

/**
 * Live Bazantic meter: 402 unpaid (invoice) → Pay & settle (real Base tx + Basescan).
 */
export function BazanticPayPanel({
  demoAddress = "0x1111111111111111111111111111111111111113",
  variant = "full",
}: {
  demoAddress?: string;
  variant?: "compact" | "full";
}) {
  const [shield, setShield] = useState<string | null>(null);
  const [inv, setInv] = useState<{
    status: number;
    summary: string;
  } | null>(null);
  const [paid, setPaid] = useState<PaidResult | null>(null);
  const [busy, setBusy] = useState<"shield" | "inv" | "pay" | null>(null);

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
      const decision = json?.check?.decision ?? res.status;
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

  async function probeInvestigateUnpaid() {
    setBusy("inv");
    setInv(null);
    setPaid(null);
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
        setInv({
          status: 402,
          summary:
            "Live invoice · HTTP 402 · x402 · pay on Base to unlock investigate",
        });
        return;
      }
      const json = await res.json().catch(() => ({}));
      setInv({
        status: res.status,
        summary: `${res.status} · ${JSON.stringify(json).slice(0, 120)}`,
      });
    } catch (e) {
      setInv({
        status: 0,
        summary: e instanceof Error ? e.message : "investigate failed",
      });
    } finally {
      setBusy(null);
    }
  }

  async function payAndInvestigate() {
    setBusy("pay");
    setPaid(null);
    try {
      const res = await fetch("/api/bazantic/pay-investigate", {
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
      const json = (await res.json()) as PaidResult;
      if (!res.ok) {
        setPaid({
          ok: false,
          error: json.error || res.statusText,
          detail: json.detail,
        });
        return;
      }
      setPaid(json);
    } catch (e) {
      setPaid({
        ok: false,
        error: e instanceof Error ? e.message : "pay failed",
      });
    } finally {
      setBusy(null);
    }
  }

  const paidBlock =
    paid?.ok && paid.transaction ? (
      <div style={paidBox}>
        <p style={cellTitle}>LIVE SETTLE · THIS SESSION</p>
        <p style={{ margin: 0, fontSize: 14, color: "var(--ink)" }}>
          Paid ${paid.amountUsd ?? "…"} USDC on Base
          {paid.assessmentStatus ? ` · assessment ${paid.assessmentStatus}` : ""}
        </p>
        <a
          href={paid.explorerUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-block",
            marginTop: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--signal)",
            wordBreak: "break-all",
          }}
        >
          Basescan · {paid.transaction}
        </a>
        {paid.settledAt ? (
          <p style={{ ...muted, marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 11 }}>
            {paid.settledAt}
            {paid.payer ? ` · payer ${paid.payer.slice(0, 10)}…` : ""}
          </p>
        ) : null}
      </div>
    ) : paid && !paid.ok ? (
      <div style={{ ...paidBox, borderColor: "var(--warn)" }}>
        <p style={cellTitle}>SETTLE FAILED</p>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ink-muted)" }}>
          {paid.error}
          {paid.detail ? ` · ${paid.detail.slice(0, 180)}` : ""}
        </p>
        <p style={{ ...muted, marginTop: 8 }}>
          Needs `bazantic` CLI + Base grant on this machine (`film-base`). Public
          Vercel cannot hold your grant — film paid settle on `pnpm dev`.
        </p>
      </div>
    ) : null;

  if (variant === "compact") {
    return (
      <aside style={compactWrap}>
        <p style={eyebrow}>BAZANTIC · LIVE METER</p>
        <p style={compactTitle}>$0 on hit · pay on miss</p>
        <p style={muted}>
          Step 1 shows the live 402 invoice. Step 2 settles x402 on Base and
          returns a fresh Basescan tx — not a dated example.
        </p>
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void probeShield()}
            style={btnGhost}
          >
            {busy === "shield" ? "…" : "Probe $0"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void probeInvestigateUnpaid()}
            style={btnGhost}
          >
            {busy === "inv" ? "…" : "Show 402 invoice"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void payAndInvestigate()}
            style={btnPrimary}
          >
            {busy === "pay" ? "Settling on Base…" : "Pay & investigate →"}
          </button>
        </div>
        {(shield || inv) && (
          <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
            {shield ? <p style={result}>shield · {shield}</p> : null}
            {inv ? (
              <p style={result}>
                invoice · {inv.summary}
                {inv.status === 402 ? (
                  <span style={{ color: "var(--warn)" }}> · awaiting pay</span>
                ) : null}
              </p>
            ) : null}
          </div>
        )}
        {paidBlock}
        <p
          style={{
            ...muted,
            marginTop: 10,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
        >
          {GATEWAY}
        </p>
      </aside>
    );
  }

  return (
    <aside style={fullWrap}>
      <p style={eyebrow}>BAZANTIC · AGENT SETTLEMENT</p>
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
        Shield $0 forever. Investigate paid on miss.
      </p>
      <p style={{ ...muted, marginTop: 10 }}>
        Recipe: shield first → cancel on BLOCK/WARN → on miss, settle x402 on
        Base → then investigate. Paid button hits your Bazantic grant and returns
        a live Basescan link.
      </p>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
        }}
      >
        <div style={cell}>
          <p style={cellTitle}>1 · shieldCheck $0</p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void probeShield()}
            style={btnGhost}
          >
            {busy === "shield" ? "…" : "Probe $0 →"}
          </button>
          {shield ? <p style={result}>{shield}</p> : null}
        </div>
        <div style={cell}>
          <p style={cellTitle}>2 · unpaid invoice</p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void probeInvestigateUnpaid()}
            style={btnGhost}
          >
            {busy === "inv" ? "…" : "Show 402 →"}
          </button>
          {inv ? <p style={result}>{inv.summary}</p> : null}
        </div>
        <div style={cell}>
          <p style={cellTitle}>3 · pay on Base</p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void payAndInvestigate()}
            style={btnPrimary}
          >
            {busy === "pay" ? "Settling…" : "Pay & investigate →"}
          </button>
        </div>
      </div>

      {paidBlock}

      <p
        style={{
          margin: "14px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-muted)",
        }}
      >
        Gateway · {GATEWAY} · MCP · /mcp · grant account via BAZANTIC_PAY_ACCOUNT
      </p>
    </aside>
  );
}

const eyebrow: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.1em",
  color: "var(--signal)",
};

const compactTitle: CSSProperties = {
  margin: "8px 0 0",
  fontFamily: "var(--font-display)",
  fontSize: 20,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: "var(--ink)",
};

const muted: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 13,
  color: "var(--ink-muted)",
  lineHeight: 1.45,
};

const compactWrap: CSSProperties = {
  marginTop: 22,
  padding: "14px 16px",
  border: "1px solid color-mix(in srgb, var(--signal) 35%, var(--line))",
  borderRadius: "var(--radius-md)",
  background: "var(--surface)",
  maxWidth: 720,
};

const fullWrap: CSSProperties = {
  marginTop: 22,
  padding: "18px 18px",
  border: "1px solid color-mix(in srgb, var(--signal) 40%, var(--line))",
  borderRadius: "var(--radius-md)",
  background: "var(--surface)",
  maxWidth: 900,
};

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

const paidBox: CSSProperties = {
  marginTop: 14,
  padding: "12px 12px",
  border: "1px solid var(--signal)",
  borderRadius: "var(--radius-sm)",
  background: "color-mix(in srgb, var(--signal) 8%, var(--surface))",
};
