"use client";

import { useState } from "react";
import Link from "next/link";
import { resolveBase, toDecision } from "@saviours/check";

export default function ResolvePage() {
  const [address, setAddress] = useState("");
  const [chainId, setChainId] = useState("8453");
  const [registry, setRegistry] = useState(
    process.env.NEXT_PUBLIC_SAVIOURS_BASE_REGISTRY ?? "",
  );
  const [out, setOut] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function onResolve() {
    setBusy(true);
    try {
      if (!/^0x[a-fA-F0-9]{40}$/.test(registry)) {
        setOut(JSON.stringify({ error: "Set registry address (or NEXT_PUBLIC_SAVIOURS_BASE_REGISTRY)" }, null, 2));
        return;
      }
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        setOut(JSON.stringify({ error: "Invalid subject address" }, null, 2));
        return;
      }
      const result = await resolveBase(address as `0x${string}`, {
        registryAddress: registry as `0x${string}`,
        subjectChainId: Number(chainId),
        txChainId: Number(chainId),
        registryNetwork: "base-sepolia",
      });
      setOut(
        JSON.stringify(
          { ...result, decision: toDecision(result.action), verifiedSafe: false },
          null,
          2,
        ),
      );
    } catch (e) {
      setOut(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }, null, 2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        maxWidth: 720,
        margin: "0 auto",
        fontFamily: "ui-monospace, Menlo, monospace",
        color: "#e8eaef",
        background: "#0b0d10",
      }}
    >
      <p style={{ fontSize: 12, opacity: 0.7 }}>
        <Link href="/" style={{ color: "#7dd3a7" }}>
          Saviours
        </Link>{" "}
        · Base registry resolve
      </p>
      <h1 style={{ fontSize: 22 }}>Resolve</h1>
      <p style={{ fontSize: 13, opacity: 0.75 }}>
        Keyless eth_call path. NO_VERDICT ≠ SAFE. RPC failures surface as RPC_ERROR.
      </p>
      <label style={{ display: "block", marginTop: 16, fontSize: 12 }}>
        Registry
        <input
          value={registry}
          onChange={(e) => setRegistry(e.target.value)}
          style={inputStyle}
          placeholder="0x… SavioursRegistryV2"
        />
      </label>
      <label style={{ display: "block", marginTop: 12, fontSize: 12 }}>
        Subject chainId
        <input value={chainId} onChange={(e) => setChainId(e.target.value)} style={inputStyle} />
      </label>
      <label style={{ display: "block", marginTop: 12, fontSize: 12 }}>
        Address
        <input value={address} onChange={(e) => setAddress(e.target.value)} style={inputStyle} />
      </label>
      <button type="button" disabled={busy} onClick={onResolve} style={btnStyle}>
        {busy ? "…" : "Resolve"}
      </button>
      <pre style={preStyle}>{out || "// result"}</pre>
    </main>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  marginTop: 6,
  padding: 10,
  background: "#14181d",
  border: "1px solid #2a333c",
  color: "#e8eaef",
} as const;
const btnStyle = {
  marginTop: 16,
  padding: "10px 14px",
  background: "#1a6b4a",
  border: 0,
  color: "#fff",
  cursor: "pointer",
} as const;
const preStyle = {
  marginTop: 20,
  padding: 12,
  background: "#14181d",
  border: "1px solid #2a333c",
  fontSize: 11,
} as const;
