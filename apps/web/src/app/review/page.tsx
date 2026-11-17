"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  assessAndExplain,
  computeSafeTxHash,
  decodeExecutionTree,
  discoverDelayAddress,
  type AssessWithExplanation,
} from "@saviours/check";
import type { Hex } from "viem";
import { TERM_SAFE } from "../../components/ProductChrome";

const TERM_EXPECTED_HASH =
  "0x77cecf358e53ad78db21901cb8cf17da49343146b6401e1029ccf392e523882b" as Hex;

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
 * Transaction Review — Safe JSON / calldata + Privilege Diff.
 */
export default function ReviewPage() {
  const [mode, setMode] = useState<Mode>("safe-json");
  const [vault, setVault] = useState(TERM_SAFE);
  const [chainId, setChainId] = useState(1);
  const [safeJson, setSafeJson] = useState(TERM_DEMO);
  const [calldata, setCalldata] = useState(
    "0xebb2b4a20000000000000000000000000000000000000000000000000000000000000000",
  );
  const [to, setTo] = useState("0x35C99CF4a5DF2D9bCd822BeE32676D9590229e33");
  const [expectedHash, setExpectedHash] = useState<string>(TERM_EXPECTED_HASH);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AssessWithExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const data = q.get("data");
    const safe = q.get("safe");
    const chain = q.get("chainId");
    const alert = q.get("alert");
    const demo = q.get("demo");
    if (demo === "term") {
      setMode("safe-json");
      setSafeJson(TERM_DEMO);
      setVault(TERM_SAFE);
      setChainId(1);
      setExpectedHash(TERM_EXPECTED_HASH);
    }
    if (safe) setVault(safe);
    if (chain) setChainId(Number(chain) || 1);
    if (data?.startsWith("0x")) {
      setMode("calldata");
      setCalldata(data);
      setTo(q.get("to") || "0x35C99CF4a5DF2D9bCd822BeE32676D9590229e33");
    }
    if (alert) setAlertBanner(alert);
  }, []);

  const computedHash = useMemo(() => {
    if (mode !== "safe-json") return null;
    try {
      const tx = JSON.parse(safeJson) as Record<string, string | number>;
      return computeSafeTxHash({
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

  async function fetchCurrentControls(
    delayAddr: string | null,
    safeAddr: string,
    inconclusive?: boolean,
    inconclusiveReason?: string,
  ) {
    try {
      const q = new URLSearchParams({
        chainId: String(chainId),
        safe: safeAddr,
      });
      if (delayAddr) q.set("delay", delayAddr);
      if (inconclusive) {
        q.set("inconclusive", "1");
        if (inconclusiveReason) q.set("reason", inconclusiveReason);
      }
      const r = await fetch(`/api/review/controls?${q}`);
      const j = await r.json();
      if (!r.ok) return undefined;
      return j.controls as {
        txCooldown: string | null;
        txExpiration: string | null;
        modules: string[] | null;
        delay: string | null;
        blockNumber: string | null;
        blockHash: string | null;
        inconclusive?: boolean;
        inconclusiveReason?: string;
      };
    } catch {
      return undefined;
    }
  }

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
        const preview = decodeExecutionTree({
          to: String(tx.to),
          data: String(tx.data ?? "0x"),
        });
        const delayDisc = discoverDelayAddress({
          outerTo: String(tx.to),
          outerData: String(tx.data ?? "0x"),
          decode: preview,
        });
        const currentControls = await fetchCurrentControls(
          delayDisc.delayAddress,
          vault,
          delayDisc.inconclusive,
          delayDisc.reason,
        );
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
            currentControls,
          },
        );
        if (currentControls?.blockNumber && assessment.assessedAt) {
          assessment = {
            ...assessment,
            assessedAt: {
              ...assessment.assessedAt,
              blockNumber: BigInt(currentControls.blockNumber),
              blockHash: (currentControls.blockHash ??
                assessment.assessedAt.blockHash) as Hex,
            },
            privilegeDiff: {
              ...assessment.privilegeDiff,
              honesty: [
                ...assessment.privilegeDiff.honesty,
                currentControls.inconclusive
                  ? `Before-state inconclusive: ${currentControls.inconclusiveReason ?? "unknown"}`
                  : `Before-state read at block ${currentControls.blockNumber}${currentControls.blockHash ? ` (${currentControls.blockHash.slice(0, 10)}…)` : ""}.`,
              ],
            },
          };
        }
      } else {
        const preview = decodeExecutionTree({ to, data: calldata });
        const delayDisc = discoverDelayAddress({
          outerTo: to,
          outerData: calldata,
          decode: preview,
        });
        const currentControls = await fetchCurrentControls(
          delayDisc.delayAddress,
          vault,
          delayDisc.inconclusive,
          delayDisc.reason,
        );
        assessment = await assessAndExplain(
          {
            kind: "RAW_CALL",
            chainId,
            from: vault as Hex,
            to: to as Hex,
            value: 0n,
            data: calldata as Hex,
          },
          { currentControls },
        );
      }
      setResult(assessment);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function loadTermDemo() {
    setMode("safe-json");
    setSafeJson(TERM_DEMO);
    setVault(TERM_SAFE);
    setChainId(1);
    setExpectedHash(TERM_EXPECTED_HASH);
    setError(null);
    setAlertBanner(null);
    setResult(null);
  }

  async function copyShareLink() {
    const url = new URL(window.location.origin + "/review");
    url.searchParams.set("safe", vault.trim());
    url.searchParams.set("chainId", String(chainId));
    if (mode === "calldata") {
      url.searchParams.set("to", to.trim());
      url.searchParams.set("data", calldata.trim());
    } else {
      url.searchParams.set("demo", "term");
    }
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="cp-tool">
      <p className="cp-tool-eyebrow">
        Transaction Review · Safe 1.3+ hash · Privilege Diff
      </p>
      {alertBanner ? (
        <p
          className="cp-honesty-rail"
          style={{ borderLeftColor: "var(--amber)" }}
        >
          Alert context · {decodeURIComponent(alertBanner)}
        </p>
      ) : null}
      <h1 className="cp-tool-h1">Review before you authorize</h1>
      <p className="cp-tool-lead">
        Import the exact Safe transaction. We recompute the Safe 1.3+ tx hash,
        decode the execution tree, and show Privilege Diff (before → after).
      </p>
      <p className="cp-honesty-rail" role="note">
        NO_VERDICT ≠ SAFE · SIGNER DECIDES in your existing Safe UI · cannot
        detect compromised keys
      </p>

      <div className="cp-chip-row">
        {(
          [
            ["safe-json", "Safe JSON"],
            ["calldata", "Raw calldata"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="cp-chip"
            data-on={mode === id ? "true" : "false"}
            onClick={() => setMode(id)}
          >
            {label}
          </button>
        ))}
        <button type="button" className="cp-chip" onClick={loadTermDemo}>
          Load Term Prop 5 demo
        </button>
      </div>

      <label className="cp-field">
        Chain ID
        <input
          type="number"
          value={chainId}
          onChange={(e) => setChainId(Number(e.target.value) || 1)}
        />
      </label>
      <label className="cp-field">
        Safe / from address
        <input value={vault} onChange={(e) => setVault(e.target.value)} />
      </label>

      {mode === "safe-json" ? (
        <label className="cp-field">
          Safe transaction JSON
          <textarea
            value={safeJson}
            onChange={(e) => setSafeJson(e.target.value)}
            rows={12}
          />
        </label>
      ) : (
        <>
          <label className="cp-field">
            To
            <input value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="cp-field">
            Calldata
            <textarea
              value={calldata}
              onChange={(e) => setCalldata(e.target.value)}
              rows={4}
            />
          </label>
        </>
      )}

      <label className="cp-field">
        Expected Safe tx hash (optional — paste from Safe UI)
        <input
          value={expectedHash}
          onChange={(e) => setExpectedHash(e.target.value)}
          placeholder={computedHash ?? "0x…"}
        />
      </label>
      {computedHash ? (
        <p
          style={{
            marginTop: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--tx-lo)",
          }}
        >
          Locally recomputed hash · {computedHash.slice(0, 18)}… — paste an
          independent hash for MATCH; empty stays UNCHECKED.
        </p>
      ) : null}

      <div className="cp-actions">
        <button
          type="button"
          className="cp-btn-loud"
          onClick={() => void runAssess()}
          disabled={loading}
        >
          {loading ? "Assessing…" : "Assess transaction"}
        </button>
        <button
          type="button"
          className="cp-btn-quiet"
          onClick={() => void copyShareLink()}
        >
          {copied ? "Copied" : "Copy share link"}
        </button>
      </div>

      {error ? (
        <p role="alert" style={{ color: "var(--red)", marginTop: 12 }}>
          {error}
        </p>
      ) : null}

      {result ? <AssessmentPanel result={result} vault={vault} /> : null}

      <p
        style={{
          marginTop: 28,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--tx-lo)",
        }}
      >
        Baseline ·{" "}
        <Link
          href={`/audit?safe=${encodeURIComponent(vault.trim())}`}
          style={{ color: "var(--sig)" }}
        >
          Audit this Safe
        </Link>
        {" · "}
        CLI <code>pnpm review:cli</code>
      </p>
    </main>
  );
}

function AssessmentPanel({
  result,
  vault,
}: {
  result: AssessWithExplanation;
  vault: string;
}) {
  const tone =
    result.decision === "BLOCK_RECOMMENDATION"
      ? "var(--red)"
      : result.decision === "WARN"
        ? "var(--amber)"
        : "var(--tx-lo)";

  return (
    <section style={{ marginTop: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "baseline",
        }}
      >
        <h2
          style={{
            margin: "28px 0 0",
            fontFamily: "var(--font-display)",
            fontSize: 22,
            letterSpacing: "-0.02em",
            color: "var(--tx-hi)",
          }}
        >
          Privilege Diff
        </h2>
        <span
          className="cp-chip"
          style={{ color: tone, borderColor: tone, cursor: "default" }}
        >
          {result.decision} · {result.coverage} · integrity {result.integrity}
        </span>
      </div>

      <p
        style={{
          margin: "14px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: 18,
          letterSpacing: "-0.02em",
          lineHeight: 1.35,
          maxWidth: 560,
          color: "var(--tx-hi)",
        }}
      >
        {result.privilegeDiff.summary}
      </p>

      <h3 className="cp-section-label">Before → after</h3>
      <div>
        {result.privilegeDiff.claims.map((c) => (
          <div key={c.id} className="cp-diff-claim">
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--tx-lo)",
              }}
            >
              {c.severity} · {c.source}
            </div>
            <div style={{ marginTop: 4, fontWeight: 650 }}>{c.control}</div>
            <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.45 }}>
              <span style={{ color: "var(--tx-lo)" }}>Before</span> {c.before}
              <br />
              <span style={{ color: "var(--amber)" }}>After</span> {c.after}
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--tx-lo)",
              }}
            >
              {c.evidence}
            </div>
          </div>
        ))}
        {result.privilegeDiff.claims.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--tx-lo)" }}>
            No privilege control changes decoded.
          </p>
        ) : null}
      </div>

      <h3 className="cp-section-label">Why this matters</h3>
      <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 14, lineHeight: 1.5 }}>
        {result.explanation.bullets.map((b) => (
          <li key={b} style={{ marginBottom: 8 }}>
            {b}
          </li>
        ))}
      </ul>

      {result.privilegeDiff.unknowns.length ? (
        <>
          <h3 className="cp-section-label">Unknown / unread</h3>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13 }}>
            {result.privilegeDiff.unknowns.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </>
      ) : null}

      <h3 className="cp-section-label">Execution tree</h3>
      <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13 }}>
        {result.actions.map((a) => (
          <li key={a.id} style={{ marginBottom: 6 }}>
            <code>{a.selectorHint ?? a.to}</code> · {a.severity}
            {a.parentId ? ` · path ${a.parentId}` : ""}
            {a.note ? ` — ${a.note}` : ""}
          </li>
        ))}
      </ul>

      {result.unsupportedActions.length ? (
        <>
          <h3 className="cp-section-label">Unsupported</h3>
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
          <h3 className="cp-section-label">Errors</h3>
          <ul
            style={{
              margin: "8px 0 0",
              paddingLeft: 18,
              fontSize: 13,
              color: "var(--red)",
            }}
          >
            {result.errors.map((e) => (
              <li key={e.code}>
                {e.code}: {e.message}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h3 className="cp-section-label">Limitations</h3>
      <ul
        style={{
          margin: "8px 0 0",
          paddingLeft: 18,
          fontSize: 13,
          color: "var(--tx)",
        }}
      >
        {result.privilegeDiff.honesty.map((h) => (
          <li key={h}>{h}</li>
        ))}
        <li>NO_VERDICT never means SAFE.</li>
        <li>
          Safe hash uses EIP-712 domain (chainId, verifyingContract) for Safe
          1.3+.
        </li>
      </ul>

      <div className="cp-handoff">
        <div style={{ fontWeight: 650, letterSpacing: "-0.02em", color: "var(--tx-hi)" }}>
          SIGNER DECIDES
        </div>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 13,
            lineHeight: 1.45,
            color: "var(--tx)",
          }}
        >
          Authorize or reject this transaction in your existing Safe UI / wallet.
          Saviours does not submit or block transactions.
        </p>
        <p style={{ margin: "12px 0 0" }}>
          <Link
            href={`/audit?safe=${encodeURIComponent(vault.trim())}`}
            style={{ color: "var(--sig)", fontSize: 13 }}
          >
            Audit baseline for this Safe →
          </Link>
        </p>
      </div>

      <h3 className="cp-section-label">Raw (reproducible)</h3>
      <pre className="cp-evidence">
        {JSON.stringify(
          result,
          (_k, v) => (typeof v === "bigint" ? v.toString() : v),
          2,
        )}
      </pre>
    </section>
  );
}
