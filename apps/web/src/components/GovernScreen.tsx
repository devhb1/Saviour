"use client";

import { startTransition, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { btnGhost, btnPrimary } from "./AppShell";
import { writeHeaders } from "../lib/writeGuard";

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
  proof?: "graph" | "provenance";
  proofLabel?: string;
};

type EacProbe = {
  reverted?: boolean;
  expectedRevert?: boolean;
  message?: string;
  error?: string;
  warning?: string;
};

function IncidentTable({
  rows,
  selected,
  busy,
  muted,
  onSelect,
  onDispute,
  onRevoke,
}: {
  rows: Incident[];
  selected: string | null;
  busy: string | null;
  muted?: boolean;
  onSelect: (address: string) => void;
  onDispute: (address: string) => void;
  onRevoke: (address: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <p style={{ color: "var(--ink-muted)", fontSize: 13, margin: "8px 0 0" }}>
        None in this section.
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
                onClick={() => onSelect(row.address)}
                style={{
                  cursor: "pointer",
                  background: active ? "rgba(13,122,95,0.08)" : undefined,
                }}
              >
                <td style={td}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                    {row.id}
                  </span>
                  {row.origin === "live" ? (
                    <div style={{ color: "var(--signal)", fontSize: 10 }}>live</div>
                  ) : null}
                </td>
                <td style={td}>
                  <strong>{row.ensStatus || row.registryStatus || "—"}</strong>
                  {row.ensStatus &&
                  row.registryStatus &&
                  row.ensStatus !== row.registryStatus ? (
                    <div style={{ fontSize: 10, color: "var(--warn)" }}>
                      registry {row.registryStatus}
                    </div>
                  ) : null}
                </td>
                <td style={td}>{row.expiryHint}</td>
                <td style={td}>
                  <div>{row.label}</div>
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
}: {
  onSelectAddress: (address: string) => void;
}) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [eac, setEac] = useState<EacProbe | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const { graphVerified, provenanceSeeded } = useMemo(() => {
    const graph: Incident[] = [];
    const seed: Incident[] = [];
    for (const row of incidents) {
      if ((row.proof ?? "provenance") === "graph") graph.push(row);
      else seed.push(row);
    }
    return { graphVerified: graph, provenanceSeeded: seed };
  }, [incidents]);

  const load = useCallback(async () => {
    setBusy("list");
    setError(null);
    try {
      const res = await fetch("/api/incidents");
      const json = (await res.json()) as {
        incidents?: Incident[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      startTransition(() => {
        const list = json.incidents ?? [];
        setIncidents(list);
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
      const res = await fetch("/api/govern/dispute", {
        method: "POST",
        headers: writeHeaders(),
        body: JSON.stringify({
          address,
          reason: "Govern UI dispute",
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        dispute?: { status: string; renewSkipped?: string | null };
        honesty?: { expiryNote?: string; shieldExpect?: string };
      };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      const parts = [
        `Disputed → ENS ${json.dispute?.status ?? "WATCH"}`,
        json.honesty?.expiryNote,
        json.honesty?.shieldExpect,
      ].filter(Boolean);
      setNote(parts.join(" · "));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dispute failed");
    } finally {
      setBusy(null);
    }
  }

  async function revoke(address: string) {
    setBusy(`revoke:${address}`);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/govern/revoke", {
        method: "POST",
        headers: writeHeaders(),
        body: JSON.stringify({ address, note: "Govern UI revoke" }),
      });
      const json = (await res.json()) as {
        error?: string;
        honesty?: { ens?: string; registry?: string; shieldExpect?: string };
      };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      const parts = [
        "Revoked ENS name",
        json.honesty?.ens,
        json.honesty?.registry,
        json.honesty?.shieldExpect,
      ].filter(Boolean);
      setNote(parts.join(" · "));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setBusy(null);
    }
  }

  async function eacProbe(address: string) {
    setBusy("eac");
    setError(null);
    setEac(null);
    try {
      const res = await fetch("/api/govern/eac-probe", {
        method: "POST",
        headers: writeHeaders(),
        body: JSON.stringify({ address }),
      });
      const json = (await res.json()) as EacProbe & { error?: string };
      if (!res.ok && !json.reverted) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      startTransition(() => setEac(json));
    } catch (e) {
      setError(e instanceof Error ? e.message : "EAC probe failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rise">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            padding: 16,
            border: "1px solid var(--line)",
            borderRadius: 4,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-muted)",
            }}
          >
            Investigator namespace
          </p>
          <p
            style={{
              margin: "8px 0 0",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              wordBreak: "break-all",
            }}
          >
            investigator-01.savioursqsy56o.eth
          </p>
        </div>
        <div
          style={{
            padding: 16,
            border: "1px solid var(--line)",
            borderRadius: 4,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-muted)",
            }}
          >
            Permission model (EAC)
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.5 }}>
            Not decentralization — operator wallets with role caps.
            <br />
            Relayer · root / unregister / renew
            <br />
            Investigator · verdict texts + REGISTRAR
            <br />
            Disputer · status + dispute only
          </p>
        </div>
      </div>

      <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.5 }}>
        Camera path: lead with{" "}
        <strong style={{ color: "var(--signal)" }}>Graph-verified</strong>{" "}
        (Messari live signals). Dispute flips ENS to WATCH but cannot shorten a
        TAINTED 10y expiry. Revoke drops ENS; registry stays append-only.
        Provenance-seeded memory objects stay collapsed below — not film primary.
      </p>

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
        <p role="alert" style={{ color: "var(--block)" }}>
          {error}
        </p>
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
          Live Messari fan-out → deterministic signals → named. Lead with these on camera.
        </p>
        <IncidentTable
          rows={graphVerified}
          selected={selected}
          busy={busy}
          onSelect={selectRow}
          onDispute={(a) => void dispute(a)}
          onRevoke={(a) => void revoke(a)}
        />
      </div>

      <details
        style={{
          padding: "12px 14px",
          border: "1px dashed var(--line)",
          borderRadius: 4,
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

      {incidents.length === 0 && busy !== "list" ? (
        <p style={{ color: "var(--ink-muted)", marginTop: 16 }}>
          No seeded incidents — run <code>pnpm seed:incidents</code>
        </p>
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
