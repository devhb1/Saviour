"use client";

/**
 * Honest detection-depth frame: three verified rule paths on one pattern family —
 * not a populated threat catalog.
 */
export function VerifiedRulePathsStrip() {
  return (
    <div
      style={{
        margin: "0 0 14px",
        padding: "12px 14px",
        border: "1px dashed var(--line)",
        borderRadius: 4,
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.06em",
          color: "var(--ink-muted)",
        }}
      >
        Verified rule paths · not a fat registry
      </p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginTop: 8,
        }}
      >
        {[
          {
            id: "ONE_SHOT∧ATOMIC",
            tip: "ATTACK-1 · FLASHLOAN_ONE_SHOT ∧ ATOMIC_MULTI_PROTOCOL → TAINTED",
          },
          {
            id: "BOT_PROFILE→WATCH",
            tip: "BOT-1 · same fan-out · WATCH not TAINTED",
          },
          {
            id: "REGISTRY_COOCCURRENCE",
            tip: "Live Graph edge to named TAINTED peer → TAINTED (propagation, not a second exploit class)",
          },
        ].map((c) => (
          <span
            key={c.id}
            title={c.tip}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              padding: "4px 8px",
              border: "1px solid var(--signal)",
              color: "var(--signal)",
              borderRadius: 4,
            }}
          >
            {c.id}
          </span>
        ))}
      </div>
      <p
        style={{
          margin: "8px 0 0",
          fontSize: 12,
          color: "var(--ink-muted)",
          lineHeight: 1.45,
        }}
      >
        Three rule paths on one pattern family — not a catalog of discovered
        threats. Do not hero a DEX router as the propagation identity.
      </p>
    </div>
  );
}
