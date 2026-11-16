"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { decodeTermLike } from "@saviours/queuewatch";

/**
 * Option B — pre-sign review for supported Safe module / Zodiac ops.
 * Does NOT claim Safe Transaction Service coverage for all pending txs.
 */
export default function ReviewPage() {
  const [vault, setVault] = useState("");
  const [hints, setHints] = useState("setTxCooldown\nsetTxExpiration\nenableModule");
  const [note, setNote] = useState("");

  const decoded = useMemo(() => {
    const lines = hints
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return decodeTermLike({
      rolesInner: lines.map((selectorHint) => ({
        to: vault || "0x0000000000000000000000000000000000000000",
        data: "0x",
        selectorHint,
      })),
    });
  }, [hints, vault]);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 20px 64px",
        maxWidth: 720,
        margin: "0 auto",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        color: "#e8eaef",
        background: "#0b0d10",
      }}
    >
      <p style={{ opacity: 0.7, fontSize: 12 }}>
        <Link href="/" style={{ color: "#7dd3a7" }}>
          Saviours
        </Link>{" "}
        · Option B pre-sign review
      </p>
      <h1 style={{ fontSize: 22, marginTop: 8 }}>Supported ops review</h1>
      <p style={{ opacity: 0.75, fontSize: 13, lineHeight: 1.5 }}>
        Decode Zodiac/module-style selector hints before you sign. This path does{" "}
        <strong>not</strong> intercept all Safe pending transactions — only ops you
        paste here.
      </p>

      <label style={{ display: "block", marginTop: 24, fontSize: 12 }}>
        Vault / Safe address
        <input
          value={vault}
          onChange={(e) => setVault(e.target.value)}
          placeholder="0x…"
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
            padding: 10,
            background: "#14181d",
            border: "1px solid #2a333c",
            color: "#e8eaef",
          }}
        />
      </label>

      <label style={{ display: "block", marginTop: 16, fontSize: 12 }}>
        Selector hints (one per line)
        <textarea
          value={hints}
          onChange={(e) => setHints(e.target.value)}
          rows={6}
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
            padding: 10,
            background: "#14181d",
            border: "1px solid #2a333c",
            color: "#e8eaef",
          }}
        />
      </label>

      <button
        type="button"
        onClick={() =>
          setNote(
            decoded.vaultWrite === "WATCH"
              ? `Decoder severity ${decoded.maxSeverity} → registry write WATCH (not auto-TAINTED). Resolve vault on Base before authorize.`
              : `Max severity ${decoded.maxSeverity}. Unsupported or non-critical — do not invent SAFE.`,
          )
        }
        style={{
          marginTop: 16,
          padding: "10px 14px",
          background: "#1a6b4a",
          border: 0,
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Decode
      </button>

      <pre
        style={{
          marginTop: 20,
          padding: 12,
          background: "#14181d",
          border: "1px solid #2a333c",
          fontSize: 11,
          overflow: "auto",
        }}
      >
        {JSON.stringify(
          {
            maxSeverity: decoded.maxSeverity,
            vaultWrite: decoded.vaultWrite,
            supported: decoded.supported,
            actions: decoded.actions,
          },
          null,
          2,
        )}
      </pre>
      {note ? <p style={{ marginTop: 12, fontSize: 13, color: "#f0c674" }}>{note}</p> : null}
      <p style={{ marginTop: 24, fontSize: 12, opacity: 0.6 }}>
        Also see <Link href="/resolve" style={{ color: "#7dd3a7" }}>/resolve</Link> and{" "}
        <Link href="/queues" style={{ color: "#7dd3a7" }}>/queues</Link>.
      </p>
    </main>
  );
}
