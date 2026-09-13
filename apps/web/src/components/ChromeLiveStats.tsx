"use client";

import type { CSSProperties, ReactNode } from "react";
import type { RegistryHeadline } from "./AppShell";

/**
 * Header live meter — Registry vs this browser session, clearly separated.
 * Replaces the flat “26 named · 2 Graph · Sepolia session · 43 · 43 free” mash.
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

  return (
    <div
      style={wrap}
      role="group"
      aria-label="Live memory and session meters"
    >
      <MeterGroup
        label="Registry"
        title={
          registry.loading
            ? "Loading catalog counts…"
            : registry.failed
              ? "Registry counts unavailable — refresh"
              : "Security memory on Sepolia. Named = WATCH|TAINTED in the catalog. Graph = proof:graph only."
        }
      >
        {registry.loading ? (
          <>
            <StatPill skeleton label="named" />
            <StatPill skeleton label="graph" />
          </>
        ) : registry.failed ? (
          <>
            <StatPill value="—" label="named" muted />
            <StatPill value="—" label="graph" muted />
          </>
        ) : (
          <>
            <StatPill
              value={String(registry.named)}
              label="named"
              accent="var(--tx-hi)"
            />
            <StatPill
              value={String(registry.graphVerified)}
              label="graph proof"
              accent="var(--sig)"
            />
          </>
        )}
        <ChainChip />
      </MeterGroup>

      {sessionTotal > 0 ? (
        <MeterGroup
          label="Session"
          title="This browser only. Free = shield MEMORY HITs ($0). Paid = investigate settles you triggered."
        >
          <StatPill
            value={String(memoryHits)}
            label="free hits"
            accent="var(--green, var(--safe))"
          />
          {sessionPaid > 0 ? (
            <StatPill
              value={`$${paidUsd.toFixed(2)}`}
              label="paid"
              accent="var(--amber)"
            />
          ) : null}
        </MeterGroup>
      ) : null}
    </div>
  );
}

function MeterGroup({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={group} title={title}>
      <span style={groupLabel}>{label}</span>
      <div style={pills}>{children}</div>
    </div>
  );
}

function ChainChip() {
  return (
    <span style={chainChip} title="Security memory chain · ENSv2 Sepolia">
      Sepolia
    </span>
  );
}

function StatPill({
  value,
  label,
  accent,
  muted,
  skeleton,
}: {
  value?: string;
  label: string;
  accent?: string;
  muted?: boolean;
  skeleton?: boolean;
}) {
  if (skeleton) {
    return (
      <span style={pill} aria-busy="true" className="skeleton">
        <span style={{ ...pillValue, minWidth: 12 }}>&nbsp;</span>
        <span style={pillLabel}>{label}</span>
      </span>
    );
  }
  return (
    <span style={pill}>
      <span
        style={{
          ...pillValue,
          color: muted ? "var(--tx-faint)" : accent ?? "var(--tx-hi)",
        }}
      >
        {value}
      </span>
      <span style={pillLabel}>{label}</span>
    </span>
  );
}

const wrap: CSSProperties = {
  display: "inline-flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
};

const group: CSSProperties = {
  display: "inline-flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 6,
  padding: "4px 8px",
  borderRadius: "var(--radius-sm, 6px)",
  border: "1px solid color-mix(in srgb, var(--line) 85%, transparent)",
  background: "var(--bg-raise, var(--surface))",
  boxShadow: "var(--edge, none)",
  cursor: "help",
};

const groupLabel: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--tx-faint)",
  flexShrink: 0,
};

const pills: CSSProperties = {
  display: "inline-flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 4,
};

const pill: CSSProperties = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: 4,
  padding: "2px 6px",
  borderRadius: 4,
  background: "var(--bg-high, var(--bg-inset))",
  border: "1px solid var(--line)",
};

const pillValue: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1.2,
};

const pillLabel: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.02em",
  color: "var(--tx-lo)",
  lineHeight: 1.2,
};

const chainChip: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--sig)",
  padding: "2px 6px",
  borderRadius: 4,
  border: "1px solid var(--sig-line, var(--line))",
  background: "var(--sig-wash, transparent)",
};
