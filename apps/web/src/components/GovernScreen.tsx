"use client";

import { startTransition, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { btnGhost, btnPrimary } from "./AppShell";
import { writeHeaders } from "../lib/writeGuard";
import { fetchJson } from "../lib/fetchJson";
import { AddressDisplay } from "./AddressDisplay";
import { EnsPassport } from "./EnsPassport";
import { ErrorBanner } from "./ErrorBanner";
import { TourNextCta } from "./TourNextCta";

const ROLES_LIVE = [
  {
    role: "Relayer",
    address: "0x679997b836Cf84D32d7f68C1c662546E797f15FA",
    scope: "root / register / renew / unregister",
  },
  {
    role: "Investigator",
    address: "0xc8A19951234d6f59f08E7EcB65506Ef34f5bf27d",
    scope: "verdict texts · cannot write dispute",
    ens: "investigator-01.saviours.eth",
  },
  {
    role: "Disputer",
    address: "0xc26ADf0053C876047d2CbF5CC38a01312b410e7C",
    scope: "status + dispute only",
  },
] as const;

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

function IncidentPeek({ row }: { row: Incident }) {
  return (
    <div
      className="incident-peek"
      style={{
        marginTop: 8,
        padding: "8px 10px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid color-mix(in srgb, var(--line) 80%, transparent)",
        background: "var(--surface)",
        opacity: 0.55,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--ink-muted)",
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "baseline",
      }}
      aria-hidden
    >
      <span style={{ color: "var(--ink)" }}>{row.id}</span>
      <span>{row.ensStatus || row.expectedStatus}</span>
      <span style={{ wordBreak: "break-all" }}>{row.label}</span>
      <span style={{ marginLeft: "auto", letterSpacing: "0.06em" }}>PEEK · expand</span>
    </div>
  );
}

function IncidentTable({
  rows,
  selected,
  busy,
  muted,
  loading,
  emptyLabel,
  onSelect,
  onDispute,
  onRevoke,
}: {
  rows: Incident[];
  selected: string | null;
  busy: string | null;
  muted?: boolean;
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
        {[0, 1].map((i) => (
          <div
            key={i}
            className="skeleton"
            style={{ height: 40, borderRadius: "var(--radius-md)", opacity: 0.85 }}
          />
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <p style={{ color: "var(--ink-muted)", fontSize: 13, margin: "8px 0 0" }}>
        {emptyLabel ?? "0 rows in this filter (loaded — not a flash of empty)."}
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto", opacity: muted ? 0.72 : 1 }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: muted ? 12 : 13,
          minWidth: 820,
        }}
      >
        <thead>
          <tr style={{ color: "var(--ink-muted)", textAlign: "left" }}>
            <th style={th}>id</th>
            <th style={th}>status</th>
            <th style={th}>expiry</th>
            <th style={th}>label</th>
            <th style={th}>actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const active = selected === row.address;
            return (
              <tr
                key={row.id}
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
                  cursor: "pointer",
                  background: active ? "var(--sig-wash)" : undefined,
                }}
              >
                <td style={td}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                    {row.id}
                  </span>
                  {row.proofLabel ? (
                    <div
                      style={{
                        display: "inline-block",
                        marginTop: 4,
                        padding: "2px 8px",
                        borderRadius: 2,
                        fontSize: 10,
                        fontFamily: "var(--font-mono)",
                        fontWeight: row.proof === "graph" ? 600 : 400,
                        color:
                          row.proof === "graph"
                            ? "var(--paper)"
                            : row.proof === "live"
                              ? "var(--warn)"
                              : "var(--ink-muted)",
                        background:
                          row.proof === "graph"
                            ? "var(--signal)"
                            : "transparent",
                        border:
                          row.proof === "graph"
                            ? "1px solid var(--signal)"
                            : "1px solid var(--line)",
                      }}
                    >
                      {row.proofLabel}
                    </div>
                  ) : row.origin === "live" ? (
                    <div style={{ color: "var(--warn)", fontSize: 10 }}>live</div>
                  ) : null}
                  {row.rulePath ? (
                    <div
                      style={{
                        marginTop: 4,
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.04em",
                        color: "var(--signal)",
                      }}
                    >
                      {row.rulePath}
                    </div>
                  ) : null}
                  {row.ensName && row.ensNameCanonical === false ? (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 10,
                        color: "var(--block)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      ENS name not canonical
                    </div>
                  ) : null}
                </td>
                <td style={{ ...td, verticalAlign: "top", minWidth: 110 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      lineHeight: 1.35,
                      wordBreak: "break-word",
                    }}
                  >
                    {row.ensStatus || row.registryStatus || "—"}
                  </div>
                  {row.ensStatus &&
                  row.registryStatus &&
                  row.ensStatus !== row.registryStatus ? (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 10,
                        color: "var(--warn)",
                        lineHeight: 1.3,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      registry {row.registryStatus}
                    </div>
                  ) : null}
                </td>
                <td style={td}>{row.expiryHint}</td>
                <td style={td}>
                  <div>{row.label}</div>
                  <div style={{ marginTop: 4 }}>
                    <AddressDisplay
                      address={row.address}
                      status={row.ensStatus || row.registryStatus}
                      ensName={row.ensName}
                      showCopy={false}
                    />
                  </div>
                  <a
                    href={row.source_url.startsWith("http") ? row.source_url : undefined}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      fontSize: 11,
                      color: "var(--signal)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    source
                  </a>
                </td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={busy !== null || !row.registered}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDispute(row.address);
                      }}
                      style={{ ...btnGhost, padding: "6px 10px", fontSize: 12 }}
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
                      style={{ ...btnGhost, padding: "6px 10px", fontSize: 12 }}
                    >
                      Revoke
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
  const [note, setNote] = useState<string | null>(null);
  const [eac, setEac] = useState<EacProbe | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [bucket, setBucket] = useState<"all" | "graph" | "live" | "seed">("all");
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
    setError(null);
    try {
      const json = await fetchJson<{
        incidents?: Incident[];
        named?: number;
        count?: number;
        error?: string;
      }>("/api/incidents");
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
      setError(e instanceof Error ? e.message : "Failed to load incidents");
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
    setBusy(`dispute:${address}`);
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
          address,
          reason: "Govern UI dispute",
        }),
      });
      const parts = [
        `Disputed → ENS ${json.dispute?.status ?? "WATCH"}`,
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
      } else {
        setError(msg);
      }
    } finally {
      setBusy(null);
    }
  }

  async function revoke(address: string) {
    setBusy(`revoke:${address}`);
    setError(null);
    setNote(null);
    try {
      const json = await fetchJson<{
        error?: string;
        honesty?: { ens?: string; registry?: string; shieldExpect?: string };
      }>("/api/govern/revoke", {
        method: "POST",
        headers: writeHeaders(),
        body: JSON.stringify({ address, note: "Govern UI revoke" }),
      });
      const parts = [
        "Revoked ENS name",
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
      } else {
        setError(msg);
      }
    } finally {
      setBusy(null);
    }
  }

  async function eacProbe(address: string) {
    setBusy("eac");
    setError(null);
    setEac(null);
    try {
      const json = await fetchJson<EacProbe & { error?: string }>(
        "/api/govern/eac-probe",
        {
          method: "POST",
          headers: writeHeaders(),
          body: JSON.stringify({ address }),
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
          body: JSON.stringify({ address }),
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
    <section className="rise">
      <div
        style={{
          marginBottom: 22,
          padding: "16px 18px",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-md)",
          background: "var(--surface)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.35rem, 2.4vw, 1.85rem)",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "var(--ink)",
            lineHeight: 1.2,
          }}
        >
          {namedCount == null
            ? "… named · … Graph-verified · 0 laundered"
            : `${namedCount} named · ${graphVerified.length} Graph-verified · 0 laundered`}
        </p>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 13,
            color: "var(--ink-muted)",
            lineHeight: 1.45,
            maxWidth: 560,
          }}
        >
          Named = ENS/registry WATCH·TAINTED. Graph-verified = proof from The
          Graph — not the same number. SAFE never appears.
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 22,
        }}
      >
        {ROLES_LIVE.map((r) => (
          <div
            key={r.role}
            style={{
              padding: 14,
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-md)",
              background: "var(--surface)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.08em",
                color: "var(--signal)",
              }}
            >
              {r.role.toUpperCase()} · ENSv2 EAC
            </p>
            {"ens" in r && r.ens ? (
              <p
                style={{
                  margin: "8px 0 0",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--ink)",
                }}
              >
                {r.ens}
              </p>
            ) : null}
            <p
              style={{
                margin: "6px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-muted)",
                wordBreak: "break-all",
              }}
            >
              {r.address}
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ink-muted)" }}>
              {r.scope}
            </p>
          </div>
        ))}
      </div>
      <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.5 }}>
        These EOAs hold these roles on PermissionedResolver. Prove EAC: investigator
        writing <code>saviours.dispute</code> must revert. Not a DAO — enforceable
        caps.
      </p>

      <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.5 }}>
        Honesty strip:{" "}
        <strong style={{ color: "var(--signal)" }}>
          Graph-verified {graphVerified.length}
        </strong>
        {" · "}
        Live {liveRemember.length}
        {" · "}
        Seeded {provenanceSeeded.length}. Camera path: lead Graph-verified only.
        Live·Remember grows from investigate — not auto Graph-credited.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 14,
        }}
        role="tablist"
        aria-label="Memory provenance filter"
      >
        {(
          [
            {
              id: "all" as const,
              label: loadingList ? "All (…)" : `All (${incidents.length})`,
            },
            {
              id: "graph" as const,
              label: loadingList
                ? "Graph (…)"
                : `Graph (${graphVerified.length})`,
            },
            {
              id: "live" as const,
              label: loadingList
                ? "Live·Remember (…)"
                : `Live·Remember (${liveRemember.length})`,
            },
            {
              id: "seed" as const,
              label: loadingList
                ? "Seeded (…)"
                : `Seeded (${provenanceSeeded.length})`,
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
                padding: "6px 10px",
                border: `1px solid ${on ? "var(--sig)" : "var(--line)"}`,
                borderRadius: "var(--radius-chip)",
                background: on ? "var(--sig-wash)" : "var(--bg-high)",
                color: on ? "var(--sig-hi)" : "var(--tx-lo)",
                fontWeight: on ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          );
        })}
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
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                height: 52,
                borderRadius: "var(--radius-md)",
                opacity: 0.9 - i * 0.15,
              }}
            />
          ))}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void load()}
          style={btnGhost}
        >
          {busy === "list" ? "Refreshing…" : "Refresh list"}
        </button>
        {selected ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void eacProbe(selected)}
            style={btnPrimary}
          >
            {busy === "eac" ? "Probing EAC…" : "Prove EAC revert"}
          </button>
        ) : null}
      </div>

      {graphVerified.length > 0 && (bucket === "all" || bucket === "graph") ? (
        <div style={{ marginBottom: 28 }}>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              color: "var(--signal)",
            }}
          >
            GRAPH-VERIFIED · EVIDENCE GALLERY
          </p>
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 14,
            }}
          >
            {graphVerified.map((row) => (
              <div
                key={row.id}
                role="group"
                style={{
                  textAlign: "left",
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
                <button
                  type="button"
                  onClick={() => selectRow(row.address)}
                  style={{
                    display: "block",
                    margin: "8px 0 0",
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    fontSize: 12,
                    color: "var(--ink-muted)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                >
                  {row.id} · {row.label} · select →
                </button>
              </div>
            ))}
          </div>
          {onOpenLive ? (
            <p style={{ margin: "14px 0 0", fontSize: 13, color: "var(--ink-muted)" }}>
              Grow Live·Remember honestly — run investigate on the worklist.{" "}
              <button
                type="button"
                onClick={onOpenLive}
                style={{
                  border: "none",
                  background: "none",
                  padding: 0,
                  color: "var(--signal)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                Open Live →
              </button>
            </p>
          ) : null}
        </div>
      ) : null}

      {eac ? (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            border: `2px solid ${eac.reverted ? "var(--signal)" : "var(--warn)"}`,
            borderRadius: 4,
          }}
        >
          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 20 }}>
            {eac.reverted
              ? "EAC REVERT ✓ · permission model holds"
              : eac.warning ?? "Unexpected allow"}
          </p>
          {eac.reverted ? (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--ink-muted)" }}>
              Investigator cannot write dispute texts — role caps in code, not a
              decentralization claim.
            </p>
          ) : null}
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: "var(--ink-muted)",
              wordBreak: "break-all",
            }}
          >
            {eac.message ?? eac.error}
          </p>
        </div>
      ) : null}

      {error ? (
        <div style={{ marginBottom: 14 }}>
          <ErrorBanner title="Registry action failed" detail={error} />
        </div>
      ) : null}
      {note ? (
        <p style={{ color: "var(--signal)", fontSize: 14, lineHeight: 1.45 }}>{note}</p>
      ) : null}

      <div style={{ marginBottom: 28 }}>
        <h2
          style={{
            margin: "0 0 6px",
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 500,
            color: "var(--signal)",
          }}
        >
          Graph-verified
        </h2>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ink-muted)" }}>
          Demo detections = Graph-verified only
          {loadingList
            ? " (loading…)"
            : ` (${graphVerified.length} rows)`}
          . Live Messari fan-out → deterministic signals → named. Lead with these on
          camera. Counts come from live <code>/api/incidents</code> — never hardcoded.
        </p>
        <IncidentTable
          rows={graphVerified}
          selected={selected}
          busy={busy}
          loading={loadingList}
          emptyLabel="0 Graph-verified rows in the live index (proof:graph only — we do not launder)."
          onSelect={selectRow}
          onDispute={(a) => void dispute(a)}
          onRevoke={(a) => void revoke(a)}
        />
      </div>

      {liveRemember.length > 0 && (bucket === "all" || bucket === "live") ? (
        <details
          style={{
            marginBottom: 20,
            padding: "12px 14px",
            border: "1px solid var(--warn)",
            borderRadius: "var(--radius-sm)",
            background: "rgba(180,120,20,0.04)",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 500,
              color: "var(--warn)",
              listStyle: "none",
            }}
          >
            Live · Remember ({liveRemember.length}) — not Graph-verified · expand
            {liveRemember[0] ? <IncidentPeek row={liveRemember[0]} /> : null}
          </summary>
          <p style={{ margin: "10px 0 12px", fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.45 }}>
            Named via Remember / operator path. Do not count these as Graph
            detections. Vitalik + HopeLend victim pool are denylisted from this list.
          </p>
          <IncidentTable
            rows={liveRemember}
            selected={selected}
            busy={busy}
            muted
            onSelect={selectRow}
            onDispute={(a) => void dispute(a)}
            onRevoke={(a) => void revoke(a)}
          />
        </details>
      ) : null}

      {provenanceSeeded.length > 0 && (bucket === "all" || bucket === "seed") ? (
      <details
        style={{
          padding: "12px 14px",
          border: "1px dashed var(--line)",
          borderRadius: "var(--radius-sm)",
          background: "rgba(0,0,0,0.02)",
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            fontFamily: "var(--font-display)",
            fontSize: 16,
            fontWeight: 500,
            color: "var(--ink-muted)",
            listStyle: "none",
          }}
        >
          Provenance-seeded ({provenanceSeeded.length}) — not live Graph · click to expand
          {provenanceSeeded[0] ? <IncidentPeek row={provenanceSeeded[0]} /> : null}
        </summary>
        <p style={{ margin: "10px 0 12px", fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.45 }}>
          Named from post-mortems / known incidents so Govern + Resolve have memory
          objects. Do not present as “detected today.”
        </p>
        <IncidentTable
          rows={provenanceSeeded}
          selected={selected}
          busy={busy}
          muted
          onSelect={selectRow}
          onDispute={(a) => void dispute(a)}
          onRevoke={(a) => void revoke(a)}
        />
      </details>
      ) : null}

      {incidents.length === 0 && !loadingList && busy !== "list" ? (
        <p style={{ color: "var(--ink-muted)", marginTop: 16 }}>
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

const th: CSSProperties = {
  padding: "8px 6px",
  borderBottom: "1px solid var(--line)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 500,
};

const td: CSSProperties = {
  padding: "10px 6px",
  borderBottom: "1px solid var(--line)",
  verticalAlign: "top",
};
