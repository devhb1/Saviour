"use client";

import { useEffect, useState, type CSSProperties } from "react";

const KEYS = [
  "saviours.status",
  "saviours.threat",
  "saviours.evidenceHash",
  "saviours.plainVerdict",
  "saviours.registry",
  "saviours.network",
] as const;

export type EnsWriteRevealProps = {
  ensName: string;
  /** When remember/persist is in flight */
  pending?: boolean;
  /** Live records after resolve (key → value) */
  records?: Record<string, string>;
  /** Compact strip under Case verdict */
  compact?: boolean;
};

/**
 * Non-blocking checklist when a finding is named on `<address>.saviours.eth`.
 * ENS stores the finding; it does not decide it.
 */
export function EnsWriteReveal({
  ensName,
  pending = false,
  records = {},
  compact = false,
}: EnsWriteRevealProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!pending) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 800);
    return () => window.clearInterval(id);
  }, [pending]);

  const done = KEYS.filter((k) => Boolean(records[k]?.trim()));
  const allDone = done.length === KEYS.length && !pending;

  return (
    <aside
      style={{
        marginTop: compact ? 10 : 16,
        padding: compact ? "12px 14px" : "16px 18px",
        border: "1px solid var(--line)",
        borderRadius: 4,
        background: "var(--surface)",
      }}
      aria-live="polite"
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
        }}
      >
        // ENS WRITE · {ensName || "….saviours.eth"}
      </div>
      <p
        style={{
          margin: "8px 0 0",
          fontSize: 13,
          color: "var(--ink)",
          lineHeight: 1.45,
        }}
      >
        {pending
          ? "Writing to ENS — up to a minute. Safe to leave."
          : allDone
            ? "Resolvable forever — any cast client, no our server."
            : "Records land on Sepolia ENSv2 under the address label."}
        {pending ? (
          <span style={{ color: "var(--ink-muted)" }}>
            {" "}
            {["·", "··", "···"][tick % 3]}
          </span>
        ) : null}
      </p>
      <ul
        style={{
          listStyle: "none",
          margin: "12px 0 0",
          padding: 0,
          display: "grid",
          gap: 6,
        }}
      >
        {KEYS.map((k) => {
          const ok = Boolean(records[k]?.trim());
          return (
            <li key={k} style={row}>
              <span
                aria-hidden
                style={{
                  width: 14,
                  color: ok ? "var(--signal)" : "var(--ink-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {ok ? "✓" : pending ? "…" : "○"}
              </span>
              <code style={{ fontSize: 11 }}>{k}</code>
              {ok ? (
                <span
                  style={{
                    marginLeft: "auto",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--ink-muted)",
                    maxWidth: 180,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {records[k]}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p
        style={{
          margin: "12px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-muted)",
          lineHeight: 1.45,
        }}
      >
        Namehash of <code>{ensName || "<address>.saviours.eth"}</code> · status
        stored as text — ENS does not decide the verdict.
      </p>
    </aside>
  );
}

const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--ink)",
};
