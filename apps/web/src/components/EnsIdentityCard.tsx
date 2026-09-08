"use client";

import type { CSSProperties, ReactNode } from "react";

const KEY_ROLES: Record<string, string> = {
  "saviours.status": "verdict",
  "saviours.threat": "signal",
  "saviours.confidence": "score",
  "saviours.evidenceHash": "fingerprint",
  "saviours.dossier": "proof",
  "saviours.investigator": "actor",
  "saviours.incident": "label",
  "saviours.registry": "pointer",
  "saviours.network": "network",
  "saviours.dispute": "govern",
  "saviours.plainVerdict": "story",
  "saviours.atomicTx": "story",
  "saviours.protocols": "story",
  "saviours.rulesVersion": "story",
};

const STORY_ORDER = [
  "saviours.plainVerdict",
  "saviours.atomicTx",
  "saviours.protocols",
  "saviours.rulesVersion",
];

function roleFor(key: string): string {
  return KEY_ROLES[key] ?? "text";
}

function short(v: string, n = 18): string {
  if (v.length <= n) return v;
  return `${v.slice(0, n)}…`;
}

export type EnsIdentityCardProps = {
  ensName: string;
  parentName?: string;
  hit: boolean;
  source?: string;
  records: Record<string, string>;
  permissionedResolver?: string;
  /** Compact for MEMORY HIT fold */
  compact?: boolean;
};

/**
 * ENS as the product surface: parent → address label → role-tagged keys.
 * One-line Sepolia enforcement ceiling.
 */
export function EnsIdentityCard({
  ensName,
  parentName,
  hit,
  source,
  records,
  permissionedResolver,
  compact,
}: EnsIdentityCardProps) {
  const parent =
    parentName ??
    (ensName.split(".").slice(1).join(".") || "savioursqsy56o.eth");
  const label = ensName.endsWith(`.${parent}`)
    ? ensName.slice(0, ensName.length - parent.length - 1)
    : ensName.split(".")[0] ?? ensName;
  const keys = Object.keys(records).sort((a, b) => {
    const ai = STORY_ORDER.indexOf(a);
    const bi = STORY_ORDER.indexOf(b);
    if (ai >= 0 || bi >= 0) {
      if (ai < 0) return 1;
      if (bi < 0) return -1;
      return ai - bi;
    }
    return a.localeCompare(b);
  });
  const status = records["saviours.status"];
  const plain = records["saviours.plainVerdict"];

  return (
    <div
      className="rise"
      style={{
        padding: compact ? "14px 16px" : "18px 18px",
        border: "1px solid var(--line)",
        borderRadius: 6,
        background: "rgba(255,255,255,0.55)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          color: "var(--ink-muted)",
        }}
      >
        ENS identity · Sepolia memory
      </p>

      <div style={{ marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 13 }}>
        <TreeLine depth={0}>
          <span style={{ color: "var(--ink-muted)" }}>{parent}</span>
          <span style={{ color: "var(--ink-muted)", marginLeft: 8 }}>parent</span>
        </TreeLine>
        <TreeLine depth={1}>
          <span style={{ wordBreak: "break-all" }}>{label}</span>
          <span style={{ color: "var(--ink-muted)", marginLeft: 8 }}>
            address label
          </span>
        </TreeLine>
        {hit && status ? (
          <TreeLine depth={2}>
            <span
              style={{
                color:
                  status === "TAINTED"
                    ? "var(--block)"
                    : status === "WATCH"
                      ? "var(--warn)"
                      : "var(--signal)",
                fontFamily: "var(--font-display)",
                fontSize: 20,
              }}
            >
              {status}
            </span>
            <span style={{ color: "var(--ink-muted)", marginLeft: 8 }}>
              onchain read · {source ?? "ens"}
            </span>
          </TreeLine>
        ) : (
          <TreeLine depth={2}>
            <span style={{ color: "var(--ink-muted)" }}>
              {hit ? "named · no status text" : "no ENS hit"}
            </span>
          </TreeLine>
        )}
        {plain ? (
          <TreeLine depth={3}>
            <span style={{ fontSize: 14, lineHeight: 1.4 }}>{plain}</span>
          </TreeLine>
        ) : null}
      </div>

      {!compact && keys.length > 0 ? (
        <ul
          style={{
            listStyle: "none",
            margin: "16px 0 0",
            padding: 0,
            display: "grid",
            gap: 8,
          }}
        >
          {keys.map((k) => (
            <li
              key={k}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(140px, 1fr) auto minmax(0, 2fr)",
                gap: 8,
                alignItems: "start",
                fontSize: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  wordBreak: "break-all",
                }}
              >
                {k.replace(/^saviours\./, "")}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  padding: "2px 6px",
                  border: "1px solid var(--line)",
                  borderRadius: 2,
                  color: "var(--ink-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {roleFor(k)}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink-muted)",
                  wordBreak: "break-all",
                }}
                title={records[k]}
              >
                {short(records[k] ?? "", 48)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <p
        style={{
          margin: "14px 0 0",
          fontSize: 12,
          color: "var(--ink-muted)",
          lineHeight: 1.45,
        }}
      >
        Ceiling: evidence is mainnet; memory lives on Sepolia — Shield cannot
        enforce this name on Ethereum L1 consumers yet.
      </p>
      {permissionedResolver && !compact ? (
        <p
          style={{
            margin: "6px 0 0",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--ink-muted)",
            wordBreak: "break-all",
          }}
        >
          resolver {permissionedResolver}
        </p>
      ) : null}
    </div>
  );
}

function TreeLine({
  depth,
  children,
}: {
  depth: number;
  children: ReactNode;
}) {
  const style: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    paddingLeft: depth * 14,
    marginTop: depth === 0 ? 0 : 6,
  };
  return (
    <div style={style}>
      {depth > 0 ? (
        <span style={{ color: "var(--line)", marginRight: 6 }}>└</span>
      ) : null}
      {children}
    </div>
  );
}
