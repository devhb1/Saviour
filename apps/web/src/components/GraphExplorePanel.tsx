"use client";

import { useEffect, useRef } from "react";
import { btnGhost, btnPrimary } from "./AppShell";
import {
  ProvenanceGraph,
  type ProvenanceEvidence,
} from "./ProvenanceGraph";

/**
 * In-column graph workspace — keeps the Case trust rail visible.
 * Replaces the old centered modal that covered passport + Ask.
 */
export function GraphExplorePanel({
  address,
  evidence,
  onClose,
  closeLabel = "← Back to case",
  dense = false,
  height,
}: {
  address: string;
  evidence: ProvenanceEvidence[];
  onClose: () => void;
  closeLabel?: string;
  /** Tighter chrome for Playground Graph. */
  dense?: boolean;
  height?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const graphH = height ?? (dense ? 360 : 420);

  useEffect(() => {
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={rootRef}
      className="rise"
      style={{
        border: "1px solid var(--signal)",
        borderRadius: 4,
        background: "var(--bg-high)",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: dense ? "8px 12px" : "12px 14px",
          borderBottom: "1px solid var(--line)",
          background: "rgba(13,122,95,0.06)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "var(--signal)",
            }}
          >
            PROVENANCE · SAME-TX
          </p>
          {!dense ? (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "var(--ink-muted)",
                lineHeight: 1.4,
              }}
            >
              Same-tx multi-protocol path only (capped) · green edges · Esc to
              close
            </p>
          ) : (
            <p
              style={{
                margin: "2px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--ink-muted)",
              }}
            >
              Capped atomic path · Esc closes
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            ...btnPrimary,
            padding: dense ? "6px 12px" : "8px 14px",
            fontSize: dense ? 12 : 13,
          }}
        >
          {closeLabel}
        </button>
      </header>

      <div style={{ padding: dense ? "8px 10px 10px" : "12px 14px 16px" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: dense ? 8 : 12,
          }}
        >
          <LegendPill color="var(--ink)" label="Center · subject" />
          <LegendPill color="var(--signal)" label="Atomic same-tx" />
          {!dense ? (
            <LegendPill
              color="var(--ink-muted)"
              label="Prefer Attack timeline above"
            />
          ) : null}
        </div>

        <ProvenanceGraph
          address={address}
          evidence={evidence}
          height={graphH}
          showMiniMap={false}
        />

        {!dense ? (
          <>
            <p
              style={{
                margin: "12px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-muted)",
                lineHeight: 1.45,
              }}
            >
              Tip: the Attack timeline is the primary film view — this graph is a
              capped atomic path, not a full hairball.
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                ...btnGhost,
                marginTop: 10,
                padding: "8px 12px",
                fontSize: 12,
              }}
            >
              Close graph
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function LegendPill({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.04em",
        color: "var(--ink-muted)",
        padding: "3px 7px",
        border: "1px solid var(--line)",
        borderRadius: 2,
        background: "var(--bg-raise)",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
