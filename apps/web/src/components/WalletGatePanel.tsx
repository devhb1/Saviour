"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  createPublicClient,
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
import { useSavioursCheck, type SavioursCheckResult } from "../lib/useSavioursCheck";
import {
  DEMO_PAY_CAP,
  assertDemoPayAllowedClient,
  readDemoPaysUsedClient,
  remainingPays,
  writeDemoPaysUsedClient,
} from "../lib/demoPayBudget";

const TAINTED = DEMO_TARGETS[0].address as string;
const CLEAN = DEMO_TARGETS[3].address as string; // Circle treasury — never named
/** Empty miss — no Graph signal → paid investigate → UNKNOWN. */
const MISS = "0x1111111111111111111111111111111111111113";
/**
 * Catalog threat that failed bulk-name (not on our Sepolia ENS yet).
 * Good film: shield miss → agent pays Base → Graph TAINTED → BLOCK.
 */
const UNNAMED_THREAT = "0x24354d31bc9d90f62fe5f2454709c32049cf866b"; // CREAM-1

type DemoLane =
  | "force_fresh" // ATTACK-1 · always pay+investigate then verdict
  | "unnamed_threat" // not on our ENS · pay path · expect BLOCK
  | "miss" // empty address · pay · UNKNOWN/ALLOW
  | "memory" // named · $0
  | "clean"; // Sepolia only

type FilmStep =
  | "idle"
  | "shield"
  | "memory_hit"
  | "paying"
  | "paid"
  | "verdict"
  | "mm_ready";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
      providers?: Array<{
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
        isMetaMask?: boolean;
      }>;
    };
  }
}

function injectedProvider(): NonNullable<Window["ethereum"]> | null {
  const eth = window.ethereum;
  if (!eth) return null;
  const list = eth.providers;
  if (Array.isArray(list) && list.length > 0) {
    return (list.find((p) => p.isMetaMask) ?? list[0] ?? eth) as NonNullable<
      Window["ethereum"]
    >;
  }
  return eth;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * Wallet gate — two rails, never confused:
 * 1) Sepolia 0.001 ETH = the user transfer being gated (MetaMask).
 * 2) Base ~$0.01 USDC = the agent/wallet pays Bazantic to investigate a miss.
 *
 * Film order on miss: pay receipt (Basescan) → THEN verdict. Never reverse.
 */
export function WalletGatePanel({
  onMemoryHit,
  dense = false,
}: {
  onMemoryHit?: () => void;
  /** Playground live film — lanes + film above the fold. */
  dense?: boolean;
}) {
  const [account, setAccount] = useState<Address | null>(null);
  /** Default: force-fresh ATTACK-1 so demo shows pay → BLOCK (not empty miss ALLOW). */
  const [recipient, setRecipient] = useState(TAINTED);
  const [lane, setLane] = useState<DemoLane>("force_fresh");
  const [amount, setAmount] = useState("0.001");
  const [shieldBusy, setShieldBusy] = useState(false);
  const [mmBusy, setMmBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [awaitingMmClick, setAwaitingMmClick] = useState(false);
  /** Verdict only after film reaches "verdict" — never during pay. */
  const [gateResult, setGateResult] = useState<SavioursCheckResult | null>(null);
  const [film, setFilm] = useState<FilmStep>("idle");
  const [payNote, setPayNote] = useState<string | null>(null);
  const [payTx, setPayTx] = useState<string | null>(null);
  const [payExplorer, setPayExplorer] = useState<string | null>(null);
  const [paySettlement, setPaySettlement] = useState<string | null>(null);
  const [shieldNote, setShieldNote] = useState<string | null>(null);
  const [demoPaysUsed, setDemoPaysUsed] = useState(0);

  const checkAddr = recipient.trim().toLowerCase();
  const { loading, refetch } = useSavioursCheck(null);
  const bumpedKey = useRef<string | null>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    setDemoPaysUsed(readDemoPaysUsedClient());
  }, []);

  useEffect(() => {
    setGateResult(null);
    setBlocked(false);
    setOverrideOpen(false);
    setAwaitingMmClick(false);
    setTxHash(null);
    setFilm("idle");
    setPayNote(null);
    setPayTx(null);
    setPayExplorer(null);
    setPaySettlement(null);
    setShieldNote(null);
    bumpedKey.current = null;
  }, [checkAddr]);

  const connect = useCallback(async () => {
    setError(null);
    const provider = injectedProvider();
    if (!provider) {
      setError("No injected wallet found. Install MetaMask (or similar) and retry.");
      return;
    }
    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (!accounts[0]) throw new Error("No account returned");
      setAccount(accounts[0] as Address);

      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }],
        });
      } catch (switchErr) {
        const code = (switchErr as { code?: number })?.code;
        if (code === 4902) {
          try {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0xaa36a7",
                  chainName: "Sepolia",
                  nativeCurrency: {
                    name: "Sepolia ETH",
                    symbol: "ETH",
                    decimals: 18,
                  },
                  rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
                  blockExplorerUrls: ["https://sepolia.etherscan.io"],
                },
              ],
            });
          } catch {
            // user rejected
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connect failed";
      if (/origin/i.test(msg)) {
        setError(
          "MetaMask UI glitch (origin). Reload MetaMask · stay on Sepolia · reconnect.",
        );
      } else {
        setError(msg);
      }
    }
  }, []);

  /** First await MUST be eth_sendTransaction (preserve click gesture). */
  async function openMetaMaskSend() {
    if (sendingRef.current) {
      setError("MetaMask already open — click the fox icon in the toolbar.");
      return;
    }
    sendingRef.current = true;
    setMmBusy(true);
    setError(null);
    setAwaitingMmClick(false);
    try {
      const to = recipient.trim().toLowerCase() as Address;
      if (!/^0x[a-f0-9]{40}$/.test(to)) throw new Error("Need a valid 0x recipient");
      const provider = injectedProvider();
      if (!account || !provider) throw new Error("Connect a wallet first");

      const value = parseEther(amount || "0");
      const hash = (await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to,
            value: `0x${value.toString(16)}` as Hex,
            chainId: "0xaa36a7",
          },
        ],
      })) as string;

      setTxHash(hash);
      setOverrideOpen(false);
      setBlocked(false);

      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
      });
      try {
        await publicClient.waitForTransactionReceipt({ hash: hash as Hex });
      } catch {
        // hash is enough
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Send failed";
      if (/chain|network|aa36a7|sepolia/i.test(msg)) {
        setError("Switch MetaMask to Sepolia, then click Open MetaMask again.");
        setAwaitingMmClick(true);
      } else if (/rejected|denied|cancel/i.test(msg)) {
        setError("Send cancelled in MetaMask.");
      } else if (/origin/i.test(msg)) {
        setError(
          "MetaMask glitch — reload the extension, stay on Sepolia, click Open MetaMask.",
        );
        setAwaitingMmClick(true);
      } else {
        setError(msg);
        setAwaitingMmClick(true);
      }
    } finally {
      sendingRef.current = false;
      setMmBusy(false);
    }
  }

  type PayJson = {
    ok?: boolean;
    error?: string;
    detail?: string;
    note?: string;
    settlement?: string;
    transaction?: string | null;
    explorerUrl?: string | null;
    amountUsd?: string | null;
    payer?: string | null;
    assessmentStatus?: string | null;
    body?: {
      assessment?: { status?: string; explanation?: string };
      cost?: { graphQueries?: number; aiCalls?: number; latencyMs?: number };
      explanation?: string;
    };
  };

  /** Agent pays Bazantic on Base → show receipt → THEN return assessment (no verdict yet). */
  async function settleAgentInvestigate(to: Address): Promise<{
    result: SavioursCheckResult;
    json: PayJson;
  }> {
    assertDemoPayAllowedClient();
    setFilm("paying");
    setGateResult(null);
    setPayNote("Agent grant → Bazantic · ~$0.01 USDC on Base (not your MetaMask)…");
    setPayTx(null);
    setPayExplorer(null);
    setPaySettlement(null);

    const res = await fetch("/api/bazantic/pay-investigate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        chainId: 1,
        address: to,
        persist: false,
        forceFresh: true,
        registryNetwork: "sepolia",
      }),
    });
    const json = (await res.json()) as PayJson & {
      demoPaysUsed?: number;
      demoPaysRemaining?: number;
    };
    if (typeof json.demoPaysUsed === "number") {
      writeDemoPaysUsedClient(json.demoPaysUsed);
      setDemoPaysUsed(json.demoPaysUsed);
    }
    if (!res.ok || json.ok === false) {
      throw new Error(
        json.error || json.detail || `Bazantic pay failed (HTTP ${res.status})`,
      );
    }

    const status = (
      json.assessmentStatus ||
      json.body?.assessment?.status ||
      ""
    ).toUpperCase();
    const graph = json.body?.cost?.graphQueries ?? 0;
    const ai = json.body?.cost?.aiCalls ?? 0;
    const latencyMs = json.body?.cost?.latencyMs;
    const isJwt = json.settlement === "developer-jwt";

    setPayTx(json.transaction ?? null);
    setPayExplorer(
      json.explorerUrl ??
        (json.transaction ? `https://basescan.org/tx/${json.transaction}` : null),
    );
    setPaySettlement(json.settlement ?? null);
    setPayNote(
      isJwt
        ? `Step 1 · JWT unlock (no Basescan tx on this host) · ${json.note ?? "set grant for real Base settle"}`
        : `Step 1 · Agent paid ${json.amountUsd ?? "0.01"} USDC on Base · payer ${
            json.payer ? `${json.payer.slice(0, 6)}…` : "grant"
          }`,
    );
    setFilm("paid");
    // Hold so judges see the Base receipt BEFORE verdict
    await sleep(json.transaction ? 1400 : 900);

    const decision: SavioursCheckResult["decision"] =
      status === "TAINTED"
        ? "BLOCK"
        : status === "WATCH"
          ? "WARN"
          : status === "SAFE" || status === "CLEAR"
            ? "ALLOW"
            : status === "UNKNOWN"
              ? "ALLOW" // no known threat after paid look — still not an endorsement
              : status
                ? "ALLOW"
                : "ESCALATE";

    // Prefer real settle amount; never show $0 when Basescan tx exists
    const paidUsd = Number(json.amountUsd);
    const usd = isJwt
      ? 0
      : Number.isFinite(paidUsd) && paidUsd > 0
        ? paidUsd
        : json.transaction
          ? 0.01
          : 0.01;

    return {
      json,
      result: {
        decision,
        status: status || "UNKNOWN",
        ensName: null,
        source: "none",
        reason:
          json.body?.assessment?.explanation ||
          json.body?.explanation ||
          `Paid investigate → ${status || "UNKNOWN"}`,
        latencyMs,
        usedAi: true,
        cost: { graph, ai, usd },
      },
    };
  }

  function pickLane(next: DemoLane, addr: string) {
    setLane(next);
    setRecipient(addr);
  }

  function revealVerdict(check: SavioursCheckResult) {
    setFilm("verdict");
    setGateResult(check);
    if (check.decision === "BLOCK" || check.decision === "WARN") {
      setBlocked(true);
      setOverrideOpen(true);
      return;
    }
    // ALLOW / clear → open Sepolia MetaMask automatically (best-effort;
    // if the browser blocks it, Open MetaMask button stays as fallback).
    setFilm("mm_ready");
    setAwaitingMmClick(true);
    void openMetaMaskSend();
  }

  async function sendWithGate() {
    if (sendingRef.current || shieldBusy || mmBusy) return;
    setError(null);
    setTxHash(null);
    setBlocked(false);
    setOverrideOpen(false);
    setAwaitingMmClick(false);
    setGateResult(null);
    setPayNote(null);
    setPayTx(null);
    setPayExplorer(null);
    setPaySettlement(null);
    setShieldNote(null);
    setShieldBusy(true);
    setFilm("shield");
    try {
      const to = recipient.trim().toLowerCase() as Address;
      if (!/^0x[a-f0-9]{40}$/.test(to)) {
        throw new Error("Need a valid 0x recipient");
      }
      if (!account) throw new Error("Connect a wallet first");

      // Clean contrast: Sepolia send only
      if (lane === "clean" || to === CLEAN.toLowerCase()) {
        setShieldNote("Clean treasury · skip Bazantic · Sepolia send only");
        setFilm("mm_ready");
        setGateResult({
          decision: "ALLOW",
          status: "SAFE",
          ensName: null,
          source: "none",
          reason: "Clean contrast chip — no investigate pay",
          cost: { graph: 0, ai: 0, usd: 0 },
        });
        setAwaitingMmClick(true);
        void openMetaMaskSend();
        return;
      }

      // Force-fresh demo: always agent pays Base first, then verdict (even if named)
      if (lane === "force_fresh") {
        setShieldNote(
          "Force fresh · skip $0 memory · agent pays Bazantic to re-investigate",
        );
        const { result } = await settleAgentInvestigate(to);
        revealVerdict(result);
        return;
      }

      // 1) Shield $0 — never show VerdictCard yet
      const check = await refetch(to);
      if (!check) throw new Error("Shield check failed");

      const memoryHit =
        check.source === "ens" || check.source === "registry";

      if (memoryHit && onMemoryHit) {
        const key = `${to}:${check.decision}:${check.source}`;
        if (bumpedKey.current !== key) {
          bumpedKey.current = key;
          onMemoryHit();
        }
      }

      // Memory hit → $0 (unless unnamed_threat / miss forced pay below)
      if (
        lane === "memory" &&
        memoryHit &&
        (check.decision === "BLOCK" || check.decision === "WARN")
      ) {
        setFilm("memory_hit");
        setShieldNote(
          `MEMORY HIT · source=${check.source} · agent pays $0 (no Base tx)`,
        );
        await sleep(700);
        revealVerdict(check);
        return;
      }

      if (
        memoryHit &&
        (check.decision === "BLOCK" || check.decision === "WARN") &&
        lane !== "unnamed_threat" &&
        lane !== "miss"
      ) {
        setFilm("memory_hit");
        setShieldNote(
          `MEMORY HIT · source=${check.source} · agent pays $0 (no Base tx)`,
        );
        await sleep(700);
        revealVerdict(check);
        return;
      }

      // Unnamed threat / miss / escalate → pay then verdict
      setShieldNote(
        memoryHit
          ? "Shield saw a name — demo still forces paid investigate"
          : "Shield miss · unnamed — agent must pay to investigate",
      );
      const { result } = await settleAgentInvestigate(to);
      revealVerdict(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
      setFilm("idle");
    } finally {
      setShieldBusy(false);
    }
  }

  /** Explicit monetization film — forceFresh pay even if named (judges see Base tx). */
  async function agentPayInvestigate() {
    if (sendingRef.current || shieldBusy || mmBusy) return;
    setError(null);
    setTxHash(null);
    setBlocked(false);
    setOverrideOpen(false);
    setAwaitingMmClick(false);
    setGateResult(null);
    setShieldNote("Agent path · forceFresh investigate (Bazantic meters this call)");
    setShieldBusy(true);
    try {
      const to = recipient.trim().toLowerCase() as Address;
      if (!/^0x[a-f0-9]{40}$/.test(to)) {
        throw new Error("Need a valid 0x recipient");
      }
      const { result } = await settleAgentInvestigate(to);
      revealVerdict(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pay & investigate failed");
      setFilm("idle");
    } finally {
      setShieldBusy(false);
    }
  }

  function overrideSend() {
    setOverrideOpen(false);
    setBlocked(false);
    void openMetaMaskSend();
  }

  async function previewOnly() {
    setError(null);
    setBlocked(false);
    setOverrideOpen(false);
    setAwaitingMmClick(false);
    setGateResult(null);
    setFilm("shield");
    setPayNote(null);
    const to = checkAddr;
    if (!/^0x[a-f0-9]{40}$/.test(to)) {
      setError("Need a valid 0x recipient");
      return;
    }
    const check = await refetch(to);
    if (!check) {
      setError("Shield check failed");
      setFilm("idle");
      return;
    }
    setShieldNote(`Preview only · source=${check.source} · $0 (no send, no pay)`);
    setFilm("verdict");
    setGateResult(check);
  }

  const showVerdict =
    !!gateResult &&
    (film === "verdict" || film === "mm_ready");

  const laneMeta = LANE_OPTIONS.find((o) => o.id === lane) ?? LANE_OPTIONS[0];
  const verdictBlurb = shortReason(
    gateResult?.reason ||
      (gateResult?.decision === "BLOCK"
        ? "flashloan-funded same-tx drain"
        : null),
  );

  return (
    <div className="rise" style={{ maxWidth: 960 }}>
      {dense ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "baseline",
            marginBottom: 10,
          }}
        >
          <div>
            <p style={{ ...eyebrow, marginBottom: 0 }}>WALLET GATE · PRE-SIGN</p>
            <p
              style={{
                margin: "4px 0 0",
                fontFamily: "var(--font-display)",
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "var(--tx-hi)",
                lineHeight: 1.2,
              }}
            >
              Stop the signature before MetaMask opens.
            </p>
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--tx-lo)",
            }}
          >
            pays {remainingPays(demoPaysUsed)}/{DEMO_PAY_CAP} · pay → verdict
          </p>
        </div>
      ) : (
        <>
          <p style={eyebrow}>WALLET GATE · PRE-SIGN</p>
          <h2 style={title}>Stop the signature before MetaMask opens.</h2>
          <p style={lede}>
            Sepolia ETH = your MetaMask send. Base USDC ={" "}
            <strong style={{ color: "var(--tx-hi)" }}>Bazantic grant</strong>{" "}
            (agent account), not your wallet. Order:{" "}
            <strong style={{ color: "var(--tx-hi)" }}>pay → verdict</strong>. Demo
            pays left:{" "}
            <strong style={{ color: "var(--tx-hi)" }}>
              {remainingPays(demoPaysUsed)}/{DEMO_PAY_CAP}
            </strong>
            .
          </p>
        </>
      )}

      <div
        className="wallet-gate-grid"
        style={{
          ...grid,
          marginTop: dense ? 0 : 20,
          gap: dense ? 14 : 28,
        }}
      >
        <div style={{ ...formCol, gap: dense ? 10 : 18 }}>
          <div style={section}>
            <p style={{ ...labelStyle, marginBottom: dense ? 6 : 6 }}>
              Demo lane
            </p>
            <div
              style={dense ? laneListDense : laneList}
              role="listbox"
              aria-label="Demo lane"
            >
              {LANE_OPTIONS.map((opt) => {
                const on = lane === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => pickLane(opt.id, opt.address)}
                    style={
                      dense
                        ? {
                            ...lanePill,
                            borderColor: on ? "var(--sig)" : "var(--line-mid)",
                            background: on
                              ? "color-mix(in srgb, var(--sig) 12%, var(--bg-raise))"
                              : "var(--bg-raise)",
                            color: on ? "var(--tx-hi)" : "var(--tx-lo)",
                            fontWeight: on ? 600 : 500,
                          }
                        : {
                            ...laneBtn,
                            borderColor: on ? "var(--sig)" : "var(--line)",
                            background: on
                              ? "color-mix(in srgb, var(--sig) 10%, var(--surface))"
                              : "var(--surface)",
                            color: on ? "var(--tx-hi)" : "var(--tx-lo)",
                          }
                    }
                  >
                    {dense ? (
                      <>
                        <span>{opt.label}</span>
                        <span style={{ opacity: 0.65, marginLeft: 6 }}>
                          {opt.hint}
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={laneTitle}>{opt.label}</span>
                        <span style={laneHint}>{opt.hint}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
            <p
              style={{
                ...laneActiveNote,
                margin: dense ? "6px 0 0" : "8px 0 0",
                fontSize: dense ? 12 : undefined,
              }}
            >
              {laneMeta.detail}
            </p>
          </div>

          <div
            style={{
              ...section,
              ...(dense
                ? {
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px 12px",
                    alignItems: "end",
                  }
                : null),
            }}
          >
            <div style={dense ? { gridColumn: "1 / -1" } : undefined}>
              {!account ? (
                <button
                  type="button"
                  onClick={() => void connect()}
                  style={btnPrimary}
                >
                  Connect wallet
                </button>
              ) : (
                <p style={{ ...connectedLine, marginBottom: dense ? 0 : 12 }}>
                  {account.slice(0, 6)}…{account.slice(-4)} · Sepolia
                </p>
              )}
            </div>

            <div style={dense ? undefined : undefined}>
              <label style={labelStyle}>Recipient</label>
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                style={{
                  ...fieldStyle,
                  width: "100%",
                  maxWidth: "100%",
                  marginBottom: dense ? 0 : 12,
                }}
              />
            </div>

            <div>
              <label style={labelStyle}>Amount (Sepolia ETH)</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  ...fieldStyle,
                  width: dense ? "100%" : 120,
                  maxWidth: "100%",
                  marginBottom: dense ? 0 : 16,
                }}
              />
            </div>

            <div
              style={{
                ...actionRow,
                ...(dense ? { gridColumn: "1 / -1" } : null),
              }}
            >
              <button
                type="button"
                disabled={shieldBusy || mmBusy || !account}
                onClick={() => void sendWithGate()}
                style={btnPrimary}
              >
                {shieldBusy
                  ? film === "paying" || film === "paid"
                    ? "Paying Base…"
                    : "Shield…"
                  : mmBusy
                    ? "MetaMask…"
                    : "Send"}
              </button>
              {awaitingMmClick ? (
                <button
                  type="button"
                  disabled={mmBusy || !account}
                  onClick={() => void openMetaMaskSend()}
                  style={{
                    ...btnPrimary,
                    background: "var(--sig)",
                    borderColor: "var(--sig)",
                    color: "var(--bg-base)",
                  }}
                >
                  {mmBusy ? "…" : "Open MetaMask"}
                </button>
              ) : null}
              <button
                type="button"
                disabled={loading || shieldBusy || mmBusy}
                onClick={() => void previewOnly()}
                style={btnGhost}
              >
                Preview $0
              </button>
            </div>

            {(lane === "force_fresh" || lane === "unnamed_threat") && (
              <button
                type="button"
                disabled={shieldBusy || mmBusy}
                onClick={() => void agentPayInvestigate()}
                style={{
                  ...btnGhost,
                  marginTop: dense ? 0 : 8,
                  width: dense ? undefined : "100%",
                  ...(dense ? { gridColumn: "1 / -1" } : null),
                }}
              >
                {shieldBusy && (film === "paying" || film === "paid")
                  ? "Paying…"
                  : "Re-run pay & investigate"}
              </button>
            )}
          </div>

          {(blocked || txHash || error) && (
            <div style={statusBox}>
              {blocked ? (
                <p style={{ margin: 0, color: "var(--block)", fontSize: "var(--t-sm)" }}>
                  Blocked · MetaMask not opened
                </p>
              ) : null}
              {txHash ? (
                <p
                  style={{
                    margin: blocked ? "8px 0 0" : 0,
                    ...monoSm,
                    color: "var(--safe)",
                  }}
                >
                  Sepolia{" "}
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--sig)" }}
                  >
                    {txHash.slice(0, 10)}…
                  </a>
                </p>
              ) : null}
              {error ? (
                <p
                  role="alert"
                  style={{
                    margin: blocked || txHash ? "8px 0 0" : 0,
                    color: "var(--red)",
                    fontSize: "var(--t-sm)",
                  }}
                >
                  {error}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div>
          <FilmPanel
            film={film}
            shieldNote={shieldNote}
            payNote={payNote}
            payTx={payTx}
            payExplorer={payExplorer}
            paySettlement={paySettlement}
            busy={shieldBusy}
            dense={dense}
          />
          {showVerdict && gateResult ? (
            <div style={{ marginTop: dense ? 10 : 14 }}>
              <p style={stepLabel}>Step 2 · Verdict</p>
              <VerdictCard
                address={checkAddr}
                decision={gateResult.decision}
                status={gateResult.status}
                plainVerdict={verdictBlurb}
                ensName={gateResult.ensName}
                source={gateResult.source}
                cost={{
                  graph: gateResult.cost.graph,
                  ai: gateResult.cost.ai,
                  usd: gateResult.cost.usd,
                  latencyMs: gateResult.latencyMs,
                }}
                size={dense ? "inline" : "hero"}
              />
            </div>
          ) : null}
        </div>
      </div>

      <Sheet
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        eyebrow="SAVIOURS BLOCKED THIS TRANSACTION"
        title={gateResult?.decision === "WARN" ? "WARN" : "BLOCK"}
        width={400}
      >
        {(payExplorer || payNote) && (
          <p
            style={{
              margin: "0 0 14px",
              fontSize: "var(--t-sm)",
              color: "var(--tx-lo)",
              lineHeight: 1.4,
            }}
          >
            Paid on Base
            {payExplorer ? (
              <>
                {" · "}
                <a
                  href={payExplorer}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--sig)" }}
                >
                  Basescan
                </a>
              </>
            ) : null}
          </p>
        )}
        {gateResult ? (
          <VerdictCard
            address={checkAddr}
            decision={gateResult.decision}
            status={gateResult.status}
            plainVerdict={shortReason(gateResult.reason || "named threat", 140)}
            ensName={gateResult.ensName}
            source={gateResult.source}
            cost={{
              graph: gateResult.cost.graph,
              ai: gateResult.cost.ai,
              usd: gateResult.cost.usd,
              latencyMs: gateResult.latencyMs,
            }}
            size="inline"
          />
        ) : null}
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button
            type="button"
            onClick={() => setOverrideOpen(false)}
            style={{ ...btnPrimary, flex: 1 }}
            disabled={mmBusy}
          >
            Keep blocked
          </button>
          <button
            type="button"
            onClick={overrideSend}
            style={{ ...btnGhost, flex: 1 }}
            disabled={mmBusy}
          >
            {mmBusy ? "Opening…" : "Override"}
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

const LANE_OPTIONS: {
  id: DemoLane;
  label: string;
  hint: string;
  detail: string;
  address: string;
}[] = [
  {
    id: "force_fresh",
    label: "Force fresh",
    hint: "pay → BLOCK",
    detail: "Named ATTACK-1 · skip $0 memory · agent pays Base then BLOCK.",
    address: TAINTED,
  },
  {
    id: "unnamed_threat",
    label: "Unnamed threat",
    hint: "not on ENS",
    detail: "Cream exploiter · not named on Sepolia yet · pay → expect BLOCK.",
    address: UNNAMED_THREAT,
  },
  {
    id: "miss",
    label: "Empty miss",
    hint: "UNKNOWN",
    detail: "No Graph signal · pay → UNKNOWN · MetaMask opens on ALLOW.",
    address: MISS,
  },
  {
    id: "memory",
    label: "Memory hit",
    hint: "$0",
    detail: "Named threat · shield only · no Base pay.",
    address: TAINTED,
  },
  {
    id: "clean",
    label: "Clean",
    hint: "Sepolia send",
    detail: "Circle treasury · no Bazantic · MetaMask for Sepolia ETH.",
    address: CLEAN,
  },
];

function shortReason(s: string | null | undefined, n = 160): string | null {
  if (!s) return null;
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n).trimEnd()}…`;
}

function FilmPanel({
  film,
  shieldNote,
  payNote,
  payTx,
  payExplorer,
  paySettlement,
  busy,
  dense = false,
}: {
  film: FilmStep;
  shieldNote: string | null;
  payNote: string | null;
  payTx: string | null;
  payExplorer: string | null;
  paySettlement: string | null;
  busy: boolean;
  dense?: boolean;
}) {
  if (film === "idle" && !busy) {
    return (
      <div
        style={{
          ...emptyPanel,
          minHeight: dense ? 140 : 180,
          background: "var(--bg-raise)",
          border: "1px solid var(--line-mid)",
        }}
      >
        <p style={{ margin: 0, color: "var(--tx-hi)", fontWeight: 600 }}>
          Live film
        </p>
        <p style={{ margin: "8px 0 0", color: "var(--tx-lo)", maxWidth: 260 }}>
          Pick a lane · Send. Pay receipt shows before verdict.
        </p>
      </div>
    );
  }

  return (
    <div style={filmBox}>
      <p style={stepLabel}>Live film</p>
      <StepRow
        n="0"
        label="Shield $0"
        state={
          film === "shield"
            ? "active"
            : ["memory_hit", "paying", "paid", "verdict", "mm_ready"].includes(film)
              ? "done"
              : "todo"
        }
        detail={shortReason(shieldNote, 100)}
      />
      <StepRow
        n="1"
        label="Bazantic pay (Base)"
        state={
          film === "paying"
            ? "active"
            : film === "paid" ||
                ((film === "verdict" || film === "mm_ready") && !!payNote)
              ? "done"
              : film === "memory_hit" ||
                  ((film === "verdict" || film === "mm_ready") && !payNote)
                ? "skip"
                : "todo"
        }
        detail={
          film === "memory_hit" ||
          ((film === "verdict" || film === "mm_ready") &&
            !payNote &&
            shieldNote?.includes("MEMORY"))
            ? "Skipped — memory is $0"
            : (film === "verdict" || film === "mm_ready") && !payNote
              ? "Skipped — clean path"
              : shortReason(payNote, 110)
        }
      />
      {payTx || payExplorer ? (
        <p style={payReceipt}>
          {payExplorer ? (
            <a href={payExplorer} target="_blank" rel="noreferrer" style={{ color: "var(--sig)" }}>
              Basescan {payTx ? `${payTx.slice(0, 10)}…` : "tx"}
            </a>
          ) : (
            <span>{payTx}</span>
          )}
          {paySettlement ? ` · ${paySettlement}` : ""}
        </p>
      ) : null}
      <StepRow
        n="2"
        label="Verdict"
        state={
          film === "verdict" || film === "mm_ready"
            ? "done"
            : film === "paid"
              ? "active"
              : "todo"
        }
        detail={
          film === "paying" || film === "paid"
            ? "Waiting for Base settle…"
            : null
        }
      />
    </div>
  );
}

function StepRow({
  n,
  label,
  state,
  detail,
}: {
  n: string;
  label: string;
  state: "todo" | "active" | "done" | "skip";
  detail?: string | null;
}) {
  const color =
    state === "active"
      ? "var(--sig)"
      : state === "done"
        ? "var(--safe)"
        : "var(--tx-faint)";
  return (
    <div style={{ marginBottom: 10 }}>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-mono)",
          fontSize: "var(--t-floor)",
          color,
          letterSpacing: "0.04em",
        }}
      >
        {state === "done" ? "✓" : state === "active" ? "●" : state === "skip" ? "–" : "○"}{" "}
        {n} · {label}
        {state === "skip" ? " (skip)" : ""}
        {state === "active" ? "…" : ""}
      </p>
      {detail ? (
        <p
          style={{
            margin: "4px 0 0",
            fontSize: "var(--t-sm)",
            color: "var(--tx-lo)",
            lineHeight: 1.35,
          }}
        >
          {detail}
        </p>
      ) : null}
    </div>
  );
}

const eyebrow: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-floor)",
  letterSpacing: "0.1em",
  color: "var(--sig)",
};

const title: CSSProperties = {
  margin: "8px 0 0",
  fontFamily: "var(--font-display)",
  fontSize: "var(--t-h2)",
  fontWeight: 600,
  letterSpacing: "-0.02em",
  color: "var(--tx-hi)",
};

const lede: CSSProperties = {
  margin: "8px 0 0",
  maxWidth: 520,
  fontSize: "var(--t-sm)",
  lineHeight: 1.45,
  color: "var(--tx-lo)",
};

const grid: CSSProperties = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.05fr) minmax(260px, 0.95fr)",
  gap: 28,
  alignItems: "start",
};

const formCol: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
  minWidth: 0,
};

const section: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
};

const laneList: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const laneListDense: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const lanePill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  border: "1px solid var(--line)",
  borderRadius: 999,
  cursor: "pointer",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  lineHeight: 1.2,
};

const laneBtn: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 12,
  width: "100%",
  textAlign: "left",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-sm)",
};

const laneTitle: CSSProperties = {
  fontWeight: 600,
  letterSpacing: "0.02em",
};

const laneHint: CSSProperties = {
  fontSize: "var(--t-floor)",
  color: "var(--tx-faint)",
  flexShrink: 0,
};

const laneActiveNote: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "var(--t-sm)",
  lineHeight: 1.4,
  color: "var(--tx-lo)",
};

const connectedLine: CSSProperties = {
  margin: "0 0 12px",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-floor)",
  color: "var(--safe)",
};

const actionRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

const statusBox: CSSProperties = {
  padding: "10px 12px",
  borderLeft: "3px solid var(--line-mid)",
  background: "color-mix(in srgb, var(--surface) 88%, transparent)",
};

const monoSm: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-floor)",
  wordBreak: "break-all",
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-floor)",
  letterSpacing: "0.06em",
  color: "var(--tx-faint)",
};

const stepLabel: CSSProperties = {
  margin: "0 0 10px",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-floor)",
  letterSpacing: "0.08em",
  color: "var(--sig)",
};

const emptyPanel: CSSProperties = {
  minHeight: 180,
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-floor)",
  textAlign: "center",
  padding: 20,
  lineHeight: 1.45,
};

const filmBox: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  padding: "14px 16px",
  background: "color-mix(in srgb, var(--surface) 80%, transparent)",
};

const payReceipt: CSSProperties = {
  margin: "0 0 12px 18px",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--t-floor)",
  color: "var(--safe)",
  wordBreak: "break-all",
};
