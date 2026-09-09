"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { btnPrimary, fieldStyle, HOME_CHIPS, HonestyStrip } from "./AppShell";
import { fetchJson } from "../lib/fetchJson";

type StripCounts = {
  cases: number;
  graph: number;
  live: number;
  seeded: number;
};

export function HomeScreen({
  address,
  onAddress,
  onOpenCase,
  onOpenShield,
  memoryHits,
}: {
  address: string;
  onAddress: (a: string) => void;
  onOpenCase: (a?: string) => void;
  onOpenShield: (a?: string) => void;
  memoryHits: number;
}) {
  const [counts, setCounts] = useState<StripCounts | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const json = await fetchJson<{
          incidents?: Array<{ proof?: string }>;
        }>("/api/incidents");
        if (cancelled) return;
        const list = json.incidents ?? [];
        setCounts({
          cases: list.length,
          graph: list.filter((r) => r.proof === "graph").length,
          live: list.filter((r) => r.proof === "live").length,
          seeded: list.filter((r) => (r.proof ?? "provenance") === "provenance")
            .length,
        });
      } catch {
        if (!cancelled) setCounts(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function submit() {
    const a = address.trim();
    if (!a) return;
    onOpenCase(a);
  }

  return (
    <section className="rise" style={{ paddingTop: 12 }}>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "clamp(28px, 5vw, 42px)",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          maxWidth: 640,
        }}
      >
        Investigate once. Remember forever.
      </p>
      <p
        style={{
          margin: "12px 0 0",
          fontSize: 16,
          color: "var(--ink-muted)",
          maxWidth: 520,
          lineHeight: 1.5,
        }}
      >
        Verified onchain threats become named security memory any agent can check
        before it signs.
      </p>

      <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <input
          value={address}
          onChange={(e) => onAddress(e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          style={{ ...fieldStyle, maxWidth: 480 }}
          placeholder="Paste an address, ENS name or case ID"
          spellCheck={false}
          aria-label="Address"
        />
        <button type="button" onClick={submit} style={btnPrimary}>
          Open case
        </button>
        <button
          type="button"
          onClick={() => onOpenShield(address.trim() || undefined)}
          style={btnGhostSoft}
        >
          Memory check
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 16,
        }}
      >
        {HOME_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => {
              onAddress(chip.address);
              onOpenCase(chip.address);
            }}
            style={chipStyle}
          >
            {chip.plain}
          </button>
        ))}
      </div>

      <p
        style={{
          margin: "22px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--ink-muted)",
          lineHeight: 1.55,
        }}
      >
        {counts ? (
          <>
            Cases {counts.cases}
            {" · "}
            Graph-verified {counts.graph}
            {" · "}
            Live {counts.live}
            {" · "}
            Seeded {counts.seeded}
            {" · "}
            Memory hits (this browser) {memoryHits}
          </>
        ) : (
          <>Cases · Graph-verified · Memory hits loading…</>
        )}
        <br />
        Chains: Ethereum evidence → Sepolia memory (beta)
      </p>

      <HonestyStrip />
    </section>
  );
}

const chipStyle: CSSProperties = {
  padding: "8px 14px",
  border: "1px solid var(--line)",
  borderRadius: 2,
  background: "rgba(255,255,255,0.5)",
  color: "var(--ink)",
  fontFamily: "var(--font-body)",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

const btnGhostSoft: CSSProperties = {
  padding: "11px 18px",
  border: "1px solid var(--line)",
  borderRadius: 2,
  background: "transparent",
  color: "var(--ink)",
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};
