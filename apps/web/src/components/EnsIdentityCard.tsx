"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { formatConfidencePct } from "@saviours/core/confidence";

const IDENTITY = {
  parentName: "saviours.eth",
  userRegistry: "0x3BA6b1c9F0018cac383C17C2ACA5A4dC0F370De5",
  permissionedResolver: "0xF479306621F718F7d76875f67506ceD33717751c",
  savioursRegistry: "0x8f246dd1f7bdd6d169b3cdb77e95d4e84eaff5db",
} as const;

function short(v: string, n = 18): string {
  if (v.length <= n) return v;
  return `${v.slice(0, n)}…`;
}

function shortAddr(a: string): string {
  if (a.length < 12) return a;
  return `${a.slice(0, 8)}…${a.slice(-4)}`;
}

function statusHeadline(status: string | undefined): string {
  if (status === "TAINTED") return "THREAT VERIFIED (TAINTED)";
  if (status === "WATCH") return "UNDER WATCH";
  if (status) return status;
  return "NO STATUS RECORD";
}

export type EnsIdentityCardProps = {
  ensName: string;
  parentName?: string;
  hit: boolean;
  source?: string;
  records: Record<string, string>;
  permissionedResolver?: string;
  /**
   * Sepolia tx that wrote this name's threat records (setText / remember).
   * Verify ↗ opens this tx — not the resolver contract.
   */
  namedTx?: string | null;
  /** Compact for MEMORY HIT fold */
  compact?: boolean;
  /** Commit state for Sepolia write */
  commitState?: "idle" | "pending" | "committed" | "readonly";
  live?: boolean;
};

/**
 * ENS Security Identity passport — live resolver reads, expanders for
 * how-it-works / raw records / cast. ENS stores the finding; it does not decide it.
 */
export function EnsIdentityCard({
  ensName,
  parentName,
  hit,
  source,
  records,
  permissionedResolver,
  namedTx,
  compact,
  commitState = "idle",
  live = true,
}: EnsIdentityCardProps) {
  const [copied, setCopied] = useState(false);
  const [openHow, setOpenHow] = useState(false);
  const [openRaw, setOpenRaw] = useState(false);
  const [openCast, setOpenCast] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  useEffect(() => {
    if (!compact) setExpanded(true);
  }, [compact]);

  const parent = parentName ?? IDENTITY.parentName;
  const resolver = permissionedResolver ?? IDENTITY.permissionedResolver;
  const status = records["saviours.status"];
  const threat = records["saviours.threat"];
  const confidence = records["saviours.confidence"];
  const evidenceHash = records["saviours.evidenceHash"];
  const atomicTx = records["saviours.atomicTx"];
  const protocols = records["saviours.protocols"];
  const investigator = records["saviours.investigator"];
  const registry = records["saviours.registry"] ?? IDENTITY.savioursRegistry;
  const dispute = records["saviours.dispute"];
  const plain = records["saviours.plainVerdict"];
  const rulesVersion = records["saviours.rulesVersion"];
  const verifyTx =
    (namedTx && /^0x[a-fA-F0-9]{64}$/.test(namedTx) ? namedTx : null) ??
    (records["saviours.namedTx"] &&
    /^0x[a-fA-F0-9]{64}$/.test(records["saviours.namedTx"])
      ? records["saviours.namedTx"]
      : null);
  const verifyHref = verifyTx
    ? `https://sepolia.etherscan.io/tx/${verifyTx}`
    : `https://sepolia.etherscan.io/address/${IDENTITY.userRegistry}`;
  const verifyTitle = verifyTx
    ? "Open the Sepolia tx that wrote this name’s text records"
    : "Open UserRegistry (named write tx not found yet)";
  const incident = records["saviours.incident"];

  const castCmd = useMemo(
    () =>
      `cast call ${resolver} \\\n  "text(bytes32,string)(string)" \\\n  $(cast namehash ${ensName}) \\\n  "saviours.status"`,
    [ensName, resolver],
  );

  const keys = Object.keys(records).sort();

  async function copyName() {
    try {
      await navigator.clipboard.writeText(ensName);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  const statusColor =
    status === "TAINTED"
      ? "var(--block)"
      : status === "WATCH"
        ? "var(--warn)"
        : "var(--ink-muted)";

  return (
    <div
      className="rise"
      style={{
        padding: compact ? "16px 18px" : "22px 20px",
        border: `2px solid ${
          hit && status === "TAINTED"
            ? "var(--block)"
            : hit
              ? "var(--signal)"
              : "var(--line)"
        }`,
        borderRadius: "var(--radius-md)",
        background: hit
          ? "color-mix(in srgb, var(--signal-wash) 80%, var(--surface))"
          : "var(--surface)",
        isolation: "isolate",
        boxShadow: hit
          ? "0 0 0 1px color-mix(in srgb, var(--signal) 18%, transparent)"
          : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "baseline",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.1em",
            color: "var(--signal)",
          }}
        >
          ENS SECURITY IDENTITY · PASSPORT
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: live ? "var(--signal)" : "var(--ink-muted)",
          }}
        >
          Sepolia · {live ? "live" : "cached"}
          {commitState === "pending" ? " · committing…" : ""}
          {commitState === "committed" ? " · committed" : ""}
          {commitState === "readonly" ? " · read-only host" : ""}
        </p>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: compact ? 15 : 18,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            wordBreak: "break-all",
            flex: "1 1 220px",
            color: "var(--ink)",
            lineHeight: 1.35,
          }}
        >
          {ensName}
        </p>
        <button type="button" onClick={() => void copyName()} style={miniBtn}>
          {copied ? "Copied" : "Copy"}
        </button>
        <a
          href={verifyHref}
          target="_blank"
          rel="noreferrer"
          title={verifyTitle}
          style={{ ...miniBtn, textDecoration: "none" }}
        >
          Verify ↗
        </a>
      </div>

      {!hit ? (
        <p style={{ margin: "14px 0 0", color: "var(--ink-muted)", fontSize: 14 }}>
          No ENS hit — absence of a name means no verified threat memory, never
          “endorsed safe.”
        </p>
      ) : compact && !expanded ? (
        <>
          <p
            style={{
              margin: "12px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: 26,
              fontWeight: 500,
              color: statusColor,
              letterSpacing: "-0.02em",
            }}
          >
            {statusHeadline(status)}
          </p>
          {confidence ? (
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ink-muted)" }}>
              Confidence {formatConfidencePct(Number(confidence))}
              {threat ? ` · ${threat.split(/[|,]/)[0]}` : ""}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            style={{ ...miniBtn, marginTop: 12 }}
          >
            Expand passport ▾
          </button>
        </>
      ) : (
        <>
          {compact ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              style={{ ...miniBtn, marginTop: 10, marginBottom: 4 }}
            >
              Collapse ▴
            </button>
          ) : null}
          <PassportRow label="STATUS">
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: compact ? 20 : 24,
                fontWeight: 500,
                color: statusColor,
              }}
            >
              {statusHeadline(status)}
            </span>
          </PassportRow>
          {threat ? (
            <PassportRow label="THREAT">{threat.replace(/_/g, " · ")}</PassportRow>
          ) : null}
          {confidence ? (
            <PassportRow label="CONFIDENCE">
              {formatConfidencePct(Number(confidence))}
              {rulesVersion ? ` · rules ${rulesVersion}` : ""}
            </PassportRow>
          ) : null}
          {evidenceHash ? (
            <PassportRow label="EVIDENCE">
              hash {short(evidenceHash, 14)}
              {incident ? ` · ${incident}` : ""}
            </PassportRow>
          ) : null}
          {atomicTx ? (
            <PassportRow label="ATOMIC TX">
              <a
                href={`https://etherscan.io/tx/${atomicTx}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--signal)", fontFamily: "var(--font-mono)", fontSize: 12 }}
              >
                {shortAddr(atomicTx)} ↗
              </a>
            </PassportRow>
          ) : null}
          {protocols ? (
            <PassportRow label="PROTOCOLS">{protocols}</PassportRow>
          ) : null}
          {investigator ? (
            <PassportRow label="INVESTIGATOR">{investigator}</PassportRow>
          ) : null}
          <PassportRow label="REGISTRY">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
              {shortAddr(registry)}
            </span>
          </PassportRow>
          {dispute ? (
            <PassportRow label="DISPUTE">{dispute}</PassportRow>
          ) : (
            <PassportRow label="DISPUTE">none</PassportRow>
          )}
          {plain && !compact ? (
            <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.45 }}>{plain}</p>
          ) : null}
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12,
              color: "var(--ink-muted)",
            }}
          >
            onchain read · source={source ?? "ens"}
          </p>
        </>
      )}

      {(!compact || expanded) && hit ? (
        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Expander
            open={openHow}
            onToggle={() => setOpenHow((v) => !v)}
            label="How this name works"
          >
            <HowThisNameWorks
              parent={parent}
              userRegistry={IDENTITY.userRegistry}
              resolver={resolver}
              registry={registry}
            />
          </Expander>
          <Expander
            open={openRaw}
            onToggle={() => setOpenRaw((v) => !v)}
            label={`Raw records (${keys.length})`}
          >
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
              {keys.map((k) => (
                <li
                  key={k}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    wordBreak: "break-all",
                    color: "var(--ink-muted)",
                  }}
                >
                  <span style={{ color: "var(--ink)" }}>{k.replace(/^saviours\./, "")}</span>
                  {" · "}
                  {short(records[k] ?? "", 56)}
                </li>
              ))}
            </ul>
          </Expander>
          <Expander
            open={openCast}
            onToggle={() => setOpenCast((v) => !v)}
            label="Read it yourself (cast)"
          >
            <pre style={castPre}>{castCmd}</pre>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ink-muted)" }}>
              None of our Next code runs — any RPC client can verify.
            </p>
          </Expander>
        </div>
      ) : null}

      <p
        style={{
          margin: "14px 0 0",
          fontSize: 12,
          color: "var(--ink-muted)",
          lineHeight: 1.45,
        }}
      >
        ENS stores the finding; it does not decide it. Evidence is mainnet Graph;
        memory is Sepolia ENSv2 (beta).
      </p>
    </div>
  );
}

function PassportRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "110px minmax(0, 1fr)",
        gap: 10,
        marginTop: 10,
        alignItems: "baseline",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.06em",
          color: "var(--ink-muted)",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13, wordBreak: "break-word" }}>{children}</span>
    </div>
  );
}

function Expander({
  open,
  onToggle,
  label,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={{ width: "100%" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          ...miniBtn,
          width: "100%",
          textAlign: "left",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
        }}
      >
        {open ? "▾" : "▸"} {label}
      </button>
      {open ? <div style={{ marginTop: 10, paddingLeft: 4 }}>{children}</div> : null}
    </div>
  );
}

function HowThisNameWorks({
  parent,
  userRegistry,
  resolver,
  registry,
}: {
  parent: string;
  userRegistry: string;
  resolver: string;
  registry: string;
}) {
  return (
    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.6 }}>
      <TreeLine depth={0}>
        {parent} <Muted>parent</Muted>
      </TreeLine>
      <TreeLine depth={1}>
        UserRegistry {shortAddr(userRegistry)} <Muted>subregistry</Muted>
      </TreeLine>
      <TreeLine depth={2}>
        PermissionedResolver {shortAddr(resolver)} <Muted>text records</Muted>
      </TreeLine>
      <TreeLine depth={3}>
        SavioursRegistry {shortAddr(registry)} <Muted>append-only</Muted>
      </TreeLine>
      <p style={{ margin: "10px 0 0", color: "var(--ink-muted)", fontSize: 12 }}>
        Roles (EAC): Relayer · root/unregister/renew · Investigator · verdict texts +
        REGISTRAR · Disputer · status + dispute only. Caps in code — not
        decentralization.
      </p>
    </div>
  );
}

function TreeLine({ depth, children }: { depth: number; children: ReactNode }) {
  return (
    <div style={{ paddingLeft: depth * 12, marginTop: depth === 0 ? 0 : 4 }}>
      {depth > 0 ? <span style={{ color: "var(--line)", marginRight: 6 }}>└</span> : null}
      {children}
    </div>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <span style={{ color: "var(--ink-muted)", marginLeft: 6 }}>{children}</span>;
}

const miniBtn: CSSProperties = {
  padding: "6px 10px",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-sm)",
  background: "var(--bg-high)",
  color: "var(--ink)",
  fontFamily: "var(--font-body)",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
};

const castPre: CSSProperties = {
  margin: 0,
  padding: 12,
  background: "var(--bg-inset)",
  color: "var(--tx)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-sm)",
  overflow: "auto",
  fontSize: 11,
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
};
