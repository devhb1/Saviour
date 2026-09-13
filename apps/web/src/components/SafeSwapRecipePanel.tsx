"use client";

import { useState } from "react";
import { btnGhost, btnPrimary } from "./AppShell";
import { ErrorBanner } from "./ErrorBanner";
import { fetchJson } from "../lib/fetchJson";

type SafeSwapResult = {
  recipe?: string;
  mode?: string;
  quote?: {
    service?: string;
    router?: string;
    pool?: string;
    recipient?: string;
    note?: string;
  };
  checks?: Array<{
    role: string;
    address: string;
    decision?: string;
    status?: string;
    ensName?: string | null;
    source?: string;
    error?: string;
    costUsd: number;
  }>;
  result?: { action: "CANCEL" | "PROCEED"; reasons: string[] };
  pricing?: { totalUsd: number; shieldChecks: number; law: string };
  error?: string;
};

/**
 * B3 — multi-service Bazantic recipe demo (live QuoterV2 → shield).
 */
export function SafeSwapRecipePanel() {
  const [busy, setBusy] = useState<"abort" | "proceed" | null>(null);
  const [out, setOut] = useState<SafeSwapResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(mode: "abort" | "proceed") {
    setBusy(mode);
    setErr(null);
    setOut(null);
    try {
      const json = await fetchJson<SafeSwapResult>("/api/recipes/safe-swap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (json.error) throw new Error(json.error);
      setOut(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "safe-swap failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <p
        style={{
          margin: "0 0 12px",
          fontSize: "var(--t-sm)",
          color: "var(--tx-lo)",
          maxWidth: 640,
          lineHeight: 1.5,
        }}
      >
        Multi-service recipe <code>safe-swap-with-memory</code>: live Uniswap
        QuoterV2 (mainnet eth_call) → extract router/pool/recipient → Saviours{" "}
        <code>shieldCheck</code> each ($0). Prize narrative for Bazantic remains{" "}
        <code>investigate-once-explain</code> (Graph + memory). Abort injects
        ATTACK-1 as recipient.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void run("abort")}
          style={btnPrimary}
        >
          {busy === "abort" ? "Running…" : "1 · Abort path (ATTACK-1 recipient)"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void run("proceed")}
          style={btnGhost}
        >
          {busy === "proceed" ? "Running…" : "2 · Proceed path (unnamed recipient)"}
        </button>
      </div>
      {err ? (
        <div style={{ marginBottom: 12 }}>
          <ErrorBanner title="Safe-swap recipe failed" detail={err} />
        </div>
      ) : null}
      {out?.result ? (
        <div
          style={{
            padding: 14,
            border: `1px solid ${
              out.result.action === "CANCEL"
                ? "color-mix(in srgb, var(--warn) 45%, var(--line))"
                : "color-mix(in srgb, var(--safe) 40%, var(--line))"
            }`,
            borderRadius: "var(--r-md)",
            background: "var(--bg-raise)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "var(--sig)",
            }}
          >
            {out.recipe} · {out.mode} · ${out.pricing?.totalUsd ?? 0}
          </p>
          <p
            style={{
              margin: "8px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 600,
              color:
                out.result.action === "CANCEL" ? "var(--warn)" : "var(--safe)",
            }}
          >
            {out.result.action}
          </p>
          <ul
            style={{
              margin: "10px 0 0",
              paddingLeft: 18,
              fontSize: 13,
              color: "var(--tx)",
              lineHeight: 1.45,
            }}
          >
            {out.result.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {out.checks ? (
            <div style={{ marginTop: 12, overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                }}
              >
                <thead>
                  <tr style={{ color: "var(--tx-faint)", textAlign: "left" }}>
                    <th style={{ padding: "4px 6px" }}>role</th>
                    <th style={{ padding: "4px 6px" }}>decision</th>
                    <th style={{ padding: "4px 6px" }}>source</th>
                    <th style={{ padding: "4px 6px" }}>$</th>
                  </tr>
                </thead>
                <tbody>
                  {out.checks.map((c) => (
                    <tr key={`${c.role}-${c.address}`}>
                      <td style={{ padding: "4px 6px" }}>{c.role}</td>
                      <td style={{ padding: "4px 6px" }}>
                        {c.error ?? `${c.decision ?? "—"} / ${c.status ?? "—"}`}
                      </td>
                      <td style={{ padding: "4px 6px" }}>{c.source ?? "—"}</td>
                      <td style={{ padding: "4px 6px" }}>{c.costUsd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 12,
              color: "var(--tx-lo)",
              lineHeight: 1.45,
            }}
          >
            {out.quote?.note} Paste the recipe at{" "}
            <a
              href="https://bazantic.com/dashboard/recipes/new"
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--sig)" }}
            >
              bazantic.com/dashboard/recipes/new
            </a>{" "}
            from <code>docs/recipes/safe-swap-with-memory.md</code>.
          </p>
        </div>
      ) : null}
    </div>
  );
}
