"use client";

import type { CSSProperties, ReactNode } from "react";
import { AddressDisplay } from "./AddressDisplay";
import { ReceiptStrip } from "./ReceiptStrip";
import { getFirstEncounter } from "../lib/receiptStore";
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
        border: `2px solid ${hit ? "var(--signal)" : "var(--line)"}`,
        borderRadius: 4,
        background: hit ? "rgba(13,122,95,0.07)" : "rgba(255,255,255,0.5)",
      }}
    >
      <p style={eyebrow}>
        {hit ? "MEMORY CHECK · KNOWN" : "MEMORY CHECK · NO MEMORY"}
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
          margin: "14px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: 36,
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
