"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Badge, Button, Label } from "../ui";
import { EnsPassport } from "./EnsPassport";
import { clientWritesAllowed } from "../lib/writeGuard";
import { GraphFanOutSvg } from "./GraphFanOutSvg";
import type { FanOutProtocolChip } from "./StandardsRegistryPanel";

/**
 * Naming ceremony stages (FOUND → NAME → RECORDS → TX → PASSPORT).
 * Each lights only when the real thing is known — never fake a confirm.
 */
const TEXT_KEYS = [
  "saviours.status",
  "saviours.threat",
  "saviours.evidenceHash",
  "saviours.atomicTx",
  "saviours.investigator",
  "saviours.dossier",
] as const;

type ResolvePayload = {
  ensName?: string;
  hit?: boolean;
  source?: string;
  records?: Record<string, string>;
  namedTx?: string | null;
  cast?: string;
  permissionedResolver?: string;
  error?: string;
};

type Stage = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * ENS Naming Ceremony — first-class product moment.
 * FOUND → NAME → RECORDS (stream) → SEPOLIA TX → PASSPORT (read back from chain).
 * REPLAY is labelled when writes are closed or we are replaying a prior namedTx.
 */
export function NamingCeremony({
  address,
  status,
  threat,
  ensNameHint,
  auto = true,
  onOpenIdentity,
  featured = false,
  graphProtocols,
  onJumpInvestigate,
}: {
  address: string;
  status?: string | null;
  threat?: string | null;
  ensNameHint?: string | null;
  auto?: boolean;
  onOpenIdentity?: (a: string) => void;
  /** Larger treatment for 03 Name screen. */
  featured?: boolean;
  /** Live fan-out chips from INVESTIGATE — enables View graph on NAME. */
  graphProtocols?: FanOutProtocolChip[];
  onJumpInvestigate?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolve, setResolve] = useState<ResolvePayload | null>(null);
  const [stage, setStage] = useState<Stage>(0);
  const [recordReveal, setRecordReveal] = useState(0);
  const [castOut, setCastOut] = useState<string | null>(null);
  const [castBusy, setCastBusy] = useState(false);
  const [focus, setFocus] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [focusPinned, setFocusPinned] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const writesOpen = clientWritesAllowed();

  const ensName =
    resolve?.ensName ||
    ensNameHint ||
    `${address.trim().toLowerCase()}.saviours.eth`;

  const records = resolve?.records ?? {};
  const modeLabel = writesOpen && !resolve?.namedTx ? "LIVE" : "REPLAY";

  async function load() {
    const a = address.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(a)) {
      setError("Need a 0x address");
      return;
    }
    setBusy(true);
    setError(null);
    setResolve(null);
    setStage(0);
    setRecordReveal(0);
    setCastOut(null);
    setFocus(1);
    setFocusPinned(false);
    setGraphOpen(false);
    try {
      const res = await fetch(`/api/resolve?address=${encodeURIComponent(a)}`);
      const json = (await res.json()) as ResolvePayload;
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setResolve(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resolve failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (auto && address) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, auto]);

  useEffect(() => {
    if (!resolve) return;
    setStage(1);
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setStage(2), 350));
    timers.push(window.setTimeout(() => setStage(3), 700));
    let i = 0;
    const rec = window.setInterval(() => {
      i += 1;
      setRecordReveal(i);
      if (i >= TEXT_KEYS.length) window.clearInterval(rec);
    }, 160);
    timers.push(rec);
    timers.push(
      window.setTimeout(
        () => setStage(4),
        700 + TEXT_KEYS.length * 160 + 180,
      ),
    );
    timers.push(
      window.setTimeout(
        () => setStage(5),
        700 + TEXT_KEYS.length * 160 + 650,
      ),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [resolve]);

  useEffect(() => {
    if (focusPinned) return;
    if (stage >= 1 && stage <= 5) setFocus(stage as 1 | 2 | 3 | 4 | 5);
  }, [stage, focusPinned]);

  const statusVal =
    records["saviours.status"] || status || (resolve?.hit ? "HIT" : "UNKNOWN");

  const stages = useMemo(() => {
    return [
      {
        n: 1 as const,
        title: "FOUND",
        detail: `${statusVal}${threat || records["saviours.threat"] ? ` · ${threat || records["saviours.threat"]}` : ""}`,
        lit: stage >= 1,
      },
      {
        n: 2 as const,
        title: "NAME",
        detail: ensName,
        lit: stage >= 2,
      },
      {
        n: 3 as const,
        title: "RECORDS",
        detail: `six saviours.* texts · ${modeLabel}`,
        lit: stage >= 3,
      },
      {
        n: 4 as const,
        title: "SEPOLIA TX",
        detail: resolve?.namedTx
          ? resolve.namedTx
          : modeLabel === "REPLAY"
            ? "REPLAY · no namedTx on this row (status still live on chain)"
            : "awaiting write",
        lit: stage >= 4,
        ok: Boolean(resolve?.namedTx) || Boolean(resolve?.hit),
      },
      {
        n: 5 as const,
        title: "PASSPORT",
        detail: resolve?.hit
          ? "read back from chain · cast-ready · in Memory"
          : "awaiting name",
        lit: stage >= 5,
      },
    ];
  }, [stage, ensName, statusVal, threat, records, resolve, modeLabel]);

  async function runCast() {
    setCastBusy(true);
    setCastOut(null);
    try {
      const a = address.trim().toLowerCase();
      const res = await fetch(`/api/resolve?address=${encodeURIComponent(a)}`);
      const json = (await res.json()) as ResolvePayload;
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const raw = json.records?.["saviours.status"]?.trim() || "(empty)";
      setCastOut(raw);
    } catch (e) {
      setCastOut(e instanceof Error ? e.message : "cast failed");
    } finally {
      setCastBusy(false);
    }
  }

  return (
    <aside
      style={{
        ...wrap,
        ...(featured
          ? {
              padding: "10px 12px",
              borderWidth: 1,
              boxShadow: "var(--glow-sig), var(--lift)",
            }
          : null),
      }}
      aria-live="polite"
      className={featured ? "rise" : undefined}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "center",
        }}
      >
        <div>
          <Label>03 · NAMING CEREMONY</Label>
          {featured ? (
            <p
              style={{
                margin: "2px 0 0",
                fontFamily: "var(--font-display)",
                fontSize: "clamp(16px, 2vw, 20px)",
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "var(--tx-hi)",
                lineHeight: 1.15,
              }}
            >
              A threat becomes a name.
            </p>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Badge status={modeLabel === "LIVE" ? "HIT" : "ESCALATE"}>
            {modeLabel}
          </Badge>
          {featured ? (
            <button
              type="button"
              onClick={() => setGraphOpen((v) => !v)}
              style={ghostBtn}
              aria-expanded={graphOpen}
            >
              {graphOpen ? "Hide graph ↑" : "View graph ↓"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy}
            style={ghostBtn}
          >
            {busy ? "Reading…" : "Re-run"}
          </button>
        </div>
      </div>
      {featured ? (
        <p
          style={{
            margin: "8px 0 0",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--tx-lo)",
            wordBreak: "break-all",
            lineHeight: 1.35,
          }}
        >
          <code style={{ color: "var(--sig)" }}>{ensName}</code>
          {modeLabel === "REPLAY" ? (
            <span style={{ color: "var(--amber)", marginLeft: 8 }}>· REPLAY</span>
          ) : null}
        </p>
      ) : (
        <p style={muted}>
          Records are texts on{" "}
          <code style={{ color: "var(--sig)" }}>{ensName}</code>. ENS stores the
          finding — it does not decide it.{" "}
          {modeLabel === "REPLAY" ? (
            <strong style={{ color: "var(--amber)" }}>
              REPLAY · showing a prior on-chain write, labelled honestly.
            </strong>
          ) : null}
        </p>
      )}

      {error ? (
        <p role="alert" style={{ marginTop: 12, color: "var(--red)", fontSize: 13 }}>
          {error}
        </p>
      ) : null}

      {featured ? (
        <>
          {graphOpen ? (
            <div style={{ marginTop: 10, minWidth: 0 }}>
              {graphProtocols && graphProtocols.length > 0 ? (
                <GraphFanOutSvg protocols={graphProtocols} compact />
              ) : (
                <p
                  style={{
                    margin: "0 0 6px",
                    padding: "10px 12px",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-sm)",
                    background: "var(--bg-inset)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--tx-lo)",
                    lineHeight: 1.45,
                  }}
                >
                  No live fan-out cached yet.
                  {onJumpInvestigate ? (
                    <>
                      {" "}
                      <button
                        type="button"
                        onClick={onJumpInvestigate}
                        style={{
                          ...ghostBtn,
                          padding: "2px 8px",
                          display: "inline",
                        }}
                      >
                        Open INVESTIGATE →
                      </button>
                    </>
                  ) : (
                    " Run INVESTIGATE first."
                  )}
                </p>
              )}
            </div>
          ) : null}
          <div
            role="tablist"
            aria-label="Naming ceremony stages"
            style={{
              marginTop: 10,
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            {stages.map((s) => {
              const selected = focus === s.n;
              return (
                <button
                  key={s.n}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  disabled={!s.lit && !busy}
                  onClick={() => {
                    if (!s.lit) return;
                    setFocusPinned(true);
                    setFocus(s.n as 1 | 2 | 3 | 4 | 5);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 9px",
                    borderRadius: 999,
                    border: `1px solid ${
                      selected
                        ? "var(--sig)"
                        : s.lit
                          ? "var(--sig-line)"
                          : "var(--line)"
                    }`,
                    background: selected
                      ? "var(--sig-wash)"
                      : s.lit
                        ? "color-mix(in srgb, var(--sig-wash) 55%, var(--bg-raise))"
                        : "var(--bg-inset)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.04em",
                    color: s.lit ? "var(--sig)" : "var(--tx-faint)",
                    fontWeight: 600,
                    opacity: s.lit || busy ? 1 : 0.45,
                    cursor: s.lit ? "pointer" : "default",
                    boxShadow: selected ? "0 0 0 1px color-mix(in srgb, var(--sig) 35%, transparent)" : undefined,
                  }}
                >
                  {String(s.n).padStart(2, "0")} {s.title}
                </button>
              );
            })}
          </div>
          <div
            role="tabpanel"
            style={{
              marginTop: 10,
              padding: "10px 12px",
              border: "1px solid var(--sig-line)",
              borderRadius: "var(--r-sm)",
              background: "var(--sig-wash)",
              minWidth: 0,
              overflowWrap: "anywhere",
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.08em",
                color: "var(--sig)",
                fontWeight: 600,
              }}
            >
              {String(focus).padStart(2, "0")} · {stages.find((s) => s.n === focus)?.title}
            </p>
            {focus === 1 ? (
              <p style={focusBody}>
                <strong style={{ color: statusVal === "TAINTED" ? "var(--red)" : "var(--tx-hi)" }}>
                  {statusVal}
                </strong>
                {threat || records["saviours.threat"]
                  ? ` · ${threat || records["saviours.threat"]}`
                  : ""}
              </p>
            ) : null}
            {focus === 2 ? (
              <p style={{ ...focusBody, fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>
                {ensName}
              </p>
            ) : null}
            {focus === 3 ? (
              <>
                <p style={focusBody}>
                  six saviours.* texts · {modeLabel}
                  {` · ${TEXT_KEYS.filter((k) => records[k]?.trim()).length}/${TEXT_KEYS.length} live`}
                </p>
                {stage >= 3 ? (
                  <ul
                    style={{
                      listStyle: "none",
                      margin: "8px 0 0",
                      padding: 0,
                      display: "grid",
                      gap: 5,
                    }}
                  >
                    {TEXT_KEYS.map((k, i) => {
                      const val = records[k]?.trim();
                      const show = i < recordReveal;
                      const ok = Boolean(val);
                      return (
                        <li
                          key={k}
                          style={{
                            opacity: show ? 1 : 0.2,
                            display: "grid",
                            gridTemplateColumns: "14px minmax(0, 1fr)",
                            gap: 6,
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            alignItems: "baseline",
                          }}
                        >
                          <span style={{ color: ok ? "var(--green)" : "var(--tx-faint)" }}>
                            {ok && show ? "✓" : "○"}
                          </span>
                          <span style={{ minWidth: 0, wordBreak: "break-all" }}>
                            <code style={{ color: "var(--sig-hi)" }}>{k}</code>
                            <span style={{ color: "var(--tx-lo)" }}>
                              {" · "}
                              {ok && show ? val : "—"}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p style={{ ...focusBody, color: "var(--tx-faint)" }}>Awaiting records…</p>
                )}
              </>
            ) : null}
            {focus === 4 ? (
              <>
                <p style={{ ...focusBody, fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>
                  {stages.find((s) => s.n === 4)?.detail}
                </p>
                {stage >= 4 && resolve?.namedTx ? (
                  <p style={{ margin: "6px 0 0", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                    <span style={{ color: "var(--green)", fontWeight: 600 }}>confirmed</span>
                    {" · "}
                    <a
                      href={`https://sepolia.etherscan.io/tx/${resolve.namedTx}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--sig)" }}
                    >
                      sepolia.etherscan ↗
                    </a>
                  </p>
                ) : null}
              </>
            ) : null}
            {focus === 5 ? (
              <p style={focusBody}>
                {stages.find((s) => s.n === 5)?.detail}
              </p>
            ) : null}
          </div>
        </>
      ) : (
      <ol
        style={{
          listStyle: "none",
          margin: "10px 0 0",
          padding: 0,
          display: "grid",
          gap: 10,
        }}
      >
        {stages.map((s) => (
          <li
            key={s.n}
            style={{
              display: "grid",
              gridTemplateColumns: "56px 1fr",
              gap: 12,
              padding: "12px 14px",
              borderRadius: "var(--r-md)",
              border: `1px solid ${s.lit ? "var(--sig-line)" : "var(--line)"}`,
              background: s.lit ? "var(--sig-wash)" : "var(--bg-inset)",
              opacity: s.lit || busy ? 1 : 0.45,
              transition: "opacity var(--base) var(--ease), border-color var(--base) var(--ease)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.08em",
                color: s.lit ? "var(--sig)" : "var(--tx-faint)",
                fontWeight: 600,
              }}
            >
              {String(s.n).padStart(2, "0")}
            </span>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--tx-hi)",
                  letterSpacing: "-0.01em",
                }}
              >
                {s.title}
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: s.n === 2 || s.n === 4 ? 12 : 13,
                  color: "var(--tx)",
                  wordBreak: "break-all",
                  lineHeight: 1.4,
                  fontFamily:
                    s.n === 2 || s.n === 4 ? "var(--font-mono)" : undefined,
                }}
              >
                {s.detail}
              </p>

              {s.n === 3 && stage >= 3 ? (
                <ul
                  style={{
                    listStyle: "none",
                    margin: "12px 0 0",
                    padding: 0,
                    display: "grid",
                    gap: 6,
                  }}
                >
                  {TEXT_KEYS.map((k, i) => {
                    const val = records[k]?.trim();
                    const show = i < recordReveal;
                    const ok = Boolean(val);
                    return (
                      <li
                        key={k}
                        className={show ? "line-in" : undefined}
                        style={{
                          opacity: show ? 1 : 0.15,
                          display: "grid",
                          gridTemplateColumns: "18px minmax(140px, 210px) 1fr",
                          gap: 8,
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          alignItems: "baseline",
                        }}
                      >
                        <span style={{ color: ok ? "var(--green)" : "var(--tx-faint)" }}>
                          {ok && show ? "✓" : "○"}
                        </span>
                        <code style={{ color: "var(--sig-hi)" }}>{k}</code>
                        <span style={{ color: "var(--tx-lo)", wordBreak: "break-all" }}>
                          {ok && show ? val : "—"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {s.n === 4 && stage >= 4 && resolve?.namedTx ? (
                <p style={{ margin: "10px 0 0", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  <span style={{ color: "var(--green)", fontWeight: 600 }}>
                    confirmed
                  </span>
                  {" · "}
                  <a
                    href={`https://sepolia.etherscan.io/tx/${resolve.namedTx}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--sig)" }}
                  >
                    sepolia.etherscan ↗
                  </a>
                  {modeLabel === "REPLAY" ? (
                    <span style={{ color: "var(--amber)", marginLeft: 8 }}>REPLAY</span>
                  ) : null}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      )}

      {stage >= 5 && resolve?.hit && (!featured || focus === 5) ? (
        <div style={{ marginTop: featured ? 8 : 18 }} className="stamp-in">
          <EnsPassport
            ensName={ensName}
            status={statusVal}
            threat={records["saviours.threat"] || threat || undefined}
            address={address}
            compact
            onOpenIdentity={
              onOpenIdentity ? () => onOpenIdentity(address.trim()) : undefined
            }
          />
          {!featured ? (
            <p
              style={{
                margin: "12px 0 0",
                fontSize: 13,
                color: "var(--green)",
                lineHeight: 1.45,
              }}
            >
              Added to Memory · anyone can cast this without our server.
            </p>
          ) : (
            <p
              style={{
                margin: "6px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--green)",
              }}
            >
              In Memory · castable without our server
            </p>
          )}
        </div>
      ) : null}

      {!featured ? (
      <div
        style={{
          marginTop: 18,
          padding: "14px 14px",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-inset)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "center",
          }}
        >
          <Label>VERIFY · RAW STATUS (no our server in the path)</Label>
          <button
            type="button"
            onClick={() => void runCast()}
            disabled={castBusy || busy}
            style={ghostBtn}
          >
            {castBusy ? "Reading…" : "Run cast equivalent →"}
          </button>
        </div>
        <p style={{ ...muted, marginTop: 6 }}>
          Reads <code>saviours.status</code> live from Sepolia via the same
          resolver a terminal <code>cast call</code> would hit.
        </p>
        {castOut !== null ? (
          <pre style={castOutPre}>
            <span style={{ color: "var(--tx-faint)" }}>← saviours.status = </span>
            <span
              style={{
                color:
                  castOut === "TAINTED"
                    ? "var(--red)"
                    : castOut === "WATCH"
                      ? "var(--amber)"
                      : "var(--tx-hi)",
                fontWeight: 700,
              }}
            >
              {castOut}
            </span>
          </pre>
        ) : null}
        {resolve?.cast ? (
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void navigator.clipboard.writeText(resolve.cast!)}
            >
              Copy cast command
            </Button>
          </div>
        ) : null}
      </div>
      ) : null}
    </aside>
  );
}

const wrap: CSSProperties = {
  marginTop: 12,
  padding: "12px 12px",
  border: "1px solid var(--sig-line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-raise)",
  boxShadow: "var(--glow-sig)",
};

const muted: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 13,
  color: "var(--tx-lo)",
  lineHeight: 1.45,
};

const focusBody: CSSProperties = {
  margin: "6px 0 0",
  fontSize: 12,
  color: "var(--tx)",
  lineHeight: 1.45,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const ghostBtn: CSSProperties = {
  border: "1px solid var(--line)",
  background: "var(--bg-high)",
  color: "var(--tx)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  padding: "6px 10px",
  borderRadius: "var(--r-sm)",
  cursor: "pointer",
};

const castOutPre: CSSProperties = {
  margin: "12px 0 0",
  padding: "12px 14px",
  background: "var(--bg-void)",
  border: "1px solid var(--line-mid)",
  borderRadius: "var(--r-sm)",
  fontFamily: "var(--font-mono)",
  fontSize: 14,
  lineHeight: 1.4,
};
