"use client";

/**
 * Thin Phase-2 placeholders so the new nav ships without broken routes.
 * Full Loop / Playground land in ENDGAME Phase 2.
 */
export function ComingSoonScreen({
  title,
  body,
  onBack,
}: {
  title: string;
  body: string;
  onBack?: () => void;
}) {
  return (
    <section className="app-content rise" style={{ padding: "48px 0" }}>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: "var(--t-floor)",
          letterSpacing: "0.1em",
          color: "var(--sig)",
        }}
      >
        ENDGAME · PHASE 2
      </p>
      <h1
        style={{
          margin: "12px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: "var(--t-display)",
          fontWeight: 600,
          letterSpacing: "-0.03em",
          color: "var(--tx-hi)",
        }}
      >
        {title}
      </h1>
      <p
        style={{
          margin: "14px 0 0",
          maxWidth: 520,
          fontSize: "var(--t-body)",
          lineHeight: 1.55,
          color: "var(--tx-lo)",
        }}
      >
        {body}
      </p>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          style={{
            marginTop: 24,
            padding: "11px 18px",
            border: "1px solid var(--line-mid)",
            borderRadius: "var(--radius-chip)",
            background: "var(--bg-high)",
            color: "var(--tx)",
            fontFamily: "var(--font-body)",
            fontWeight: 500,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          ← Back to Hook
        </button>
      ) : null}
    </section>
  );
}
