"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { btnGhost, btnPrimary } from "./AppShell";
import { writeHeaders } from "../lib/writeGuard";
import { fetchJson } from "../lib/fetchJson";
import { EnsPassport } from "./EnsPassport";
import { ErrorBanner } from "./ErrorBanner";
import { TourNextCta } from "./TourNextCta";
import {
  BOT_1_ADDRESS,
  isDemoHero,
  safeGovernTarget,
} from "./demoTargets";
import { EacRoleBenches } from "./EacRoleBenches";

type Incident = {
  id: string;
  address: string;
  label: string;
  source_url: string;
  expectedStatus: string;
  ensName: string;
  ensStatus: string;
  registryStatus: string | null;
  expiryHint: string;
  registered: boolean;
  origin?: "seed" | "live";
  proof?: "graph" | "provenance" | "live";
  proofLabel?: string;
  rulePath?: string | null;
  ensNameCanonical?: boolean;
};

type EacProbe = {
  reverted?: boolean;
  expectedRevert?: boolean;
  message?: string;
  error?: string;
  warning?: string;
};

function ProofBadge({ row }: { row: Incident }) {
  const proof = row.proof ?? "provenance";
  const label =
    row.proofLabel ??
    (proof === "graph"
      ? "Graph-verified"
      : proof === "live"
        ? "Live · Remember"
        : "Provenance-seeded");
  const graph = proof === "graph";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: graph ? 700 : 500,
        letterSpacing: "0.04em",
        color: graph
          ? "var(--paper, #fff)"
          : proof === "live"
            ? "var(--warn)"
            : "var(--tx-lo)",
        background: graph
          ? "var(--signal)"
          : proof === "live"
            ? "color-mix(in srgb, var(--warn) 12%, var(--bg-raise))"
            : "var(--bg-high)",
        border: graph
          ? "1px solid var(--signal)"
          : `1px solid ${proof === "live" ? "var(--amber-line, var(--warn))" : "var(--line-mid)"}`,
      }}
    >
      {label}
    </span>
  );
}

function StatusStamp({ status }: { status: string }) {
  const st = (status || "—").toUpperCase();
  const tainted = st === "TAINTED";
  const watch = st === "WATCH";
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.06em",
        padding: "4px 9px",
        borderRadius: 2,
        border: `1px solid ${
          tainted ? "var(--block)" : watch ? "var(--warn)" : "var(--line)"
        }`,
        color: tainted ? "var(--block)" : watch ? "var(--warn)" : "var(--tx-lo)",
        background: tainted
          ? "color-mix(in srgb, var(--block) 12%, var(--bg-raise))"
          : watch
            ? "color-mix(in srgb, var(--warn) 12%, var(--bg-raise))"
            : "var(--bg-high)",
      }}
    >
      {st}
    </span>
  );
}

function IncidentCardList({
  rows,
  selected,
  busy,
  loading,
  emptyLabel,
  onSelect,
  onDispute,
  onRevoke,
}: {
  rows: Incident[];
  selected: string | null;
  busy: string | null;
  loading?: boolean;
  emptyLabel?: string;
  onSelect: (address: string) => void;
  onDispute: (address: string) => void;
  onRevoke: (address: string) => void;
}) {
  if (loading) {
    return (
      <div
        aria-busy="true"
        style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="skeleton"
            style={{ height: 72, borderRadius: "var(--radius-md)", opacity: 0.85 }}
          />
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <p style={{ color: "var(--tx-lo)", fontSize: 13, margin: "8px 0 0" }}>
        {emptyLabel ?? "0 rows in this filter."}
      </p>
    );
  }

  return (
    <ul
      style={{
        listStyle: "none",
        margin: "10px 0 0",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {rows.map((row) => {
        const active = selected === row.address;
        const status = row.ensStatus || row.registryStatus || row.expectedStatus || "—";
        const ensShort =
          row.ensName && row.ensName.length > 42
            ? `${row.ensName.slice(0, 10)}…${row.ensName.slice(-18)}`
            : row.ensName;
        return (
          <li key={row.id}>
            <article
              role="button"
              tabIndex={0}
              aria-pressed={active}
              onClick={() => onSelect(row.address)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(row.address);
                }
              }}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: "10px 16px",
                alignItems: "start",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${active ? "var(--sig-line)" : "var(--line-mid)"}`,
                background: active
                  ? "color-mix(in srgb, var(--sig) 8%, var(--bg-raise))"
                  : "var(--bg-raise)",
                boxShadow: "var(--edge), var(--lift)",
                cursor: "pointer",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <code
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--tx-hi)",
                    }}
                  >
                    {row.id}
                  </code>
                  <ProofBadge row={row} />
                  <StatusStamp status={status} />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--tx-faint)",
                    }}
                  >
                    {row.expiryHint}
                  </span>
                </div>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 13,
                    color: "var(--tx)",
                    lineHeight: 1.4,
                  }}
                >
                  {row.label}
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--tx-lo)",
                    wordBreak: "break-all",
                    lineHeight: 1.35,
                  }}
                >
                  {ensShort || row.address}
                  {row.rulePath ? (
                    <span style={{ color: "var(--sig)", marginLeft: 8 }}>
                      · {row.rulePath}
                    </span>
                  ) : null}
                </p>
                {row.source_url?.startsWith("http") ? (
                  <a
                    href={row.source_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: "inline-block",
                      marginTop: 6,
                      fontSize: 11,
                      color: "var(--sig)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    source ↗
                  </a>
                ) : null}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  alignItems: "stretch",
                }}
              >
                <button
                  type="button"
                  disabled={busy !== null || !row.registered}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDispute(row.address);
                  }}
                  style={{ ...btnGhost, padding: "6px 10px", fontSize: 12, background: "var(--bg-high)" }}
                >
                  Dispute
                </button>
                <button
                  type="button"
                  disabled={busy !== null || !row.registered}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRevoke(row.address);
                  }}
                  style={{ ...btnGhost, padding: "6px 10px", fontSize: 12, background: "var(--bg-high)" }}
                >
                  Revoke
                </button>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

export function GovernScreen({
  onSelectAddress,
  onOpenBuild,
  onOpenLive,
  onOpenDocs,
}: {
  onSelectAddress: (address: string) => void;
  onOpenBuild?: () => void;
  onOpenLive?: () => void;
  onOpenDocs?: () => void;
}) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [namedCount, setNamedCount] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [eac, setEac] = useState<EacProbe | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [bucket, setBucket] = useState<"all" | "graph" | "live" | "seed">("graph");
  const loadingList = busy === "list" && namedCount == null;

  const { graphVerified, liveRemember, provenanceSeeded } = useMemo(() => {
    const graph: Incident[] = [];
    const live: Incident[] = [];
    const seed: Incident[] = [];
    for (const row of incidents) {
      const proof = row.proof ?? "provenance";
      if (proof === "graph") graph.push(row);
      else if (proof === "live") live.push(row);
      else seed.push(row);
    }
    return {
      graphVerified: graph,
      liveRemember: live,
      provenanceSeeded: seed,
    };
  }, [incidents]);

  const load = useCallback(async () => {
    setBusy("list");
    setListError(null);
    try {
      const json = await fetchJson<{
        incidents?: Incident[];
        named?: number;
        count?: number;
        error?: string;
      }>("/api/incidents", { timeoutMs: 45_000 });
      startTransition(() => {
        const list = json.incidents ?? [];
        setIncidents(list);
        setNamedCount(
          typeof json.named === "number"
            ? json.named
            : list.filter((r) => r.registered).length,
        );
        if (!selected && list[0]) {
          const prefer =
            list.find((r) => (r.proof ?? "provenance") === "graph") ?? list[0];
          setSelected(prefer.address);
        }
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load incidents";
      setListError(msg);
      // Keep last good rows if we have them — don't wipe the ledger on a 429.
      setNamedCount((n) => (n == null ? 0 : n));
    } finally {
      setBusy(null);
    }
  }, [selected]);

  useEffect(() => {
    void load();
  }, [load]);

  function selectRow(address: string) {
    setSelected(address);
    onSelectAddress(address);
  }

  async function dispute(address: string) {
    const target = safeGovernTarget(address);
    setBusy(`dispute:${target}`);
    setError(null);
    setNote(null);
    try {
      const json = await fetchJson<{
        error?: string;
        dispute?: { status: string; renewSkipped?: string | null };
        honesty?: { expiryNote?: string; shieldExpect?: string };
      }>("/api/govern/dispute", {
        method: "POST",
        headers: writeHeaders(),
        body: JSON.stringify({
          address: target,
          reason: "Govern UI dispute",
        }),
        timeoutMs: 45_000,
      });
      const parts = [
        isDemoHero(address)
          ? `Hero locked — disputed BOT-1 → ENS ${json.dispute?.status ?? "WATCH"}`
          : `Disputed → ENS ${json.dispute?.status ?? "WATCH"}`,
        json.honesty?.expiryNote,
        json.honesty?.shieldExpect,
      ].filter(Boolean);
      setNote(parts.join(" · "));
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Dispute failed";
      if (/writes disabled|allow_writes|read-only|401/i.test(msg)) {
        setError(
          "Writes locked on public host — see film or run `pnpm dev` locally",
        );
      } else if (/429|rate.?limit/i.test(msg)) {
        setError("Sepolia RPC rate-limited — wait ~10s and retry once");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(null);
    }
  }

  async function revoke(address: string) {
    const target = safeGovernTarget(address);
    setBusy(`revoke:${target}`);
    setError(null);
    setNote(null);
    try {
      const json = await fetchJson<{
        error?: string;
        honesty?: { ens?: string; registry?: string; shieldExpect?: string };
      }>("/api/govern/revoke", {
        method: "POST",
        headers: writeHeaders(),
        body: JSON.stringify({ address: target, note: "Govern UI revoke" }),
        timeoutMs: 60_000,
      });
      const parts = [
        isDemoHero(address)
          ? "Hero locked — revoked BOT-1 ENS name"
          : "Revoked ENS name",
        json.honesty?.ens,
        json.honesty?.registry,
        json.honesty?.shieldExpect,
      ].filter(Boolean);
      setNote(parts.join(" · "));
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Revoke failed";
      if (/writes disabled|allow_writes|read-only|401/i.test(msg)) {
        setError(
          "Writes locked on public host — see film or run `pnpm dev` locally",
        );
      } else if (/429|rate.?limit/i.test(msg)) {
        setError("Sepolia RPC rate-limited — wait ~10s and retry once");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(null);
    }
  }

  async function eacProbe(address: string) {
    const target = isDemoHero(address) ? BOT_1_ADDRESS : address.trim().toLowerCase();
    setBusy("eac");
    setError(null);
    setEac(null);
    try {
      const json = await fetchJson<EacProbe & { error?: string }>(
        "/api/govern/eac-probe",
        {
          method: "POST",
          headers: writeHeaders(),
          body: JSON.stringify({ address: target }),
          timeoutMs: 45_000,
        },
      );
      startTransition(() => setEac(json));
    } catch (e) {
      // EAC probe may return 4xx with reverted:true body — fetchJson throws.
      // Fall back to raw text only when we still need the revert proof UI.
      try {
        const res = await fetch("/api/govern/eac-probe", {
          method: "POST",
          headers: writeHeaders(),
          body: JSON.stringify({ address: target }),
        });
        const json = (await res.json()) as EacProbe & { error?: string };
        if (json.reverted) {
          startTransition(() => setEac(json));
          return;
        }
      } catch {
        // ignore secondary parse
      }
      const msg = e instanceof Error ? e.message : "EAC probe failed";
      if (/writes disabled|allow_writes|read-only|401/i.test(msg)) {
        setError(
          "Writes locked on public host — see film or run `pnpm dev` locally",
        );
      } else {
        setError(msg);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rise" style={{ maxWidth: 960 }}>
      {/* Hero metrics — one sell composition */}
      <div
        style={{
          marginBottom: 12,
          padding: "12px 14px",
          border: "1px solid var(--sig-line)",
          borderRadius: "var(--radius-md)",
          background: "var(--bg-raise)",
          boxShadow: "var(--edge), var(--lift)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            color: "var(--sig)",
            textTransform: "uppercase",
          }}
        >
          Public ledger · WATCH / TAINTED only
        </p>
        <div
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 8,
          }}
        >
          {(
            [
              {
                k: "Named",
                v: namedCount == null ? "··" : String(namedCount),
                h: "ENS WATCH · TAINTED",
              },
              {
                k: "Graph-verified",
                v: loadingList ? "··" : String(graphVerified.length),
                h: "proof:graph only",
                accent: true,
              },
              {
                k: "Never laundered",
                v: "0",
                h: "seeds ≠ detections",
              },
            ] as const
          ).map((m) => (
            <div
              key={m.k}
              style={{
                padding: "12px 14px",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${"accent" in m && m.accent ? "var(--sig-line)" : "var(--line-mid)"}`,
                background:
                  "accent" in m && m.accent
                    ? "color-mix(in srgb, var(--sig) 8%, var(--bg-high))"
                    : "var(--bg-high)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  color: "var(--tx-lo)",
                  textTransform: "uppercase",
                }}
              >
                {m.k}
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(22px, 3vw, 28px)",
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                  color: "accent" in m && m.accent ? "var(--sig)" : "var(--tx-hi)",
                  lineHeight: 1,
                }}
              >
                {m.v}
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 11,
                  color: "var(--tx-faint)",
                  lineHeight: 1.3,
                }}
              >
                {m.h}
              </p>
            </div>
          ))}
        </div>
        <p
          style={{
            margin: "12px 0 0",
            fontSize: 13,
            color: "var(--tx-lo)",
            lineHeight: 1.45,
            maxWidth: 640,
          }}
        >
          Named ≠ Graph-verified. SAFE never appears. Camera path: lead with
          Graph passports — Live·Remember and seeds stay honest buckets.
        </p>
      </div>

      {/* Toolbar: filters + actions */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div
          role="tablist"
          aria-label="Memory provenance filter"
          style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
        >
          {(
            [
              {
                id: "all" as const,
                label: loadingList ? "All …" : `All ${incidents.length}`,
              },
              {
                id: "graph" as const,
                label: loadingList
                  ? "Graph …"
                  : `Graph ${graphVerified.length}`,
              },
              {
                id: "live" as const,
                label: loadingList
                  ? "Live …"
                  : `Live ${liveRemember.length}`,
              },
              {
                id: "seed" as const,
                label: loadingList
                  ? "Seeded …"
                  : `Seeded ${provenanceSeeded.length}`,
              },
            ] as const
          ).map((f) => {
            const on = bucket === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setBucket(f.id)}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  padding: "7px 12px",
                  border: `1px solid ${on ? "var(--sig)" : "var(--line-mid)"}`,
                  borderRadius: "var(--radius-chip)",
                  background: on ? "var(--sig-wash)" : "var(--bg-raise)",
                  color: on ? "var(--sig-hi)" : "var(--tx-lo)",
                  fontWeight: on ? 700 : 500,
                  cursor: "pointer",
                  boxShadow: on ? "var(--edge)" : undefined,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void load()}
            style={{ ...btnGhost, background: "var(--bg-raise)" }}
          >
            {busy === "list" ? "Refreshing…" : "Refresh"}
          </button>
          {selected ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void eacProbe(selected)}
              style={btnPrimary}
            >
              {busy === "eac" ? "Probing…" : "Prove EAC revert"}
            </button>
          ) : null}
        </div>
      </div>

      <div
        style={{
          marginBottom: 14,
          padding: "12px 12px 10px",
          border: "1px solid color-mix(in srgb, var(--sig) 28%, var(--line-mid))",
          borderRadius: "var(--radius-md)",
          background:
            "linear-gradient(165deg, color-mix(in srgb, var(--sig) 7%, var(--bg-raise)), var(--bg-raise))",
          boxShadow: "var(--edge)",
        }}
      >
        <EacRoleBenches compact probeAddress={selected || BOT_1_ADDRESS} />
      </div>

      {loadingList ? (
        <div
          aria-busy="true"
          aria-label="Loading registry"
          style={{
            marginBottom: 22,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                height: 120,
                borderRadius: "var(--radius-md)",
                opacity: 0.9 - i * 0.15,
              }}
            />
          ))}
        </div>
      ) : null}

      {eac ? (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            border: `1px solid ${eac.reverted ? "var(--green-line, var(--signal))" : "var(--amber-line, var(--warn))"}`,
            borderRadius: "var(--radius-md)",
            background: eac.reverted
              ? "color-mix(in srgb, var(--green) 8%, var(--bg-raise))"
              : "color-mix(in srgb, var(--warn) 8%, var(--bg-raise))",
            boxShadow: "var(--edge)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 600,
              color: eac.reverted ? "var(--green)" : "var(--warn)",
            }}
          >
            {eac.reverted
              ? "EAC revert · permission model holds"
              : eac.warning ?? "Unexpected allow"}
          </p>
          {eac.reverted ? (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--tx-lo)" }}>
              Investigator cannot write <code>saviours.dispute</code> — role caps
              on-chain.
            </p>
          ) : null}
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: "var(--tx-faint)",
              wordBreak: "break-all",
            }}
          >
            {eac.message ?? eac.error}
          </p>
        </div>
      ) : null}

      {listError ? (
        <div style={{ marginBottom: 14 }}>
          <ErrorBanner title="Registry list delayed" detail={listError}>
            <p style={{ margin: 0, color: "var(--tx-lo)" }}>
              Sepolia reads are paced now. Wait a few seconds, then Refresh —
              this is not a failed write.
            </p>
          </ErrorBanner>
        </div>
      ) : null}
      {error ? (
        <div style={{ marginBottom: 14 }}>
          <ErrorBanner title="Registry action failed" detail={error} />
        </div>
      ) : null}
      {note ? (
        <p
          style={{
            margin: "0 0 14px",
            color: "var(--sig)",
            fontSize: 14,
            lineHeight: 1.45,
          }}
        >
          {note}
        </p>
      ) : null}

      {/* Featured Graph gallery — the sell */}
      {graphVerified.length > 0 && (bucket === "all" || bucket === "graph") ? (
        <section style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 8,
              alignItems: "baseline",
              marginBottom: 12,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  color: "var(--sig)",
                }}
              >
                GRAPH-VERIFIED · EVIDENCE GALLERY
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 13,
                  color: "var(--tx-lo)",
                  lineHeight: 1.4,
                  maxWidth: 520,
                }}
              >
                Live Messari fan-out → signals → named. Lead with these on camera.
              </p>
            </div>
            {onOpenLive ? (
              <button type="button" onClick={onOpenLive} style={btnGhost}>
                Grow memory · Loop →
              </button>
            ) : null}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            {graphVerified.map((row) => {
              const active = selected === row.address;
              return (
                <div
                  key={row.id}
                  role="group"
                  style={{
                    borderRadius: "var(--radius-md)",
                    border: `1px solid ${active ? "var(--sig)" : "var(--sig-line)"}`,
                    background: "var(--bg-raise)",
                    boxShadow: active
                      ? "var(--glow-sig)"
                      : "var(--edge), var(--lift)",
                    overflow: "hidden",
                  }}
                >
                  <EnsPassport
                    ensName={row.ensName}
                    status={row.ensStatus || row.expectedStatus}
                    threat={row.rulePath}
                    address={row.address}
                    compact
                    onOpenIdentity={() => selectRow(row.address)}
                  />
                  <div
                    style={{
                      padding: "10px 14px 12px",
                      borderTop: "1px solid var(--line-mid)",
                      background: "var(--bg-high)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--tx-hi)",
                      }}
                    >
                      {row.id}
                    </p>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: 12,
                        color: "var(--tx-lo)",
                        lineHeight: 1.35,
                      }}
                    >
                      {row.label}
                    </p>
                    <button
                      type="button"
                      onClick={() => selectRow(row.address)}
                      style={{
                        marginTop: 8,
                        padding: 0,
                        border: "none",
                        background: "none",
                        color: "var(--sig)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      {active ? "Selected · open identity →" : "Select →"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Bucket ledger — Graph sells via gallery; Live/Seed stay honest & quiet */}

      {(bucket === "live" ||
        (bucket === "all" && liveRemember.length > 0)) &&
      liveRemember.length > 0 ? (
        <details
          open={bucket === "live"}
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            border: "1px solid var(--amber-line, color-mix(in srgb, var(--warn) 40%, var(--line)))",
            borderRadius: "var(--radius-md)",
            background: "color-mix(in srgb, var(--warn) 6%, var(--bg-raise))",
            boxShadow: "var(--edge)",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 600,
              color: "var(--warn)",
              listStyle: "none",
            }}
          >
            Live · Remember · {liveRemember.length}
            <span
              style={{
                marginLeft: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--tx-lo)",
              }}
            >
              not Graph-verified
            </span>
          </summary>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12,
              color: "var(--tx-lo)",
              lineHeight: 1.45,
              maxWidth: 560,
            }}
          >
            Named via investigate / Remember. Do not count as Graph detections.
          </p>
          <IncidentCardList
            rows={liveRemember}
            selected={selected}
            busy={busy}
            onSelect={selectRow}
            onDispute={(a) => void dispute(a)}
            onRevoke={(a) => void revoke(a)}
          />
        </details>
      ) : null}

      {(bucket === "seed" ||
        (bucket === "all" && provenanceSeeded.length > 0)) &&
      provenanceSeeded.length > 0 ? (
        <details
          open={bucket === "seed"}
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            border: "1px solid var(--line-mid)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-raise)",
            boxShadow: "var(--edge)",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 600,
              color: "var(--tx)",
              listStyle: "none",
            }}
          >
            Provenance-seeded · {provenanceSeeded.length}
            <span
              style={{
                marginLeft: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--tx-faint)",
              }}
            >
              not live Graph
            </span>
          </summary>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12,
              color: "var(--tx-lo)",
              lineHeight: 1.45,
              maxWidth: 560,
            }}
          >
            Post-mortems / known incidents for Govern + Resolve — not “detected
            today.”
          </p>
          <IncidentCardList
            rows={provenanceSeeded}
            selected={selected}
            busy={busy}
            onSelect={selectRow}
            onDispute={(a) => void dispute(a)}
            onRevoke={(a) => void revoke(a)}
          />
        </details>
      ) : null}

      {bucket === "graph" && graphVerified.length === 0 && !loadingList ? (
        <p style={{ color: "var(--tx-lo)", fontSize: 13 }}>
          0 Graph-verified rows (proof:graph only — we do not launder).
        </p>
      ) : null}

      {/* When filtering graph only, still allow dispute/revoke via compact list */}
      {bucket === "graph" && graphVerified.length > 0 ? (
        <details
          style={{
            marginBottom: 16,
            padding: "10px 12px",
            border: "1px solid var(--line-mid)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-raise)",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--tx-lo)",
              listStyle: "none",
            }}
          >
            Dispute / revoke controls ▸
          </summary>
          <IncidentCardList
            rows={graphVerified}
            selected={selected}
            busy={busy}
            onSelect={selectRow}
            onDispute={(a) => void dispute(a)}
            onRevoke={(a) => void revoke(a)}
          />
        </details>
      ) : null}

      {incidents.length === 0 && !loadingList && busy !== "list" ? (
        <p style={{ color: "var(--tx-lo)", marginTop: 16 }}>
          No seeded incidents — run <code>pnpm seed:incidents</code>
        </p>
      ) : null}

      {onOpenDocs ? (
        <TourNextCta
          label="Next · Docs →"
          hint="Why we exist · under the hood · stack depth"
          onNext={onOpenDocs}
        />
      ) : onOpenBuild ? (
        <TourNextCta
          label="Next · Build / Bazantic →"
          hint="Recipe · paid tx · MCP · roadmap for thousands of agents"
          onNext={onOpenBuild}
        />
      ) : null}
    </section>
  );
}
