"use client";

import type { CSSProperties } from "react";
import type { RegistryHeadline } from "./AppShell";

/**
 * Header telemetry — one quiet strip, not a pile of labeled pill groups.
 * Registry catalog left · this-browser session right (when non-zero).
 */
export function ChromeLiveStats({
  registry,
  memoryHits,
  sessionPaid = 0,
}: {
  registry: RegistryHeadline;
  memoryHits: number;
  sessionPaid?: number;
}) {
  const sessionTotal = memoryHits + sessionPaid;
  const paidUsd = sessionPaid > 0 ? sessionPaid * 0.01 : 0;

  const named =
    registry.loading ? "…" : registry.failed ? "—" : String(registry.named);
  const graph =
    registry.loading
      ? "…"
      : registry.failed
        ? "—"
        : String(registry.graphVerified);

  return (
    <div
      style={wrap}
      role="group"
      aria-label="Live memory and session meters"
    >
      <div
        style={strip}
        title={
          registry.loading
            ? "Loading catalog counts…"
            : registry.failed
              ? "Registry counts unavailable — refresh"
              : "Security memory on Sepolia. Named = WATCH|TAINTED. Graph = proof:graph only."
        }
      >
        <span style={num}>{named}</span>
        <span style={unit}>named</span>
        <span style={dot} aria-hidden>
          ·
        </span>
        <span style={{ ...num, color: "var(--sig)" }}>{graph}</span>
        <span style={unit}>graph</span>
        <span style={sep} aria-hidden />
        <span style={chain}>Sepolia</span>
      </div>

      {sessionTotal > 0 ? (
        <div
          style={sessionChip}
          title="This browser only. Free = shield MEMORY HITs ($0). Paid = investigate settles you triggered."
        >
          <span style={{ ...num, color: "var(--green, var(--safe))" }}>
            {memoryHits}
          </span>
          <span style={unit}>free</span>
          {sessionPaid > 0 ? (
            <>
              <span style={dot} aria-hidden>
                ·
              </span>
              <span style={{ ...num, color: "var(--amber)" }}>
                ${paidUsd.toFixed(2)}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const wrap: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  flexShrink: 1,
  minWidth: 0,
};

const strip: CSSProperties = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: 5,
  padding: "5px 9px",
  borderRadius: "var(--radius-sm, 6px)",
  border: "1px solid color-mix(in srgb, var(--line) 85%, transparent)",
  background: "var(--bg-raise, var(--surface))",
  fontFamily: "var(--font-mono)",
  whiteSpace: "nowrap",
  cursor: "help",
};

const sessionChip: CSSProperties = {
  ...strip,
  background:
    "color-mix(in srgb, var(--green, var(--safe)) 8%, var(--bg-raise, var(--surface)))",
  borderColor:
    "color-mix(in srgb, var(--green, var(--safe)) 28%, var(--line))",
};

const num: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  color: "var(--tx-hi)",
  lineHeight: 1,
};

const unit: CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.04em",
  color: "var(--tx-lo)",
  lineHeight: 1,
};

const dot: CSSProperties = {
  fontSize: 10,
  color: "var(--tx-faint)",
  lineHeight: 1,
};

const sep: CSSProperties = {
  width: 1,
  height: 11,
  margin: "0 2px",
  alignSelf: "center",
  background: "color-mix(in srgb, var(--line) 90%, transparent)",
};

const chain: CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--sig)",
  lineHeight: 1,
};
