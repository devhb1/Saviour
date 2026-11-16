"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  assessAndExplain,
  computeSafeTxHashWithDomainName,
  type AssessWithExplanation,
  type Hex,
} from "@saviours/check";

type Mode = "safe-json" | "calldata";

const ZERO = "0x0000000000000000000000000000000000000000" as Hex;

const TERM_DEMO = `{
  "to": "0x35C99CF4a5DF2D9bCd822BeE32676D9590229e33",
  "value": "0",
  "data": "0xebb2b4a200000000000000000000000000000000000000000000000000000000000000009b56d5be0000000000000000000000000000000000000000000000000000000000000000610b59250000000000000000000000000ae12af3878a2d896f5c4dce3be7250fb187c0a6",
  "operation": 0,
  "safeTxGas": "0",
  "baseGas": "0",
  "gasPrice": "0",
  "gasToken": "0x0000000000000000000000000000000000000000",
  "refundReceiver": "0x0000000000000000000000000000000000000000",
  "nonce": "0"
}`;

/**
 * Privilege Guard — Review mode (Safe JSON / calldata + English privilege risk).
 */
export default function ReviewPage() {
  const [mode, setMode] = useState<Mode>("safe-json");
  const [vault, setVault] = useState(
    "0x46DA347d1Db6EdCA62BF6Cd5892Dc284fC938613",
  );
  const [chainId, setChainId] = useState(1);
  const [safeJson, setSafeJson] = useState(TERM_DEMO);
  const [calldata, setCalldata] = useState(
    "0xebb2b4a20000000000000000000000000000000000000000000000000000000000000000",
  );
  const [to, setTo] = useState("0x35C99CF4a5DF2D9bCd822BeE32676D9590229e33");
  const [expectedHash, setExpectedHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AssessWithExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const data = q.get("data");
    const safe = q.get("safe");
    const chain = q.get("chainId");
    const alert = q.get("alert");
    if (safe) setVault(safe);
    if (chain) setChainId(Number(chain) || 1);
    if (data?.startsWith("0x")) {
      setMode("calldata");
      setCalldata(data);
      setTo((q.get("to") as string) || to);
    }
    if (alert) setAlertBanner(alert);
  }, []);

  const computedHash = useMemo(() => {
    if (mode !== "safe-json") return null;
    try {
      const tx = JSON.parse(safeJson) as Record<string, string | number>;
      return computeSafeTxHashWithDomainName({
        chainId,
        safeAddress: vault as Hex,
        safeVersion: "1.3.0",
        safeTx: {
          to: String(tx.to) as Hex,
          value: BigInt(String(tx.value ?? "0")),
          data: String(tx.data ?? "0x") as Hex,
          operation: Number(tx.operation ?? 0) as 0 | 1,
          safeTxGas: BigInt(String(tx.safeTxGas ?? "0")),
          baseGas: BigInt(String(tx.baseGas ?? "0")),
          gasPrice: BigInt(String(tx.gasPrice ?? "0")),
          gasToken: String(tx.gasToken ?? ZERO) as Hex,
          refundReceiver: String(tx.refundReceiver ?? ZERO) as Hex,
          nonce: BigInt(String(tx.nonce ?? "0")),
        },
      });
    } catch {
      return null;
    }
  }, [mode, safeJson, vault, chainId]);

  async function runAssess() {
    setLoading(true);
    setError(null);
    try {
      let assessment: AssessWithExplanation;
      if (mode === "safe-json") {
        const tx = JSON.parse(safeJson) as Record<string, string | number>;
        const safeTx = {
          to: String(tx.to) as Hex,
          value: BigInt(String(tx.value ?? "0")),
          data: String(tx.data ?? "0x") as Hex,
          operation: Number(tx.operation ?? 0) as 0 | 1,
          safeTxGas: BigInt(String(tx.safeTxGas ?? "0")),
          baseGas: BigInt(String(tx.baseGas ?? "0")),
          gasPrice: BigInt(String(tx.gasPrice ?? "0")),
          gasToken: String(tx.gasToken ?? ZERO) as Hex,
          refundReceiver: String(tx.refundReceiver ?? ZERO) as Hex,
          nonce: BigInt(String(tx.nonce ?? "0")),
        };
        assessment = await assessAndExplain(
          {
            kind: "SAFE_TRANSACTION",
            chainId,
            safeAddress: vault as Hex,
            safeVersion: "1.3.0",
            safeTx,
            expectedSafeTxHash: (expectedHash.trim() || undefined) as
              | Hex
              | undefined,
          },
          {
            extraSubjects: [
              "0x26fCb50eEC367ddAB060ccf5E7394Cecd95F7Db2" as Hex,
            ],
          },
        );
      } else {
        assessment = await assessAndExplain({
          kind: "RAW_CALL",
          chainId,
          from: vault as Hex,
          to: to as Hex,
          value: 0n,
          data: calldata as Hex,
        });
      }
      setResult(assessment);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-base, #0b0e14)",
        color: "var(--tx-hi, #f2f5f9)",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "36px 20px 72px" }}>
        <p style={monoMuted}>
          <Link href="/" style={{ color: "var(--sig, #4c8dff)", textDecoration: "none" }}>
            saviours
          </Link>
          {" · "}Privilege Guard · Review
        </p>
        {alertBanner ? (
          <p
            style={{
              margin: "12px 0 0",
              padding: "10px 12px",
              border: "1px solid var(--amber, #e0a84a)",
              color: "var(--amber, #e0a84a)",
              fontSize: 13,
            }}
          >
            Watch alert · {decodeURIComponent(alertBanner)}
          </p>
        ) : null}
        <h1 style={h1}>Review before you authorize</h1>
        <p style={lead}>
          Import the exact Safe transaction. We recompute the Safe tx hash, decode
          supported privileged actions, and return decision + coverage + evidence.
          Static decode ≠ full simulation. You decide.
        </p>

        <div style={{ marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(
            [
              ["safe-json", "Safe JSON"],
              ["calldata", "Raw calldata"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              style={{
                ...chip,
                borderColor: mode === id ? "var(--sig, #4c8dff)" : "var(--line, #2a333c)",
                background:
                  mode === id
                    ? "color-mix(in srgb, var(--sig, #4c8dff) 16%, transparent)"
                    : "var(--bg-inset, #05070b)",
              }}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setMode("safe-json");
              setSafeJson(TERM_DEMO);
              setVault("0x46DA347d1Db6EdCA62BF6Cd5892Dc284fC938613");
              setChainId(1);
              setExpectedHash("");
            }}
            style={chip}
          >
            Load Term Prop 5 demo
          </button>
        </div>

        <label style={label}>
          Chain ID
          <input
            type="number"
            value={chainId}
            onChange={(e) => setChainId(Number(e.target.value) || 1)}
            style={input}
          />
        </label>
        <label style={label}>
          Safe / from address
          <input value={vault} onChange={(e) => setVault(e.target.value)} style={input} />
        </label>

        {mode === "safe-json" ? (
          <label style={label}>
            Safe transaction JSON
            <textarea
              value={safeJson}
              onChange={(e) => setSafeJson(e.target.value)}
              rows={12}
              style={area}
            />
          </label>
        ) : (
          <>
            <label style={label}>
              To
              <input value={to} onChange={(e) => setTo(e.target.value)} style={input} />
            </label>
            <label style={label}>
              Calldata
              <textarea
                value={calldata}
                onChange={(e) => setCalldata(e.target.value)}
                rows={4}
                style={area}
              />
            </label>
          </>
        )}

        <label style={label}>
          Expected Safe tx hash (optional — paste from Safe UI)
          <input
            value={expectedHash}
            onChange={(e) => setExpectedHash(e.target.value)}
            placeholder={computedHash ?? "0x…"}
            style={input}
          />
        </label>
        {computedHash ? (
          <p style={{ ...monoMuted, marginTop: 8 }}>
            Recomputed hash · {computedHash.slice(0, 18)}…{" "}
            <button
              type="button"
              onClick={() => setExpectedHash(computedHash)}
              style={{
                ...chip,
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              Use as expected
            </button>
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void runAssess()}
          disabled={loading}
          style={primaryBtn}
        >
          {loading ? "Assessing…" : "Assess transaction"}
        </button>
        {error ? (
          <p role="alert" style={{ color: "var(--red, #f07178)", marginTop: 12 }}>
            {error}
          </p>
        ) : null}

        {result ? <AssessmentPanel result={result} /> : null}

        <p style={{ ...monoMuted, marginTop: 28 }}>
          Workflow A ·{" "}
          <Link href="/watch" style={{ color: "var(--sig, #4c8dff)" }}>
            /watch
          </Link>
          {" · "}
          <Link href="/queues" style={{ color: "var(--sig, #4c8dff)" }}>
            /queues
          </Link>
          {" · "}Address memory ·{" "}
          <Link href="/resolve" style={{ color: "var(--sig, #4c8dff)" }}>
            /resolve
          </Link>
        </p>
      </div>
    </main>
  );
}

function AssessmentPanel({ result }: { result: AssessWithExplanation }) {
  const tone =
    result.decision === "BLOCK_RECOMMENDATION"
      ? "var(--red, #f07178)"
      : result.decision === "WARN"
        ? "var(--amber, #e0a84a)"
        : "var(--tx-lo, #9aa5b2)";

  return (
    <section style={{ marginTop: 28, borderTop: "1px solid var(--line, #2a333c)", paddingTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontFamily: "var(--font-display, Georgia, serif)", fontSize: 22 }}>
          Privilege assessment
        </h2>
        <span style={{ ...chip, color: tone, borderColor: tone }}>
          {result.decision} · {result.coverage} · integrity {result.integrity}
        </span>
      </div>

      <p
        style={{
          margin: "14px 0 0",
          fontFamily: "var(--font-display, Georgia, serif)",
          fontSize: 18,
          letterSpacing: "-0.02em",
          lineHeight: 1.35,
          maxWidth: 560,
          color: "var(--tx-hi, #f2f5f9)",
        }}
      >
        {result.explanation.summary}
      </p>

      <h3 style={sectionH}>Why this is privileged</h3>
      <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 14, lineHeight: 1.5 }}>
        {result.explanation.bullets.map((b) => (
          <li key={b} style={{ marginBottom: 8 }}>
            {b}
          </li>
        ))}
      </ul>

      <h3 style={sectionH}>Decoded actions</h3>
      <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13 }}>
        {result.actions.map((a) => (
          <li key={a.id} style={{ marginBottom: 6 }}>
            <code>{a.selectorHint ?? a.to}</code> · {a.severity}
            {a.note ? ` — ${a.note}` : ""}
          </li>
        ))}
      </ul>

      {result.unsupportedActions.length ? (
        <>
          <h3 style={sectionH}>Unsupported</h3>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13 }}>
            {result.unsupportedActions.map((u) => (
              <li key={u.id}>
                {u.id}: {u.reason}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {result.errors.length ? (
        <>
          <h3 style={sectionH}>Errors</h3>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--red, #f07178)" }}>
            {result.errors.map((e) => (
              <li key={e.code}>
                {e.code}: {e.message}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h3 style={sectionH}>Why this matters</h3>
      <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--tx, #c5cdd8)" }}>
        <li>NO_VERDICT never means SAFE.</li>
        <li>UNSUPPORTED nested calls keep coverage PARTIAL.</li>
        <li>Hash integrity must MATCH before trusting this as the tx you will sign.</li>
        <li>Registry resolve is optional here — Base Sepolia live address still pending funding.</li>
      </ul>

      <h3 style={sectionH}>Raw</h3>
      <pre style={pre}>
        {JSON.stringify(
          {
            ...result,
            assessedAt: {
              ...result.assessedAt,
              blockNumber: result.assessedAt.blockNumber.toString(),
            },
          },
          null,
          2,
        )}
      </pre>
    </section>
  );
}

const monoMuted: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 11,
  letterSpacing: "0.06em",
  color: "var(--tx-lo, #9aa5b2)",
};

const h1: CSSProperties = {
  margin: "10px 0 0",
  fontFamily: "var(--font-display, Georgia, serif)",
  fontSize: "clamp(26px, 4vw, 34px)",
  letterSpacing: "-0.035em",
  fontWeight: 700,
};

const lead: CSSProperties = {
  margin: "10px 0 0",
  maxWidth: 560,
  fontSize: 14,
  lineHeight: 1.5,
  color: "var(--tx, #c5cdd8)",
};

const label: CSSProperties = {
  display: "block",
  marginTop: 16,
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 11,
  color: "var(--tx-lo, #9aa5b2)",
};

const input: CSSProperties = {
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

const area: CSSProperties = { ...input, resize: "vertical" };

const chip: CSSProperties = {
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 11,
  letterSpacing: "0.04em",
  padding: "8px 12px",
  border: "1px solid var(--line, #2a333c)",
  background: "var(--bg-inset, #05070b)",
  color: "var(--tx-hi, #f2f5f9)",
};

const primaryBtn: CSSProperties = {
  marginTop: 16,
  padding: "11px 16px",
  background: "var(--sig, #4c8dff)",
  color: "#061018",
  border: 0,
  fontWeight: 650,
  cursor: "pointer",
};

const sectionH: CSSProperties = {
  margin: "20px 0 0",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 10,
  letterSpacing: "0.08em",
  color: "var(--tx-faint, #6a7280)",
  fontWeight: 500,
};

const pre: CSSProperties = {
  marginTop: 8,
  padding: 12,
  background: "var(--bg-inset, #05070b)",
  border: "1px solid var(--line, #2a333c)",
  fontSize: 11,
  overflow: "auto",
  fontFamily: "var(--font-mono, monospace)",
  color: "var(--tx, #c5cdd8)",
};
