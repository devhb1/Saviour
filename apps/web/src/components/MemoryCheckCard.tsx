"use client";

import type { CSSProperties, ReactNode } from "react";
import { AddressDisplay } from "./AddressDisplay";
import { ReceiptStrip } from "./ReceiptStrip";
import { getFirstEncounter } from "../lib/receiptStore";
import { whatToDoForDecision } from "../lib/verdictGuidance";
import { btnGhost, btnPrimary } from "./AppShell";

export type MemoryCheckCardProps = {
  address: string;
  decision: string;
  source: string;
  usedAi: boolean;
  latencyMs?: number;
  status?: string | null;
  ensName?: string | null;
  threat?: string | null;
  plainVerdict?: string | null;
  onOpenCase?: () => void;
  onForceFresh?: () => void;
  extra?: ReactNode;
};

function isMemorySource(source: string): boolean {
  return source === "ens" || source === "registry";
}

/**
 * Kollateral-inspired compact card — memory at the point of action.
 * SAVIOURS nouns: Known threat · Decision · AI not required · receipt · Open case.
 */
export function MemoryCheckCard({
  address,
  decision,
  source,
  usedAi,
  latencyMs,
  status,
  ensName,
  threat,
  plainVerdict,
  onOpenCase,
  onForceFresh,
  extra,
}: MemoryCheckCardProps) {
  const hit = isMemorySource(source);
  const decisionColor =
    decision === "BLOCK"
      ? "var(--block)"
      : decision === "WARN"
        ? "var(--warn)"
        : decision === "ESCALATE"
          ? "var(--ink-muted)"
          : "var(--signal)";

  return (
    <div
      className="rise pulse-decision"
      style={{
        marginTop: 18,
        padding: "18px 18px",
        border: `1px solid ${hit ? "var(--line)" : "var(--line)"}`,
        borderRadius: "var(--radius-md)",
        background: hit
          ? "color-mix(in srgb, var(--signal) 4%, var(--surface))"
          : "var(--surface)",
      }}
    >
      <p style={eyebrow}>
        {hit ? "SHIELD RECEIPT · MEMORY HIT" : "SHIELD RECEIPT · NO MEMORY"}
        {" · "}
        source={source}
      </p>

      <div style={{ marginTop: 10 }}>
        <AddressDisplay
          address={address}
          status={status}
          ensName={ensName}
          variant="block"
        />
      </div>

      <p
        style={{
          margin: "12px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: 28,
          fontWeight: 500,
          color: decisionColor,
          letterSpacing: "-0.02em",
        }}
      >
        {decision}
      </p>

      <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--ink-muted)" }}>
        {hit ? (
          <>
            Known threat
            {status ? ` · ${status}` : ""}
            {threat ? ` · ${threat}` : ""}
            {" · "}
            <strong style={{ color: "var(--ink)" }}>AI not required</strong>
          </>
        ) : (
          <>
            No named memory — {decision === "ESCALATE" ? "investigate if needed" : decision}
            {usedAi ? " · AI was used" : " · AI not used"}
          </>
        )}
      </p>

      {plainVerdict ? (
        <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.45 }}>{plainVerdict}</p>
      ) : null}

      <p
        style={{
          margin: "12px 0 0",
          padding: "10px 12px",
          borderLeft: `3px solid ${decisionColor}`,
          background: "color-mix(in srgb, var(--surface) 80%, transparent)",
          fontSize: 14,
          lineHeight: 1.45,
          color: "var(--ink)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            display: "block",
            marginBottom: 4,
          }}
        >
          What to do
        </span>
        {whatToDoForDecision(decision, status)}
      </p>

      {hit ? (
        <ReceiptStrip
          mode="memory"
          now={{
            graphQueries: 0,
            aiCalls: 0,
            latencyMs: latencyMs ?? 0,
            at: new Date().toISOString(),
          }}
          first={getFirstEncounter(address)}
        />
      ) : (
        <p
          style={{
            margin: "12px 0 0",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--ink-muted)",
          }}
        >
          0 Graph · 0 AI · {latencyMs ?? "—"}ms
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        {onOpenCase ? (
          <button type="button" onClick={onOpenCase} style={btnPrimary}>
            Open case
          </button>
        ) : null}
        {onForceFresh && hit ? (
          <button type="button" onClick={onForceFresh} style={btnGhost}>
            Re-investigate live
          </button>
        ) : null}
      </div>

      {extra}
    </div>
  );
}

const eyebrow: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.08em",
  color: "var(--ink-muted)",
};
