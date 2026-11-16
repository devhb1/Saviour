"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { decodeTermLike } from "@saviours/queuewatch";

type Mode = "safe-json" | "calldata" | "hints";

/**
 * V3 Workflow B — Transaction Review.
 * Import Safe JSON or calldata. Selector hints remain a fallback for demos.
 * Does NOT claim Safe Transaction Service coverage.
 */
export default function ReviewPage() {
  const [mode, setMode] = useState<Mode>("safe-json");
  const [vault, setVault] = useState("0x7a120000000000000000000000000000000082d1");
  const [safeJson, setSafeJson] = useState(`{
  "to": "0x0000000000000000000000000000000000000000",
  "value": "0",
  "data": "0x",
  "operation": 0,
  "safeTxGas": "0",
  "baseGas": "0",
  "gasPrice": "0",
  "gasToken": "0x0000000000000000000000000000000000000000",
  "refundReceiver": "0x0000000000000000000000000000000000000000",
  "nonce": "12",
  "expectedSafeTxHash": ""
}`);
  const [calldata, setCalldata] = useState("0x");
  const [hints, setHints] = useState(
    "setTxCooldown\nsetTxExpiration\nenableModule",
  );
  const [expectedHash, setExpectedHash] = useState("");
  const [ran, setRan] = useState(false);

  const decoded = useMemo(() => {
    const lines =
      mode === "hints"
        ? hints
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
        : ["setTxCooldown", "setTxExpiration", "enableModule"];
    return decodeTermLike({
      rolesInner: lines.map((selectorHint) => ({
        to: vault || "0x0000000000000000000000000000000000000000",
        data: mode === "calldata" && calldata.startsWith("0x") ? calldata : "0x",
        selectorHint,
      })),
    });
  }, [hints, vault, mode, calldata]);

  const integrity =
    expectedHash.trim().length === 66
      ? "UNCHECKED"
      : mode === "safe-json"
        ? "UNCHECKED"
        : "N_A";

  const decision =
    decoded.vaultWrite === "WATCH" ? "WARN" : "NO_VERDICT";
  const coverage =
    decoded.supported === false
      ? "PARTIAL"
      : mode === "hints"
        ? "PARTIAL"
        : "PARTIAL";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-base, #0b0e14)",
        color: "var(--tx-hi, #f2f5f9)",
        fontFamily: "var(--font-body, system-ui, sans-serif)",
      }}
    >
      <div
        style={{
          maxWidth: 880,
          margin: "0 auto",
          padding: "36px 20px 72px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            letterSpacing: "0.06em",
            color: "var(--tx-lo, #9aa5b2)",
          }}
        >
          <Link href="/" style={{ color: "var(--sig, #4c8dff)", textDecoration: "none" }}>
            saviours
          </Link>
          {" · "}Workflow B · Transaction review
        </p>

        <h1
          style={{
            margin: "10px 0 0",
            fontFamily: "var(--font-display, Georgia, serif)",
            fontSize: "clamp(26px, 4vw, 34px)",
            letterSpacing: "-0.035em",
            fontWeight: 700,
          }}
        >
          Review before you authorize
        </h1>
        <p
          style={{
            margin: "10px 0 0",
            maxWidth: 560,
            fontSize: 14,
            lineHeight: 1.5,
            color: "var(--tx, #c5cdd8)",
          }}
        >
          Import the exact Safe transaction you will approve. We decode supported
          actions, check Base memory, and show coverage limits. Static decode is
          not full simulation. You decide.
        </p>

        <div
          style={{
            marginTop: 22,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {(
            [
              ["safe-json", "Safe JSON"],
              ["calldata", "Raw calldata"],
              ["hints", "Selector hints"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 11,
                letterSpacing: "0.04em",
                padding: "8px 12px",
                cursor: "pointer",
                border:
                  mode === id
                    ? "1px solid var(--sig, #4c8dff)"
                    : "1px solid var(--line, #2a333c)",
                background:
                  mode === id
                    ? "color-mix(in srgb, var(--sig, #4c8dff) 16%, transparent)"
                    : "var(--bg-inset, #05070b)",
                color: "var(--tx-hi, #f2f5f9)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <label
          style={{
            display: "block",
            marginTop: 20,
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            color: "var(--tx-lo, #9aa5b2)",
          }}
        >
          Safe / vault address
          <input
            value={vault}
            onChange={(e) => setVault(e.target.value)}
            placeholder="0x…"
            style={inputStyle}
          />
        </label>

        {mode === "safe-json" ? (
          <label style={labelStyle}>
            Safe transaction JSON
            <textarea
              value={safeJson}
              onChange={(e) => setSafeJson(e.target.value)}
              rows={12}
              style={areaStyle}
            />
          </label>
        ) : null}

        {mode === "calldata" ? (
          <label style={labelStyle}>
            Calldata
            <textarea
              value={calldata}
              onChange={(e) => setCalldata(e.target.value)}
              rows={4}
              style={areaStyle}
            />
          </label>
        ) : null}

        {mode === "hints" ? (
          <label style={labelStyle}>
            Selector hints (demo fallback — one per line)
            <textarea
              value={hints}
              onChange={(e) => setHints(e.target.value)}
              rows={5}
              style={areaStyle}
            />
          </label>
        ) : null}

        <label style={labelStyle}>
          Expected Safe tx hash (optional integrity check)
          <input
            value={expectedHash}
            onChange={(e) => setExpectedHash(e.target.value)}
            placeholder="0x… (recomputed hash must match)"
            style={inputStyle}
          />
        </label>

        <button
          type="button"
          onClick={() => setRan(true)}
          style={{
            marginTop: 16,
            padding: "11px 16px",
            background: "var(--sig, #4c8dff)",
            color: "#061018",
            border: 0,
            fontWeight: 650,
            cursor: "pointer",
            fontFamily: "var(--font-body, system-ui)",
          }}
        >
          Assess transaction
        </button>

        {ran ? (
          <section
            style={{
              marginTop: 28,
              borderTop: "1px solid var(--line, #2a333c)",
              paddingTop: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "baseline",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display, Georgia, serif)",
                  fontSize: 22,
                  letterSpacing: "-0.03em",
                }}
              >
                Assessment
              </h2>
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 12,
                  letterSpacing: "0.05em",
                  color:
                    decision === "WARN"
                      ? "var(--amber, #e0a84a)"
                      : "var(--tx-lo, #9aa5b2)",
                  border: "1px solid var(--line, #2a333c)",
                  padding: "4px 8px",
                }}
              >
                {decision} · coverage {coverage} · integrity {integrity}
              </span>
            </div>

            <p
              style={{
                margin: "12px 0 0",
                fontSize: 15,
                lineHeight: 1.45,
                color: "var(--tx-hi, #f2f5f9)",
                maxWidth: 560,
              }}
            >
              {decoded.vaultWrite === "WATCH"
                ? "Privileged actions detected — registry write hint is WATCH (not auto-TAINTED)."
                : "No critical privileged pattern in this demo decode path."}
            </p>

            <h3 style={sectionH}>Proposed actions</h3>
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13 }}>
              {decoded.actions.map((a, i) => (
                <li key={`${a.selectorHint}-${i}`} style={{ marginBottom: 6 }}>
                  <code style={{ fontFamily: "var(--font-mono, monospace)" }}>
                    {a.selectorHint || a.to}
                  </code>
                  {" · "}
                  {a.severity}
                  {a.note ? ` — ${a.note}` : ""}
                </li>
              ))}
            </ul>

            <h3 style={sectionH}>Why this matters</h3>
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--tx, #c5cdd8)" }}>
              <li>NO_VERDICT never means SAFE.</li>
              <li>UNSUPPORTED nested calls keep coverage PARTIAL.</li>
              <li>
                Hash integrity must MATCH before you treat this as the tx you
                will sign ({integrity}).
              </li>
              <li>
                Continuous queue monitoring is Workflow A — this page is Workflow
                B only.
              </li>
            </ul>

            <h3 style={sectionH}>Raw decode</h3>
            <pre style={preStyle}>
              {JSON.stringify(
                {
                  decision,
                  coverage,
                  integrity,
                  maxSeverity: decoded.maxSeverity,
                  vaultWrite: decoded.vaultWrite,
                  supported: decoded.supported,
                  actions: decoded.actions,
                  note:
                    mode !== "hints"
                      ? "Full ABI/calldata assessTransaction engine lands in G3 — demo uses QueueWatch severity path"
                      : "Selector-hint demo path",
                },
                null,
                2,
              )}
            </pre>
          </section>
        ) : null}

        <p
          style={{
            marginTop: 28,
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            color: "var(--tx-faint, #6a7280)",
          }}
        >
          Also{" "}
          <Link href="/queues" style={{ color: "var(--sig, #4c8dff)" }}>
            /queues
          </Link>{" "}
          (Workflow A) ·{" "}
          <Link href="/resolve" style={{ color: "var(--sig, #4c8dff)" }}>
            /resolve
          </Link>{" "}
          (address memory)
        </p>
      </div>
    </main>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 6,
  padding: 10,
  background: "var(--bg-inset, #05070b)",
  border: "1px solid var(--line, #2a333c)",
  color: "var(--tx-hi, #f2f5f9)",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 12,
};

const areaStyle: CSSProperties = {
  ...inputStyle,
  resize: "vertical",
};

const labelStyle: CSSProperties = {
  display: "block",
  marginTop: 16,
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 11,
  color: "var(--tx-lo, #9aa5b2)",
};

const sectionH: CSSProperties = {
  margin: "20px 0 0",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 10,
  letterSpacing: "0.08em",
  color: "var(--tx-faint, #6a7280)",
  fontWeight: 500,
};

const preStyle: CSSProperties = {
  marginTop: 8,
  padding: 12,
  background: "var(--bg-inset, #05070b)",
  border: "1px solid var(--line, #2a333c)",
  fontSize: 11,
  overflow: "auto",
  fontFamily: "var(--font-mono, monospace)",
  color: "var(--tx, #c5cdd8)",
};
