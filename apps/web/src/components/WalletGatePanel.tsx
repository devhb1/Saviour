"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  parseEther,
  type Hex,
  type Address,
} from "viem";
import { sepolia } from "viem/chains";
import {
  btnGhost,
  btnPrimary,
  fieldStyle,
  DEMO_TARGETS,
} from "./AppShell";
import { VerdictCard } from "./VerdictCard";
import { Sheet } from "../ui";
import { useSavioursCheck } from "../lib/useSavioursCheck";

const TAINTED = DEMO_TARGETS[0].address as string;
const CLEAN = DEMO_TARGETS[3].address as string; // Circle treasury — never named

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

/**
 * ENDGAME Phase 3 — Real wallet gate.
 * Shield runs BEFORE eth_sendTransaction. TAINTED → MetaMask never opens.
 */
export function WalletGatePanel({
  onMemoryHit,
}: {
  onMemoryHit?: () => void;
}) {
  const [account, setAccount] = useState<Address | null>(null);
  const [recipient, setRecipient] = useState(TAINTED);
  const [amount, setAmount] = useState("0.001");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);

  const checkAddr = recipient.trim().toLowerCase();
  const { result, loading, refetch } = useSavioursCheck(
    /^0x[a-f0-9]{40}$/.test(checkAddr) ? checkAddr : null,
  );

  useEffect(() => {
    if (
      result &&
      (result.source === "ens" || result.source === "registry")
    ) {
      onMemoryHit?.();
    }
  }, [result, onMemoryHit]);

  const connect = useCallback(async () => {
    setError(null);
    if (!window.ethereum) {
      setError("No injected wallet found. Install MetaMask (or similar) and retry.");
      return;
    }
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (!accounts[0]) throw new Error("No account returned");
      setAccount(accounts[0] as Address);

      // Prefer Sepolia for the demo tx (cheap + matches memory chain story).
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }], // Sepolia
        });
      } catch (switchErr) {
        const code = (switchErr as { code?: number })?.code;
        if (code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xaa36a7",
                chainName: "Sepolia",
                nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        } else {
          throw switchErr instanceof Error
            ? switchErr
            : new Error("Switch to Sepolia to continue the wallet demo");
        }
      }
      const chainIdHex = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string;
      if (chainIdHex?.toLowerCase() !== "0xaa36a7") {
        throw new Error("Wallet is not on Sepolia — switch network and retry");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connect failed");
    }
  }, []);

  async function sendWithGate(forceOverride = false) {
    setError(null);
    setTxHash(null);
    setBlocked(false);
    setBusy(true);
    try {
      const to = recipient.trim().toLowerCase() as Address;
      if (!/^0x[a-f0-9]{40}$/.test(to)) {
        throw new Error("Need a valid 0x recipient");
      }
      if (!account || !window.ethereum) {
        throw new Error("Connect a wallet first");
      }

      const chainIdHex = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string;
      if (chainIdHex?.toLowerCase() !== "0xaa36a7") {
        throw new Error("Switch wallet to Sepolia before sending");
      }

      const check = await refetch(to);
      if (!check) throw new Error("Shield check failed");

      const shouldBlock =
        check.decision === "BLOCK" || check.decision === "WARN";

      if (shouldBlock && !forceOverride) {
        setBlocked(true);
        setOverrideOpen(true);
        return; // ← MetaMask never opens
      }

      const wallet = createWalletClient({
        account,
        chain: sepolia,
        transport: custom(window.ethereum),
      });
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
      });

      const value = parseEther(amount || "0");
      const hash = await wallet.sendTransaction({
        to,
        value,
        chain: sepolia,
      });
      setTxHash(hash);
      setOverrideOpen(false);
      // wait for inclusion (best-effort)
      try {
        await publicClient.waitForTransactionReceipt({ hash: hash as Hex });
      } catch {
        // ignore — hash is enough for the demo contrast
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rise">
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: "var(--t-floor)",
          letterSpacing: "0.1em",
          color: "var(--sig)",
        }}
      >
        WALLET GATE · PRE-SIGN
      </p>
      <h2
        style={{
          margin: "10px 0 0",
          fontFamily: "var(--font-display)",
          fontSize: "var(--t-h2)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "var(--tx-hi)",
        }}
      >
        Stop the signature before MetaMask opens.
      </h2>
      <p
        style={{
          margin: "10px 0 0",
          maxWidth: 560,
          fontSize: "var(--t-sm)",
          lineHeight: 1.5,
          color: "var(--tx-lo)",
        }}
      >
        Shield runs first. On BLOCK / WARN the wallet prompt never appears.
        Clean path still sends a real Sepolia transaction.
      </p>

      <div
        style={{
          marginTop: 22,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 0.85fr)",
          gap: 24,
          alignItems: "start",
        }}
        className="wallet-gate-grid"
      >
        <div style={{ maxWidth: 520 }}>
          {!account ? (
            <button type="button" onClick={() => void connect()} style={btnPrimary}>
              Connect wallet
            </button>
          ) : (
            <p
              style={{
                margin: "0 0 14px",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--t-floor)",
                color: "var(--safe)",
              }}
            >
              connected · {account.slice(0, 6)}…{account.slice(-4)} · Sepolia
            </p>
          )}

          <label style={labelStyle}>Recipient</label>
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            style={{ ...fieldStyle, maxWidth: "100%", marginBottom: 10 }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <Chip
              label="Known exploiter (BLOCK)"
              on={() => setRecipient(TAINTED)}
              active={recipient.toLowerCase() === TAINTED}
            />
            <Chip
              label="Clean treasury (ALLOW path)"
              on={() => setRecipient(CLEAN)}
              active={recipient.toLowerCase() === CLEAN}
            />
          </div>

          <label style={labelStyle}>Amount (ETH on Sepolia)</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ ...fieldStyle, maxWidth: 160, marginBottom: 16 }}
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={busy || !account}
              onClick={() => void sendWithGate(false)}
              style={btnPrimary}
            >
              {busy ? "Checking…" : "Send"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void refetch(checkAddr)}
              style={btnGhost}
            >
              Preview shield only
            </button>
          </div>

          {blocked ? (
            <p
              role="status"
              style={{
                marginTop: 14,
                padding: "10px 12px",
                borderLeft: "3px solid var(--block)",
                background: "color-mix(in srgb, var(--block) 8%, var(--surface))",
                fontSize: "var(--t-sm)",
                color: "var(--tx-hi)",
              }}
            >
              🛑 Intercepted. MetaMask was not opened.
            </p>
          ) : null}

          {txHash ? (
            <p
              style={{
                marginTop: 14,
                fontFamily: "var(--font-mono)",
                fontSize: "var(--t-floor)",
                color: "var(--safe)",
                wordBreak: "break-all",
              }}
            >
              Sent ·{" "}
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--sig)" }}
              >
                {txHash}
              </a>
            </p>
          ) : null}

          {error ? (
            <p role="alert" style={{ marginTop: 12, color: "var(--red)", fontSize: "var(--t-sm)" }}>
              {error}
            </p>
          ) : null}
        </div>

        <div>
          {result ? (
            <VerdictCard
              address={checkAddr}
              decision={result.decision}
              status={result.status}
              plainVerdict={
                result.reason ||
                (result.decision === "BLOCK"
                  ? "flashloan-funded same-tx drain"
                  : null)
              }
              ensName={result.ensName}
              source={result.source}
              cost={{
                graph: result.cost.graph,
                ai: result.cost.ai,
                usd: result.cost.usd,
                latencyMs: result.latencyMs,
              }}
              size="hero"
            />
          ) : (
            <div
              style={{
                minHeight: 200,
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--tx-faint)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--t-floor)",
              }}
            >
              {loading ? "Shield…" : "Pick a recipient"}
            </div>
          )}
        </div>
      </div>

      <Sheet
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        eyebrow="SAVIOURS BLOCKED THIS TRANSACTION"
        title={result?.decision === "WARN" ? "WARN — proceed carefully" : "BLOCK"}
        width={440}
      >
        {result ? (
          <VerdictCard
            address={checkAddr}
            decision={result.decision}
            status={result.status}
            plainVerdict={result.reason || "named threat memory"}
            ensName={result.ensName}
            source={result.source}
            cost={{
              graph: result.cost.graph,
              ai: result.cost.ai,
              usd: result.cost.usd,
              latencyMs: result.latencyMs,
            }}
            size="inline"
          />
        ) : null}
        <p
          style={{
            margin: "16px 0 0",
            fontSize: "var(--t-sm)",
            color: "var(--tx-lo)",
            lineHeight: 1.45,
          }}
        >
          MetaMask never opened. Override only if you accept the risk — for the
          demo, prefer the clean treasury chip to show a real send.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setOverrideOpen(false)}
            style={btnPrimary}
          >
            Keep blocked
          </button>
          <button
            type="button"
            onClick={() => void sendWithGate(true)}
            style={btnGhost}
            disabled={busy}
          >
            Override anyway
          </button>
        </div>
      </Sheet>

      <style>{`
        @media (max-width: 860px) {
          .wallet-gate-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function Chip({
  label,
  on,
  active,
}: {
  label: string;
  on: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={on}
      style={{
        ...btnGhost,
        padding: "6px 10px",
        fontSize: 12,
        borderColor: active ? "var(--sig)" : "var(--line)",
        color: active ? "var(--tx-hi)" : "var(--tx-lo)",
      }}
    >
      {label}
    </button>
  );
}

const labelStyle = {
  display: "block" as const,
  marginBottom: 6,
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-floor)",
  letterSpacing: "0.06em",
  color: "var(--tx-faint)",
};
