"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Label } from "../ui";

export type MeterEntry = {
  id: string;
  t: number;
  kind: "shield" | "investigate" | "pay";
  label: string;
  usd: number;
  ok?: boolean;
  href?: string;
};

const KEY = "saviours.sessionMeter.v1";

function load(): MeterEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MeterEntry[];
  } catch {
    return [];
  }
}

function save(entries: MeterEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-40)));
  } catch {
    // ignore
  }
}

/** Append a meter line (call from shield / pay panels). */
export function pushMeterEntry(entry: Omit<MeterEntry, "id" | "t">) {
  const next: MeterEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    t: Date.now(),
  };
  const list = [...load(), next];
  save(list);
  window.dispatchEvent(new CustomEvent("saviours:meter", { detail: next }));
  return next;
}

/**
 * Session meter tape — free hits vs paid miss. Pricing law made visible.
 */
export function SessionMeter() {
  const [entries, setEntries] = useState<MeterEntry[]>([]);

  useEffect(() => {
    setEntries(load());
    const on = () => setEntries(load());
    window.addEventListener("saviours:meter", on);
    return () => window.removeEventListener("saviours:meter", on);
  }, []);

  const paid = entries.reduce((s, e) => s + (e.usd || 0), 0);
  const free = entries.filter((e) => e.usd === 0).length;

  return (
    <aside style={wrap}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "center",
        }}
      >
        <Label>SESSION METER</Label>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--tx-lo)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {entries.length} calls · {free} free · ${paid.toFixed(2)} paid
        </span>
      </div>
      {entries.length === 0 ? (
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--tx-faint)" }}>
          Shield / pay actions this session appear here. MEMORY HIT stays $0.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "grid", gap: 6 }}>
          {[...entries].reverse().slice(0, 12).map((e) => (
            <li
              key={e.id}
              style={{
                display: "grid",
                gridTemplateColumns: "72px 1fr auto",
                gap: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: e.usd > 0 ? "var(--violet)" : "var(--green)",
              }}
            >
              <span style={{ color: "var(--tx-faint)" }}>{e.kind}</span>
              <span style={{ color: "var(--tx)", overflow: "hidden", textOverflow: "ellipsis" }}>
                {e.href ? (
                  <a href={e.href} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
                    {e.label}
                  </a>
                ) : (
                  e.label
                )}
              </span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {e.usd > 0 ? `$${e.usd.toFixed(2)}` : "$0.00"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

const wrap: CSSProperties = {
  marginTop: 16,
  padding: "12px 14px",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-inset)",
};
