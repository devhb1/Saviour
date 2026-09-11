"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Badge, Button, EmptyState, Label, SkeletonBlock } from "../ui";
import { pushMeterEntry } from "./SessionMeter";

type FleetClass = {
  id: string;
  label: string;
  hint: string;
  count: number;
};

type CatalogRow = {
  id: string;
  address: string;
  status: string;
  class: string;
  label: string;
  proof: string;
  graphVerified?: boolean;
};

type RunRow = CatalogRow & {
  state: "idle" | "running" | "done" | "err";
  decision?: string;
  source?: string;
  latencyMs?: number;
  error?: string;
  memoryHit?: boolean;
};

/**
 * Fleet Run — pick a threat class, live-Shield N addresses.
 * Honest empties and never-name classes are the flex.
 */
export function FleetRun({
  onSelect,
  onOpenIdentity,
  limit = 5,
}: {
  onSelect?: (address: string) => void;
  onOpenIdentity?: (address: string) => void;
  limit?: number;
}) {
  const [classes, setClasses] = useState<FleetClass[]>([]);
  const [active, setActive] = useState<string>("flashloan");
  const [rows, setRows] = useState<RunRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/catalog");
        const json = (await res.json()) as {
          classes?: FleetClass[];
          note?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        if (cancelled) return;
        setClasses(json.classes ?? []);
        setNote(json.note ?? null);
        if (json.classes?.[0] && !json.classes.find((c) => c.id === active)) {
          setActive(json.classes[0].id);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Catalog failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  const loadClass = useCallback(
    async (classId: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/catalog?class=${encodeURIComponent(classId)}&limit=${limit}`,
        );
        const json = (await res.json()) as {
          rows?: CatalogRow[];
          note?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        setRows(
          (json.rows ?? []).map((r) => ({
            ...r,
            state: "idle" as const,
          })),
        );
        if (json.note) setNote(json.note);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed");
        setRows([]);
      } finally {
        setBusy(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    if (active) void loadClass(active);
  }, [active, loadClass]);

  async function runFleet() {
    if (!rows.length || busy) return;
    setBusy(true);
    setError(null);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      setRows((prev) =>
        prev.map((r, idx) =>
          idx === i ? { ...r, state: "running", error: undefined } : r,
        ),
      );
      try {
        const t0 = performance.now();
        const res = await fetch("/api/shield/check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chainId: 1,
            address: row.address,
            registryNetwork: "sepolia",
          }),
        });
        const json = (await res.json()) as {
          check?: {
            decision?: string;
            source?: string;
            latencyMs?: number;
          };
          memoryHit?: unknown;
          error?: string;
        };
        if (!res.ok || !json.check) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        const latencyMs =
          typeof json.check.latencyMs === "number"
            ? json.check.latencyMs
            : Math.round(performance.now() - t0);
        const memoryHit = Boolean(json.memoryHit);
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  state: "done",
                  decision: json.check!.decision,
                  source: json.check!.source,
                  latencyMs,
                  memoryHit,
                }
              : r,
          ),
        );
        pushMeterEntry({
          kind: "shield",
          label: `Fleet · ${json.check.decision} · ${row.address.slice(0, 10)}…`,
          usd: 0,
          ok: true,
        });
      } catch (e) {
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  state: "err",
                  error: e instanceof Error ? e.message : "failed",
                }
              : r,
          ),
        );
      }
      await sleep(80);
    }
    setBusy(false);
  }

  const done = rows.filter((r) => r.state === "done");
  const hits = done.filter((r) => r.memoryHit).length;
  const misses = done.length - hits;

  return (
    <aside style={wrap}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
        }}
      >
        <Label>FLEET RUN · LIVE</Label>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--tx-lo)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {rows.length} addresses
          {done.length
            ? ` · ${hits} memory hit · ${misses} miss`
            : ""}
        </span>
      </div>
      <p style={muted}>
        Every row is a live Shield call. Misses stay misses. We name two addresses
        because two are Graph-proven — not because the catalog is padded.
      </p>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {classes.map((c) => {
          const on = c.id === active;
          return (
            <button
              key={c.id}
              type="button"
              disabled={busy}
              onClick={() => setActive(c.id)}
              title={c.hint}
              style={{
                ...chip,
                borderColor: on ? "var(--sig)" : "var(--line)",
                color: on ? "var(--sig-hi)" : "var(--tx-lo)",
                background: on ? "var(--sig-wash)" : "var(--bg-high)",
                fontWeight: on ? 700 : 500,
              }}
            >
              {c.label} ({c.count})
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Button onClick={() => void runFleet()} disabled={busy || !rows.length}>
          {busy ? "Running…" : `Run ${rows.length} live →`}
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => void loadClass(active)}
        >
          Reload class
        </Button>
      </div>

      {error ? (
        <p role="alert" style={{ marginTop: 12, color: "var(--red)", fontSize: 13 }}>
          {error}
        </p>
      ) : null}
      {note ? (
        <p style={{ ...muted, marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 11 }}>
          {note}
        </p>
      ) : null}

      {!error && classes.length === 0 ? (
        <SkeletonBlock rows={4} />
      ) : null}

      {!error && classes.length > 0 && rows.length === 0 && !busy ? (
        <EmptyState title="NO ADDRESSES" style={{ marginTop: 16 }}>
          This class has no unique rows after de-dupe. Pick another category.
        </EmptyState>
      ) : null}

      <div style={{ marginTop: 16, overflowX: "auto" }}>
        {rows.length === 0 ? null : (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Address</th>
              <th style={th}>Catalog</th>
              <th style={th}>Memory</th>
              <th style={th}>Shield</th>
              <th style={th}>Cost</th>
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.address} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={td}>
                  <button
                    type="button"
                    onClick={() => onSelect?.(r.address)}
                    style={addrBtn}
                    title={r.label}
                  >
                    {r.address.slice(0, 10)}…{r.address.slice(-4)}
                  </button>
                  {r.graphVerified ? (
                    <Badge status="HIT" style={{ marginLeft: 6, fontSize: 9 }}>
                      GRAPH
                    </Badge>
                  ) : null}
                </td>
                <td style={{ ...td, color: "var(--tx-lo)" }}>
                  {r.status}
                  <span style={{ display: "block", fontSize: 10, color: "var(--tx-faint)" }}>
                    {r.class}
                  </span>
                </td>
                <td style={td}>
                  {r.state === "idle" ? (
                    <span style={{ color: "var(--tx-faint)" }}>—</span>
                  ) : r.state === "running" ? (
                    <span className="pending-pulse" style={{ color: "var(--sig-hi)" }}>
                      ●
                    </span>
                  ) : r.state === "err" ? (
                    <span style={{ color: "var(--red)" }}>err</span>
                  ) : r.memoryHit ? (
                    <span style={{ color: "var(--green)" }}>● hit</span>
                  ) : (
                    <span style={{ color: "var(--amber)" }}>○ miss</span>
                  )}
                </td>
                <td style={td}>
                  {r.decision ? (
                    <Badge status={r.decision}>{r.decision}</Badge>
                  ) : r.error ? (
                    <span style={{ color: "var(--red)", fontSize: 11 }}>{r.error}</span>
                  ) : (
                    <span style={{ color: "var(--tx-faint)" }}>—</span>
                  )}
                  {r.source ? (
                    <span
                      style={{
                        display: "block",
                        marginTop: 4,
                        fontSize: 10,
                        color: "var(--tx-faint)",
                      }}
                    >
                      {r.source}
                      {r.latencyMs != null ? ` · ${r.latencyMs}ms` : ""}
                    </span>
                  ) : null}
                </td>
                <td
                  style={{
                    ...td,
                    color: "var(--green)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {r.state === "done" ? "$0" : "—"}
                </td>
                <td style={td}>
                  {onOpenIdentity ? (
                    <button
                      type="button"
                      onClick={() => onOpenIdentity(r.address)}
                      style={linkBtn}
                    >
                      Identity
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </aside>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const wrap: CSSProperties = {
  marginTop: 22,
  padding: "16px 16px",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-raise)",
  boxShadow: "var(--edge)",
};

const muted: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 13,
  color: "var(--tx-lo)",
  lineHeight: 1.45,
  maxWidth: 640,
};

const chip: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.03em",
  padding: "6px 10px",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-pill)",
  cursor: "pointer",
};

const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
};

const th: CSSProperties = {
  textAlign: "left",
  padding: "8px 8px",
  color: "var(--tx-faint)",
  fontWeight: 500,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const td: CSSProperties = {
  padding: "10px 8px",
  verticalAlign: "top",
  color: "var(--tx)",
};

const addrBtn: CSSProperties = {
  border: "none",
  background: "none",
  padding: 0,
  color: "var(--sig-hi)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "inherit",
};

const linkBtn: CSSProperties = {
  border: "none",
  background: "none",
  padding: 0,
  color: "var(--sig)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 11,
  textDecoration: "underline",
  textUnderlineOffset: 2,
};
