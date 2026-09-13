"use client";

import { useState, type CSSProperties } from "react";
import { createPublicClient, http, type Hex } from "viem";
import { namehash } from "viem/ens";
import { sepolia } from "viem/chains";
import { HERO_CAST_PILL } from "../lib/productStory";

const RESOLVER = "0xF479306621F718F7d76875f67506ceD33717751c" as Hex;
const PUBLIC_RPC = "https://ethereum-sepolia-rpc.publicnode.com";

const textAbi = [
  {
    name: "text",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

/**
 * Kill-switch proof — public Sepolia RPC read of saviours.status.
 * Hero: featured sell beat. Chrome: compact live control.
 * Dock: Hook fold — sits under the verdict without stretching the column.
 */
export function HeroCastPill({
  address,
  compact = false,
  dock = false,
}: {
  address: string;
  compact?: boolean;
  /** Tight row under Hook verdict — avoids the tall hero card gap. */
  dock?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [ms, setMs] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const a = address.trim().toLowerCase();
  const ensName = /^0x[a-f0-9]{40}$/.test(a) ? `${a}.saviours.eth` : null;
  const castHint = ensName
    ? `cast call ${RESOLVER} "text(bytes32,string)" $(cast namehash ${ensName}) "saviours.status" --rpc-url ${PUBLIC_RPC}`
    : null;

  async function tryCast() {
    if (!ensName) {
      setErr("Need a 0x address");
      return;
    }
    setBusy(true);
    setErr(null);
    setStatus(null);
    setCopied(false);
    const t0 = performance.now();
    try {
      const node = namehash(ensName) as Hex;
      const client = createPublicClient({
        chain: sepolia,
        transport: http(PUBLIC_RPC),
      });
      const raw = await client.readContract({
        address: RESOLVER,
        abi: textAbi,
        functionName: "text",
        args: [node, "saviours.status"],
      });
      setStatus((raw || "UNKNOWN").toString());
      setMs(Math.round(performance.now() - t0));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sepolia RPC failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyCast() {
    if (!castHint) return;
    try {
      await navigator.clipboard.writeText(castHint);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  const statusColor =
    status === "TAINTED"
      ? "var(--red)"
      : status === "WATCH"
        ? "var(--amber)"
        : "var(--tx-hi)";

  if (compact) {
    return (
      <div className="cast-pill-chrome" style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => void tryCast()}
          disabled={busy}
          title={`${HERO_CAST_PILL} · Public Sepolia RPC · no Saviours server`}
          className={busy ? undefined : "cast-pill-pulse"}
          style={chromeBtn}
        >
          <span aria-hidden className="cast-pill-dot" />
          <span className="cast-pill-chrome-label">
            {busy ? "Reading…" : "CAST"}
          </span>
          {!busy ? (
            <span className="cast-pill-chrome-sub" aria-hidden>
              IF WE DIE
            </span>
          ) : null}
        </button>
        {status || err ? (
          <div
            role={err ? "alert" : "status"}
            className="stamp-in"
            style={chromePopover}
          >
            {err ? (
              <span style={{ color: "var(--red)" }}>{err}</span>
            ) : (
              <>
                <span style={{ color: "var(--tx-faint)" }}>saviours.status = </span>
                <strong style={{ color: statusColor }}>{status}</strong>
                {ms != null ? (
                  <span style={{ color: "var(--tx-faint)", display: "block", marginTop: 2 }}>
                    {ms}ms · public RPC · no our server
                  </span>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  if (dock) {
    return (
      <div className="cast-pill-dock">
        <div style={dockRow}>
          <div style={{ minWidth: 0, flex: "1 1 auto" }}>
            <p style={dockEyebrow}>KILL SWITCH · LIVE PROOF</p>
            <p style={dockTitle}>{HERO_CAST_PILL}</p>
          </div>
          <button
            type="button"
            onClick={() => void tryCast()}
            disabled={busy}
            className={busy ? undefined : "cast-pill-pulse"}
            style={dockBtn}
          >
            {busy ? "Reading…" : "Try it →"}
          </button>
        </div>
        {status || err ? (
          <p
            role={err ? "alert" : "status"}
            className="stamp-in"
            style={dockResult}
          >
            {err ? (
              <span style={{ color: "var(--red)" }}>{err}</span>
            ) : (
              <>
                <span style={{ color: "var(--tx-faint)" }}>saviours.status = </span>
                <strong style={{ color: statusColor }}>{status}</strong>
                {ms != null ? (
                  <span style={{ color: "var(--tx-faint)" }}> · {ms}ms · public RPC</span>
                ) : null}
              </>
            )}
          </p>
        ) : (
          <p style={dockHint}>
            Public Sepolia · no Saviours API — works if we die
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="cast-pill-hero" style={heroWrap}>
      <div style={heroTop}>
        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
          <p style={heroEyebrow}>KILL SWITCH · LIVE PROOF</p>
          <p style={heroTitle}>{HERO_CAST_PILL}</p>
          <p style={heroSub}>
            Public Sepolia RPC · PermissionedResolver · no Saviours API in the path
          </p>
        </div>
        <button
          type="button"
          onClick={() => void tryCast()}
          disabled={busy}
          className={busy ? undefined : "cast-pill-pulse"}
          style={heroBtn}
        >
          {busy ? (
            <span className="pending-pulse">Reading Sepolia…</span>
          ) : (
            <>
              Try it <span aria-hidden>→</span>
            </>
          )}
        </button>
      </div>

      {status || err ? (
        <div
          role={err ? "alert" : "status"}
          className="stamp-in"
          style={{
            ...heroResult,
            borderColor: err
              ? "color-mix(in srgb, var(--red) 45%, var(--line))"
              : "color-mix(in srgb, var(--safe) 40%, var(--line))",
          }}
        >
          {err ? (
            <p style={{ margin: 0, color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
              {err}
            </p>
          ) : (
            <>
              <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: 1.4 }}>
                <span style={{ color: "var(--tx-faint)" }}>saviours.status = </span>
                <strong style={{ color: statusColor, fontSize: 15, letterSpacing: "0.02em" }}>
                  {status}
                </strong>
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--tx-lo)",
                }}
              >
                {ms != null ? `${ms}ms` : "—"} · public Sepolia · we are not in this path
              </p>
              {ensName ? (
                <p
                  style={{
                    margin: "8px 0 0",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--tx-faint)",
                    wordBreak: "break-all",
                  }}
                >
                  {ensName}
                </p>
              ) : null}
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button type="button" onClick={() => void copyCast()} style={copyBtn}>
                  {copied ? "Copied cast call" : "Copy cast call"}
                </button>
                <span
                  style={{
                    alignSelf: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.04em",
                    color: "var(--safe)",
                  }}
                >
                  WORKS IF WE DIE ✓
                </span>
              </div>
            </>
          )}
        </div>
      ) : (
        <p style={heroIdleHint}>
          Try it — ENS text is the API. Same read any agent can cast.
        </p>
      )}
    </div>
  );
}

const chromeBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.05em",
  color: "var(--safe, var(--green))",
  border: "1.5px solid color-mix(in srgb, var(--safe) 65%, var(--line))",
  borderRadius: 999,
  padding: "5px 10px",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--safe) 18%, var(--bg-raise)), color-mix(in srgb, var(--safe) 8%, var(--bg-inset)))",
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow: "0 0 0 2px color-mix(in srgb, var(--safe) 10%, transparent)",
};

const chromePopover: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  zIndex: 50,
  minWidth: 220,
  padding: "8px 10px",
  background: "var(--bg-raise)",
  border: "1px solid color-mix(in srgb, var(--safe) 35%, var(--line))",
  borderRadius: 8,
  boxShadow: "var(--lift)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  lineHeight: 1.35,
  color: "var(--tx-lo)",
};

const dockRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const dockEyebrow: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.1em",
  color: "var(--safe)",
  fontWeight: 600,
};

const dockTitle: CSSProperties = {
  margin: "2px 0 0",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.03em",
  color: "var(--tx-hi)",
  lineHeight: 1.2,
};

const dockBtn: CSSProperties = {
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.03em",
  color: "#062214",
  background: "var(--safe, var(--green))",
  border: "none",
  borderRadius: 999,
  padding: "7px 12px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const dockResult: CSSProperties = {
  margin: "8px 0 0",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  lineHeight: 1.35,
  color: "var(--tx-lo)",
};

const dockHint: CSSProperties = {
  margin: "6px 0 0",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "var(--tx-faint)",
  lineHeight: 1.35,
};

const heroWrap: CSSProperties = {
  width: "100%",
  maxWidth: 520,
  marginTop: 0,
  padding: "12px 14px",
  borderRadius: 10,
  border: "1.5px solid color-mix(in srgb, var(--safe) 55%, var(--line))",
  background:
    "linear-gradient(145deg, color-mix(in srgb, var(--safe) 12%, var(--bg-raise)) 0%, var(--bg-raise) 55%)",
  boxShadow: "0 0 0 4px color-mix(in srgb, var(--safe) 10%, transparent)",
};

const heroTop: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const heroEyebrow: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.12em",
  color: "var(--safe)",
  fontWeight: 600,
};

const heroTitle: CSSProperties = {
  margin: "3px 0 0",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.04em",
  color: "var(--tx-hi)",
  lineHeight: 1.25,
};

const heroSub: CSSProperties = {
  margin: "3px 0 0",
  fontSize: 11,
  lineHeight: 1.35,
  color: "var(--tx-lo)",
  maxWidth: 300,
};

const heroBtn: CSSProperties = {
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.03em",
  color: "#062214",
  background: "var(--safe, var(--green))",
  border: "none",
  borderRadius: 999,
  padding: "10px 16px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const heroResult: CSSProperties = {
  marginTop: 12,
  padding: "12px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  background: "var(--bg-raise)",
};

const heroIdleHint: CSSProperties = {
  margin: "8px 0 0",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--tx-faint)",
  lineHeight: 1.35,
};

const copyBtn: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid var(--line)",
  background: "var(--bg-inset)",
  color: "var(--tx-hi)",
  cursor: "pointer",
};
