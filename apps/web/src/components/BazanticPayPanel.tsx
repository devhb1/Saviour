"use client";

import { useState, type CSSProperties } from "react";
import { btnGhost, btnPrimary, HOME_CHIPS } from "./AppShell";
import { pushMeterEntry } from "./SessionMeter";

const GATEWAY = "https://saviour.bazgateway.com";

/** Fresh miss address for the unpaid 402 invoice demo (not a named hero). */
const INVOICE_DEMO = "0x1111111111111111111111111111111111111113";

/** Force-fresh paid investigate target — Graph-verified hero so evidence is real. */
const PAY_EVIDENCE_ADDR =
  HOME_CHIPS[0]?.address ?? "0x935bfb495e33f74d2e9735df1da66ace442ede48";

type EvidenceRow = {
  id?: string;
  claim?: string;
  kind?: string;
  protocol?: string;
  source?: string;
  reference?: string;
  txHash?: string;
  amountUSD?: number;
  subgraphId?: string;
};

type SignalRow = {
  id?: string;
  class?: string;
  detail?: string;
  evidenceIds?: string[];
};

type InvestigateBody = {
  assessment?: {
    status?: string;
    confidence?: number;
    threatTypes?: string[];
    explanation?: string;
    evidence?: EvidenceRow[];
    counterEvidence?: EvidenceRow[];
    modelVersion?: string;
    rulesVersion?: string;
    incidentId?: string;
  };
  signals?: SignalRow[];
  evidence?: EvidenceRow[];
  explanation?: string;
  banner?: string;
  protocols?: Array<{ slug?: string; name?: string; status?: string } | string>;
  cost?: {
    graphQueries?: number;
    aiCalls?: number;
    ensResolutions?: number;
    latencyMs?: number;
  };
  memoryHit?: boolean;
  shield?: {
    decision?: string;
    source?: string;
    usedAi?: boolean;
    ensName?: string;
  };
  remember?: {
    ensName?: string;
    named?: boolean;
    skipped?: string;
  };
  trace?: Array<{ step?: string; detail?: string } | string>;
};

type PaidResult = {
  ok: boolean;
  live?: boolean;
  settlement?: "x402-cli" | "developer-jwt" | string;
  note?: string;
  transaction?: string | null;
  explorerUrl?: string | null;
  amountUsd?: string | null;
  payer?: string | null;
  assessmentStatus?: string | null;
  settledAt?: string;
  network?: string;
  body?: InvestigateBody;
  error?: string;
  detail?: string;
};

function etherscanTx(tx?: string): string | null {
  if (!tx || !/^0x[a-fA-F0-9]{64}$/.test(tx)) return null;
  return `https://etherscan.io/tx/${tx}`;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

/**
 * Live Bazantic meter: 402 unpaid (invoice) → Pay & settle (real Base tx +
 * full Graph/AI/validator evidence dossier from the paid investigate body).
 */
export function BazanticPayPanel({
  demoAddress = INVOICE_DEMO,
  evidenceAddress = PAY_EVIDENCE_ADDR,
  variant = "full",
}: {
  /** Address used for unpaid 402 invoice probe. */
  demoAddress?: string;
  /** Address used for paid forceFresh investigate (prefer Graph-verified hero). */
  evidenceAddress?: string;
  variant?: "compact" | "full";
}) {
  const [shield, setShield] = useState<string | null>(null);
  const [inv, setInv] = useState<{
    status: number;
    summary: string;
  } | null>(null);
  const [paid, setPaid] = useState<PaidResult | null>(null);
  const [busy, setBusy] = useState<"shield" | "inv" | "pay" | null>(null);

  async function probeShield() {
    setBusy("shield");
    setShield(null);
    try {
      const res = await fetch(`${GATEWAY}/api/shield/check`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chainId: 1,
          address: PAY_EVIDENCE_ADDR,
          registryNetwork: "sepolia",
        }),
      });
      const json = await res.json();
      const decision = json?.check?.decision ?? res.status;
      const cost = json?.check?.cost ?? {};
      setShield(
        `${res.status} · ${decision} · graph=${cost.graphQueries ?? 0} ai=${cost.aiCalls ?? 0} · $0`,
      );
      pushMeterEntry({
        kind: "shield",
        label: `Probe $0 · ${decision}`,
        usd: 0,
        ok: true,
      });
    } catch (e) {
      setShield(e instanceof Error ? e.message : "shield failed");
    } finally {
      setBusy(null);
    }
  }

  async function probeInvestigateUnpaid() {
    setBusy("inv");
    setInv(null);
    setPaid(null);
    try {
      const res = await fetch(`${GATEWAY}/api/investigate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chainId: 1,
          address: demoAddress,
          persist: false,
          forceFresh: true,
          registryNetwork: "sepolia",
        }),
      });
      if (res.status === 402) {
        setInv({
          status: 402,
          summary:
            "Live invoice · HTTP 402 · x402 · pay on Base to unlock investigate",
        });
        return;
      }
      const json = await res.json().catch(() => ({}));
      setInv({
        status: res.status,
        summary: `${res.status} · ${JSON.stringify(json).slice(0, 120)}`,
      });
    } catch (e) {
      setInv({
        status: 0,
        summary: e instanceof Error ? e.message : "investigate failed",
      });
    } finally {
      setBusy(null);
    }
  }

  async function payAndInvestigate() {
    setBusy("pay");
    setPaid(null);
    try {
      const res = await fetch("/api/bazantic/pay-investigate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chainId: 1,
          address: evidenceAddress,
          persist: false,
          forceFresh: true,
          registryNetwork: "sepolia",
        }),
      });
      const json = (await res.json()) as PaidResult;
      if (!res.ok) {
        setPaid({
          ok: false,
          error: json.error || res.statusText,
          detail: json.detail,
        });
        return;
      }
      setPaid(json);
      pushMeterEntry({
        kind: "pay",
        label: `Pay · ${json.assessmentStatus ?? "ok"} · ${
          json.transaction
            ? `${json.transaction.slice(0, 12)}…`
            : json.settlement === "developer-jwt"
              ? "JWT"
              : "ok"
        }`,
        usd: Number(json.amountUsd ?? 0) || 0,
        ok: true,
        href: json.explorerUrl ?? undefined,
      });
    } catch (e) {
      setPaid({
        ok: false,
        error: e instanceof Error ? e.message : "pay failed",
      });
    } finally {
      setBusy(null);
    }
  }

  const paidBlock =
    paid?.ok && (paid.body || paid.assessmentStatus) ? (
      <PaidEvidenceDossier
        paid={paid}
        subject={evidenceAddress}
        compact={variant === "compact"}
      />
    ) : paid && !paid.ok ? (
      <div style={{ ...paidBox, borderColor: "var(--rule)" }}>
        <p style={cellTitle}>
          {/CLI not on this host|Public Vercel/i.test(
            `${paid.error ?? ""} ${paid.detail ?? ""}`,
          )
            ? "SETTLE · LOCAL ONLY"
            : "SETTLE FAILED"}
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ink-muted)" }}>
          {/CLI not on this host/i.test(paid.error ?? "")
            ? "Public www.saviours.xyz proves Probe $0 + live HTTP 402. Paid settle runs on your laptop (agent pays from film-base), not on this host."
            : (paid.error ?? "settle failed")}
          {paid.detail && !/CLI not on this host/i.test(paid.error ?? "")
            ? ` · ${paid.detail.slice(0, 180)}`
            : ""}
        </p>
        <p style={{ ...muted, marginTop: 8 }}>
          Film step 3 on <code>pnpm dev</code> after{" "}
          <code>bazantic login</code> + grant <code>film-base</code> on Base.
          Steps 1–2 on this site are the real production proof.
        </p>
      </div>
    ) : null;

  if (variant === "compact") {
    return (
      <aside style={compactWrap}>
        <p style={eyebrow}>BAZANTIC · LIVE METER</p>
        <p style={compactTitle}>$0 on hit · pay on miss</p>
        <p style={muted}>
          1 · Probe $0 · 2 · Show 402 invoice · 3 · Pay & investigate → Basescan
          settle + Graph evidence dossier (ATTACK-1 forceFresh).
        </p>
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void probeShield()}
            style={btnGhost}
          >
            {busy === "shield" ? "…" : "1 · Probe $0"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void probeInvestigateUnpaid()}
            style={btnGhost}
          >
            {busy === "inv" ? "…" : "2 · Show 402"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void payAndInvestigate()}
            style={btnPrimary}
          >
            {busy === "pay" ? "Investigating…" : "3 · Pay & investigate →"}
          </button>
        </div>
        {(shield || inv) && (
          <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
            {shield ? <p style={result}>shield · {shield}</p> : null}
            {inv ? (
              <p style={result}>
                invoice · {inv.summary}
                {inv.status === 402 ? (
                  <span style={{ color: "var(--warn)" }}> · awaiting pay</span>
                ) : null}
              </p>
            ) : null}
          </div>
        )}
        {paidBlock}
        <p style={filmHint}>
          Step 3 on this host unlocks investigate via the gateway account (JWT)
          — live Graph + AI dossier. A Basescan x402 tx needs local{" "}
          <code>pnpm dev</code> + <code>bazantic</code> grant{" "}
          <code>film-base</code>.
        </p>
        <p
          style={{
            ...muted,
            marginTop: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
        >
          {GATEWAY}
        </p>
      </aside>
    );
  }

  return (
    <aside style={fullWrap}>
      <p style={eyebrow}>BAZANTIC · AGENT SETTLEMENT</p>
      <p
        style={{
          margin: "10px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          color: "var(--ink)",
        }}
      >
        Shield $0 forever. Investigate paid on miss.
      </p>
      <p style={{ ...muted, marginTop: 10 }}>
        Recipe: shield first → cancel on BLOCK/WARN → on miss, settle x402 on
        Base → then investigate. Paid button returns a live Basescan tx{" "}
        <em>and</em> the Graph fan-out / signals / validator dossier for this
        session.
      </p>
      <p style={filmHint}>
        Film paid settle on <code>pnpm dev</code> with bazantic CLI +{" "}
        <code>film-base</code>. Public host still shows Probe $0 and the 402
        invoice.
      </p>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
        }}
      >
        <div style={cell}>
          <p style={cellTitle}>1 · shieldCheck $0</p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void probeShield()}
            style={btnGhost}
          >
            {busy === "shield" ? "…" : "Probe $0 →"}
          </button>
          {shield ? <p style={result}>{shield}</p> : null}
        </div>
        <div style={cell}>
          <p style={cellTitle}>2 · unpaid invoice</p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void probeInvestigateUnpaid()}
            style={btnGhost}
          >
            {busy === "inv" ? "…" : "Show 402 →"}
          </button>
          {inv ? <p style={result}>{inv.summary}</p> : null}
        </div>
        <div style={cell}>
          <p style={cellTitle}>3 · pay + evidence</p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void payAndInvestigate()}
            style={btnPrimary}
          >
            {busy === "pay" ? "Settling…" : "Pay & investigate →"}
          </button>
        </div>
      </div>

      {paidBlock}

      <p
        style={{
          margin: "14px 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-muted)",
        }}
      >
        Gateway · {GATEWAY} · MCP · /mcp · grant account via BAZANTIC_PAY_ACCOUNT
      </p>
    </aside>
  );
}

function PaidEvidenceDossier({
  paid,
  subject,
  compact,
}: {
  paid: PaidResult;
  subject: string;
  compact: boolean;
}) {
  const body = paid.body ?? {};
  const assessment = body.assessment;
  const status =
    assessment?.status ?? paid.assessmentStatus ?? "UNKNOWN";
  const explanation =
    body.explanation ||
    (assessment as { explanation?: string } | undefined)?.explanation ||
    null;
  const signals = body.signals ?? [];
  const evidenceRows: EvidenceRow[] =
    body.evidence?.length
      ? body.evidence
      : assessment?.evidence ?? [];
  const counter = assessment?.counterEvidence ?? [];
  const cost = body.cost;
  const maxEv = compact ? 4 : 8;
  const maxSig = compact ? 4 : 8;

  return (
    <div style={paidBox}>
      <p style={cellTitle}>
        {paid.settlement === "developer-jwt"
          ? "LIVE INVESTIGATE · JWT (GATEWAY ACCOUNT)"
          : "LIVE SETTLE · THIS SESSION"}
      </p>
      <p style={{ margin: 0, fontSize: 14, color: "var(--ink)", fontWeight: 600 }}>
        {paid.settlement === "developer-jwt"
          ? "Developer JWT unlock · live Graph + AI · assessment "
          : `Paid $${paid.amountUsd ?? "…"} USDC on Base · assessment `}
        <span style={{ color: statusColor(status) }}>{status}</span>
        {typeof assessment?.confidence === "number"
          ? ` · confidence ${assessment.confidence}`
          : ""}
      </p>

      {paid.transaction && paid.explorerUrl ? (
        <a
          href={paid.explorerUrl}
          target="_blank"
          rel="noreferrer"
          style={linkMono}
        >
          Basescan settle · {paid.transaction}
        </a>
      ) : (
        <p style={{ ...muted, marginTop: 8, fontSize: 12 }}>
          {paid.note ??
            "No Basescan tx on this path — x402 settle needs local bazantic CLI + film-base grant."}
        </p>
      )}
      {paid.settledAt ? (
        <p style={{ ...muted, marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 11 }}>
          {paid.settledAt}
          {paid.payer ? ` · payer ${paid.payer.slice(0, 10)}…` : ""}
          {paid.network ? ` · ${paid.network}` : ""}
          {paid.settlement ? ` · ${paid.settlement}` : ""}
        </p>
      ) : null}

      <div style={dossierRule} />

      <p style={cellTitle}>SUBJECT · FORCE FRESH GRAPH PATH</p>
      <p style={{ ...result, marginTop: 0 }}>{subject}</p>

      {explanation ? (
        <>
          <p style={{ ...cellTitle, marginTop: 12 }}>EVIDENCE-BACKED DESCRIPTION</p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "var(--ink)",
              lineHeight: 1.5,
            }}
          >
            {explanation}
          </p>
        </>
      ) : null}

      {assessment?.threatTypes && assessment.threatTypes.length > 0 ? (
        <p style={{ ...result, marginTop: 8 }}>
          threats · {assessment.threatTypes.join(" · ")}
        </p>
      ) : null}

      {cost ? (
        <p style={{ ...result, marginTop: 8 }}>
          cost · Graph {cost.graphQueries ?? "—"} · AI {cost.aiCalls ?? "—"}
          {cost.ensResolutions != null ? ` · ENS ${cost.ensResolutions}` : ""}
          {cost.latencyMs != null ? ` · ${cost.latencyMs}ms` : ""}
        </p>
      ) : null}

      {body.banner ? (
        <p style={{ ...muted, marginTop: 8, fontSize: 12 }}>{body.banner}</p>
      ) : null}

      {body.shield ? (
        <p style={{ ...result, marginTop: 8 }}>
          shield context · {body.shield.decision ?? "—"}
          {body.shield.source ? ` · source=${body.shield.source}` : ""}
          {body.shield.ensName ? ` · ${body.shield.ensName}` : ""}
          {body.shield.usedAi === false ? " · usedAi=false" : ""}
        </p>
      ) : null}

      {body.remember?.ensName ? (
        <p style={{ ...result, marginTop: 6 }}>
          ENS · {body.remember.ensName}
          {body.remember.named === false && body.remember.skipped
            ? ` · skipped ${body.remember.skipped}`
            : ""}
        </p>
      ) : null}

      {signals.length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <p style={cellTitle}>DETERMINISTIC SIGNALS · ON-CHAIN DERIVED</p>
          <ul style={list}>
            {signals.slice(0, maxSig).map((s, i) => (
              <li key={`${s.id ?? i}-${i}`} style={listItem}>
                <strong style={{ color: "var(--ink)" }}>{s.id ?? "SIGNAL"}</strong>
                {s.class ? (
                  <span style={{ color: "var(--ink-muted)" }}> · {s.class}</span>
                ) : null}
                {s.detail ? (
                  <span style={{ display: "block", marginTop: 2 }}>{s.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
          {signals.length > maxSig ? (
            <p style={{ ...muted, marginTop: 4, fontSize: 11 }}>
              +{signals.length - maxSig} more signals
            </p>
          ) : null}
        </div>
      ) : (
        <p style={{ ...muted, marginTop: 12, fontSize: 12 }}>
          No deterministic signals on this subject (honest empty — not an error).
        </p>
      )}

      {evidenceRows.length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <p style={cellTitle}>
            ON-CHAIN / GRAPH EVIDENCE · {evidenceRows.length} ROWS
          </p>
          <ul style={list}>
            {evidenceRows.slice(0, maxEv).map((e, i) => {
              const tx = e.txHash;
              const eth = etherscanTx(tx);
              return (
                <li key={`${e.id ?? i}-${i}`} style={listItem}>
                  <span style={{ color: "var(--ink)" }}>
                    {[e.kind, e.protocol, e.source].filter(Boolean).join(" · ") ||
                      e.id ||
                      "evidence"}
                  </span>
                  {typeof e.amountUSD === "number" ? (
                    <span style={{ color: "var(--ink-muted)" }}>
                      {" "}
                      · ${e.amountUSD.toLocaleString()}
                    </span>
                  ) : null}
                  {e.claim ? (
                    <span style={{ display: "block", marginTop: 2 }}>
                      {truncate(e.claim, compact ? 120 : 220)}
                    </span>
                  ) : null}
                  {eth ? (
                    <a
                      href={eth}
                      target="_blank"
                      rel="noreferrer"
                      style={{ ...linkMono, marginTop: 4, fontSize: 11 }}
                    >
                      Etherscan · {tx!.slice(0, 10)}…{tx!.slice(-6)}
                    </a>
                  ) : e.reference ? (
                    <span
                      style={{
                        display: "block",
                        marginTop: 2,
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--ink-muted)",
                        wordBreak: "break-all",
                      }}
                    >
                      {truncate(e.reference, 80)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {evidenceRows.length > maxEv ? (
            <p style={{ ...muted, marginTop: 4, fontSize: 11 }}>
              +{evidenceRows.length - maxEv} more evidence rows
            </p>
          ) : null}
        </div>
      ) : null}

      {counter.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <p style={cellTitle}>COUNTER-EVIDENCE</p>
          <ul style={list}>
            {counter.slice(0, 3).map((e, i) => (
              <li key={`c-${e.id ?? i}`} style={listItem}>
                {truncate(e.claim || e.id || "counter", 160)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {(assessment?.modelVersion || assessment?.rulesVersion) && (
        <p style={{ ...muted, marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 11 }}>
          model {assessment?.modelVersion ?? "—"} · rules{" "}
          {assessment?.rulesVersion ?? "—"}
          {assessment?.incidentId ? ` · ${assessment.incidentId}` : ""}
        </p>
      )}

      <p style={{ ...muted, marginTop: 10, fontSize: 11 }}>
        AI explains · code decides. Payment proves the miss was metered; evidence
        above is live Graph fan-out for this call — not a dated screenshot.
      </p>
    </div>
  );
}

function statusColor(status: string): string {
  const s = status.toUpperCase();
  if (s === "TAINTED") return "var(--block)";
  if (s === "WATCH") return "var(--warn)";
  if (s === "SAFE") return "var(--signal)";
  return "var(--ink)";
}

const eyebrow: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.1em",
  color: "var(--signal)",
};

const compactTitle: CSSProperties = {
  margin: "8px 0 0",
  fontFamily: "var(--font-display)",
  fontSize: 20,
  fontWeight: 500,
  letterSpacing: "-0.02em",
  color: "var(--ink)",
};

const muted: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 13,
  color: "var(--ink-muted)",
  lineHeight: 1.45,
};

const compactWrap: CSSProperties = {
  marginTop: 22,
  padding: "14px 16px",
  border: "1px solid color-mix(in srgb, var(--signal) 35%, var(--line))",
  borderRadius: "var(--radius-md)",
  background: "var(--surface)",
  maxWidth: 720,
};

const fullWrap: CSSProperties = {
  marginTop: 22,
  padding: "18px 18px",
  border: "1px solid color-mix(in srgb, var(--signal) 40%, var(--line))",
  borderRadius: "var(--radius-md)",
  background: "var(--surface)",
  maxWidth: 900,
};

const cell: CSSProperties = {
  padding: "12px 12px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-sm)",
};

const cellTitle: CSSProperties = {
  margin: "0 0 10px",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink-muted)",
};

const result: CSSProperties = {
  margin: "10px 0 0",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink)",
  lineHeight: 1.45,
  wordBreak: "break-all",
};

const paidBox: CSSProperties = {
  marginTop: 14,
  padding: "12px 12px",
  border: "1px solid var(--signal)",
  borderRadius: "var(--radius-sm)",
  background: "color-mix(in srgb, var(--signal) 8%, var(--surface))",
};

const filmHint: CSSProperties = {
  margin: "12px 0 0",
  fontSize: 12,
  color: "var(--ink-muted)",
  lineHeight: 1.45,
};

const dossierRule: CSSProperties = {
  margin: "14px 0",
  borderTop: "1px solid color-mix(in srgb, var(--line) 80%, transparent)",
};

const list: CSSProperties = {
  margin: "8px 0 0",
  paddingLeft: 18,
};

const listItem: CSSProperties = {
  marginBottom: 8,
  fontSize: 12,
  color: "var(--ink-muted)",
  lineHeight: 1.45,
};

const linkMono: CSSProperties = {
  display: "inline-block",
  marginTop: 8,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--signal)",
  wordBreak: "break-all",
};
