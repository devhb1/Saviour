"use client";

import { useState, type CSSProperties } from "react";
import { btnGhost } from "./AppShell";

const RESOLVER = "0xF479306621F718F7d76875f67506ceD33717751c";

/**
 * ENS-first passport — reuse on Live / Shield / Identity / Memory.
 * Largest type = the name. Status stamp beside it.
 */
export function EnsPassport({
  ensName,
  status,
  threat,
  address,
  evidenceHash,
  atomicTx,
  cast,
  onOpenIdentity,
  compact,
}: {
  ensName?: string | null;
  status?: string | null;
  threat?: string | null;
  address?: string;
  evidenceHash?: string | null;
  atomicTx?: string | null;
  cast?: string | null;
  onOpenIdentity?: () => void;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const name =
    ensName?.trim() ||
    (address
      ? `${address.toLowerCase()}.saviours.eth`
      : "—.saviours.eth");
  const st = (status || "").toUpperCase() || "—";
  const castCmd =
    cast ||
    `cast call ${RESOLVER} "text(bytes32,string)(string)" $(cast namehash ${name}) "saviours.status"`;

  async function copyCast() {
    try {
      await navigator.clipboard.writeText(castCmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  return (
    <div
      className="ens-passport"
      style={{
        padding: compact ? "14px 16px" : "20px 22px",
        border: "1px solid color-mix(in srgb, var(--signal) 35%, var(--line))",
        borderRadius: "var(--radius-md)",
        background:
          "linear-gradient(145deg, color-mix(in srgb, var(--signal) 8%, var(--surface)), var(--surface))",
        maxWidth: compact ? 560 : 720,
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.12em",
          color: "var(--signal)",
        }}
      >
        ENS PASSPORT · saviours.eth
      </p>
      <p
        style={{
          margin: "10px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: compact ? "clamp(14px, 2.4vw, 18px)" : "clamp(16px, 2.8vw, 22px)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
          wordBreak: "break-all",
          lineHeight: 1.35,
        }}
      >
        {name}
      </p>
      <div
        style={{
          marginTop: 12,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <span
          style={{
            ...stamp,
            background:
              st === "TAINTED"
                ? "color-mix(in srgb, var(--block) 18%, transparent)"
                : st === "WATCH"
                  ? "color-mix(in srgb, var(--warn) 18%, transparent)"
                  : "var(--surface)",
            borderColor:
              st === "TAINTED"
                ? "var(--block)"
                : st === "WATCH"
                  ? "var(--warn)"
                  : "var(--line)",
            color:
              st === "TAINTED"
                ? "var(--block)"
                : st === "WATCH"
                  ? "var(--warn)"
                  : "var(--ink-muted)",
          }}
        >
          {st}
        </span>
        {threat ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-muted)",
            }}
          >
            {threat}
          </span>
        ) : null}
      </div>
      {(evidenceHash || atomicTx) && !compact ? (
        <p
          style={{
            margin: "12px 0 0",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-muted)",
            lineHeight: 1.5,
            wordBreak: "break-all",
          }}
        >
          {evidenceHash ? <>evidence {evidenceHash.slice(0, 18)}… · </> : null}
          {atomicTx ? <>atomicTx {atomicTx.slice(0, 18)}…</> : null}
        </p>
      ) : null}
      <div
        style={{
          marginTop: 14,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <button type="button" onClick={() => void copyCast()} style={btnGhost}>
          {copied ? "Copied cast" : "Copy cast"}
        </button>
        {onOpenIdentity ? (
          <button type="button" onClick={onOpenIdentity} style={btnGhost}>
            Open Identity →
          </button>
        ) : null}
      </div>
      <p
        style={{
          margin: "10px 0 0",
          fontSize: 12,
          color: "var(--ink-muted)",
          lineHeight: 1.45,
        }}
      >
        If this app disappears, public Sepolia RPC still returns this status.
      </p>
    </div>
  );
}

const stamp: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  padding: "6px 12px",
  border: "1px solid",
  borderRadius: 2,
};
