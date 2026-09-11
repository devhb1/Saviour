"use client";

import { useState, type CSSProperties } from "react";
import { createPublicClient, http, type Hex } from "viem";
import { namehash } from "viem/ens";
import { sepolia } from "viem/chains";
import { Badge, Button, Label } from "../ui";

const RESOLVER = "0xF479306621F718F7d76875f67506ceD33717751c" as Hex;
const PARENT = "saviours.eth";
/** Public Sepolia RPC — no SAVIOURS host in the path. */
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

type Result = {
  ensName: string;
  status: string;
  threat?: string;
  evidenceHash?: string;
  latencyMs: number;
  rpc: string;
};

/**
 * Kill-switch proof: read saviours.status via public Sepolia RPC + viem.
 * Does not call any /api/* route — proves memory works if our app is offline.
 */
export function KillSwitchProof({
  address,
}: {
  address: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [apiDisabled, setApiDisabled] = useState(false);

  async function prove() {
    const a = address.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(a)) {
      setError("Need a 0x address");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    const t0 = performance.now();
    try {
      if (apiDisabled) {
        // Soft guard: refuse fetch to our origin APIs during this proof.
        const orig = window.fetch.bind(window);
        window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input);
          if (url.includes("/api/")) {
            throw new Error("SAVIOURS API disabled for kill-switch proof");
          }
          return orig(input, init);
        }) as typeof fetch;
        try {
          await readEns(a, t0);
        } finally {
          window.fetch = orig;
        }
      } else {
        await readEns(a, t0);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "ENS read failed");
    } finally {
      setBusy(false);
    }
  }

  async function readEns(a: string, t0: number) {
    const ensName = `${a}.${PARENT}`;
    const node = namehash(ensName) as Hex;
    const client = createPublicClient({
      chain: sepolia,
      transport: http(PUBLIC_RPC),
    });
    const status = await client.readContract({
      address: RESOLVER,
      abi: textAbi,
      functionName: "text",
      args: [node, "saviours.status"],
    });
    const [threat, evidenceHash] = await Promise.all([
      client.readContract({
        address: RESOLVER,
        abi: textAbi,
        functionName: "text",
        args: [node, "saviours.threat"],
      }),
      client.readContract({
        address: RESOLVER,
        abi: textAbi,
        functionName: "text",
        args: [node, "saviours.evidenceHash"],
      }),
    ]);
    setResult({
      ensName,
      status: status || "UNKNOWN",
      threat: threat || undefined,
      evidenceHash: evidenceHash || undefined,
      latencyMs: Math.round(performance.now() - t0),
      rpc: PUBLIC_RPC,
    });
  }

  const cast = result
    ? `cast call ${RESOLVER} \\\n  "text(bytes32,string)(string)" \\\n  $(cast namehash ${result.ensName}) \\\n  "saviours.status" \\\n  --rpc-url ${PUBLIC_RPC}`
    : "";

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
        <Label>KILL-SWITCH · NO OUR SERVER</Label>
        <Badge status="HIT">PUBLIC RPC</Badge>
      </div>
      <p style={muted}>
        Read <code style={{ color: "var(--sig-hi)" }}>saviours.status</code> from
        Sepolia with viem in this browser. Path: PermissionedResolver → public RPC.
        saviour API not contacted.
      </p>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
        }}
      >
        <Button onClick={() => void prove()} disabled={busy}>
          {busy ? "Reading Sepolia…" : "Prove it works without us →"}
        </Button>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "var(--tx-lo)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={apiDisabled}
            onChange={(e) => setApiDisabled(e.target.checked)}
          />
          Disable /api/* for this proof
        </label>
      </div>

      {error ? (
        <p role="alert" style={{ marginTop: 12, color: "var(--red)", fontSize: 13 }}>
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="stamp-in" style={resultBox}>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 500,
              color:
                result.status === "TAINTED"
                  ? "var(--red)"
                  : result.status === "WATCH"
                    ? "var(--amber)"
                    : "var(--tx-hi)",
            }}
          >
            {result.status || "UNKNOWN"}
          </p>
          <p style={{ margin: "8px 0 0", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--tx)", wordBreak: "break-all" }}>
            {result.ensName}
          </p>
          {result.threat ? (
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--tx-lo)" }}>
              {result.threat}
            </p>
          ) : null}
          <p
            style={{
              margin: "12px 0 0",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--green)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            saviour API not contacted · {result.latencyMs}ms · {result.rpc}
          </p>
          <pre style={pre}>{cast}</pre>
          <Button
            variant="ghost"
            size="sm"
            style={{ marginTop: 8 }}
            onClick={() => void navigator.clipboard.writeText(cast)}
          >
            Copy cast
          </Button>
        </div>
      ) : null}
    </aside>
  );
}

const wrap: CSSProperties = {
  marginTop: 22,
  padding: "16px 16px",
  border: "1px solid var(--green-line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-raise)",
  boxShadow: "var(--edge)",
};

const muted: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 13,
  color: "var(--tx-lo)",
  lineHeight: 1.45,
};

const resultBox: CSSProperties = {
  marginTop: 14,
  padding: "14px 14px",
  border: "1px solid var(--green-line)",
  borderRadius: "var(--r-sm)",
  background: "var(--green-wash)",
};

const pre: CSSProperties = {
  margin: "12px 0 0",
  padding: 12,
  background: "var(--bg-inset)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-sm)",
  color: "var(--tx)",
  fontSize: 11,
  lineHeight: 1.45,
  overflow: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};
