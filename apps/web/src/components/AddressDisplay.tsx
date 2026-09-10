"use client";

import { useState, type CSSProperties } from "react";

const PARENT = "saviours.eth";

/** Known protocol / treasury labels (hex → display). Expand over time. */
const KNOWN_LABELS: Record<string, string> = {
  "0x55fe002aeff02f77364de339a1292923a15844b8": "Circle USDC Treasury",
  "0x28c6c06298d514db089934071355e5743bf21d60": "Binance 14",
  "0x71660c4005ba85c37ccec55d0c4493e66fe775d3": "Coinbase 1",
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
  "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2": "Aave V3 Pool",
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": "Uniswap Universal Router",
};

export type AddressDisplayProps = {
  address: string;
  /** Optional live SAVIOURS status from ENS */
  status?: string | null;
  /** Prefer showing case ENS name when hit */
  ensName?: string | null;
  variant?: "inline" | "block";
  showCopy?: boolean;
};

function truncate(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function isHexAddress(a: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(a);
}

/**
 * Hex → human display. Resolution order (local, no RPC in v1 of component):
 * 1) SAVIOURS case name + status badge if provided
 * 2) Known protocol/treasury label
 * 3) Truncated hex + copy
 */
export function AddressDisplay({
  address,
  status,
  ensName,
  variant = "inline",
  showCopy = true,
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);
  const lower = address.toLowerCase();
  const known = KNOWN_LABELS[lower];
  const derived =
    ensName ??
    (isHexAddress(address) ? `${lower}.${PARENT}` : null);

  const statusColor =
    status === "TAINTED"
      ? "var(--block)"
      : status === "WATCH"
        ? "var(--warn)"
        : "var(--ink-muted)";

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  const primary =
    status && derived
      ? derived
      : known
        ? known
        : truncate(address);

  const secondary =
    status && derived
      ? truncate(address)
      : known
        ? truncate(address)
        : derived && !status
          ? derived
          : null;

  return (
    <span
      style={{
        display: variant === "block" ? "flex" : "inline-flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        maxWidth: "100%",
      }}
    >
      {status ? (
        <span
          style={{
            padding: "2px 6px",
            borderRadius: 2,
            border: `1px solid ${statusColor}`,
            color: statusColor,
            fontSize: 10,
            letterSpacing: "0.04em",
          }}
        >
          {status}
        </span>
      ) : null}
      <span
        style={{
          color: status ? "var(--ink)" : known ? "var(--ink)" : "var(--ink-muted)",
          wordBreak: "break-all",
        }}
        title={address}
      >
        {primary}
      </span>
      {secondary ? (
        <span style={{ color: "var(--ink-muted)", fontSize: 11 }}>{secondary}</span>
      ) : null}
      {showCopy ? (
        <button type="button" onClick={() => void copy()} style={copyBtn}>
          {copied ? "✓" : "copy"}
        </button>
      ) : null}
    </span>
  );
}

const copyBtn: CSSProperties = {
  padding: "2px 6px",
  border: "1px solid var(--line)",
  borderRadius: 2,
  background: "transparent",
  color: "var(--ink-muted)",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  cursor: "pointer",
};
