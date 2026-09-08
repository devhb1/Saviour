/**
 * Synthetic Evidence fixtures for signal unit tests ONLY.
 * Never returned by adapters / product paths — those use live Graph.
 */

import { createHash } from "node:crypto";
import type { Evidence, EvidenceKind, HexAddress } from "../packages/core/src/types";

function hash(raw: unknown): string {
  return createHash("sha256").update(JSON.stringify(raw)).digest("hex");
}

function ev(partial: {
  id: string;
  kind?: EvidenceKind;
  protocol?: string;
  txHash?: string;
  amountUSD?: number;
  timestamp: number;
  counterparty?: HexAddress;
  claim: string;
  reference?: string;
}): Evidence {
  const raw = { id: partial.id, ...partial };
  return {
    id: partial.id,
    source: "unit-test-only",
    reference: partial.reference ?? `ref:${partial.id}`,
    claim: partial.claim,
    timestamp: partial.timestamp,
    rawHash: hash(raw),
    kind: partial.kind,
    protocol: partial.protocol,
    txHash: partial.txHash,
    amountUSD: partial.amountUSD,
    counterparty: partial.counterparty,
    subgraphId: "fixture",
    schema: "fixture",
  };
}

const T0 = 1_700_000_000;
const TX_SHARED =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

/** Attacker-shaped: one-shot large FL + same tx on two protocols + fresh. */
export function attackerFixture(): Evidence[] {
  return [
    ev({
      id: "acc-aave",
      kind: "account",
      protocol: "aave-v3",
      timestamp: T0,
      claim: "Aave V3 account 0xatt…: flashloans=1, borrows=0, deposits=0, withdraws=0",
    }),
    ev({
      id: "fl-1",
      kind: "flashloan",
      protocol: "aave-v3",
      txHash: TX_SHARED,
      amountUSD: 119_000_000,
      timestamp: T0 + 60,
      claim: "Aave V3 flashloan USDC ≈$119000000",
    }),
    ev({
      id: "sw-uni",
      kind: "swap",
      protocol: "uniswap-v3",
      txHash: TX_SHARED,
      amountUSD: 50_000,
      timestamp: T0 + 60,
      claim: "Uniswap V3 swap USDC→WETH",
    }),
  ];
}

/** Bot-shaped: huge flashloanCount, no one-shot (count ≫ 5). Spaced timestamps so FRESH does not fire. */
export function botFixture(): Evidence[] {
  return [
    ev({
      id: "acc-bot",
      kind: "account",
      protocol: "aave-v3",
      timestamp: T0,
      claim: "Aave V3 account 0xbot…: flashloans=15027, borrows=0, deposits=0, withdraws=0",
    }),
    ev({
      id: "fl-bot-1",
      kind: "flashloan",
      protocol: "aave-v3",
      txHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      amountUSD: 120,
      timestamp: T0 - 40 * 86_400,
      claim: "Aave V3 flashloan tiny",
    }),
    ev({
      id: "fl-bot-2",
      kind: "flashloan",
      protocol: "aave-v3",
      txHash: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      amountUSD: 90,
      timestamp: T0,
      claim: "Aave V3 flashloan tiny",
    }),
  ];
}

/** Benign normal usage — a few swaps, no threat shape. */
export function benignFixture(): Evidence[] {
  return [
    ev({
      id: "acc-b",
      kind: "account",
      protocol: "uniswap-v3",
      timestamp: T0,
      claim: "Uniswap V3 account: swaps=3, deposits=0, withdraws=0",
    }),
    ev({
      id: "sw-1",
      kind: "swap",
      protocol: "uniswap-v3",
      txHash: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      amountUSD: 2_500,
      timestamp: T0 - 30 * 86_400,
      claim: "Uniswap V3 swap",
    }),
    ev({
      id: "sw-2",
      kind: "swap",
      protocol: "uniswap-v3",
      txHash: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      amountUSD: 1_800,
      timestamp: T0 - 10 * 86_400,
      claim: "Uniswap V3 swap",
    }),
  ];
}

/** Drain fan-in: 10 inbound counterparties + concentrated outbound. */
export function drainFixture(nowSec = T0 + 1000): Evidence[] {
  const rows: Evidence[] = [];
  for (let i = 0; i < 10; i++) {
    const cp = `0x${(i + 1).toString(16).padStart(40, "0")}` as HexAddress;
    rows.push(
      ev({
        id: `in-${i}`,
        kind: "deposit",
        protocol: "aave-v3",
        amountUSD: 1_000,
        timestamp: nowSec - 3600,
        counterparty: cp,
        claim: `deposit from ${cp}`,
      }),
    );
  }
  const sink = "0xfeed000000000000000000000000000000000001" as HexAddress;
  rows.push(
    ev({
      id: "out-1",
      kind: "withdraw",
      protocol: "aave-v3",
      amountUSD: 9_000,
      timestamp: nowSec - 1800,
      counterparty: sink,
      claim: `withdraw to ${sink}`,
    }),
  );
  rows.push(
    ev({
      id: "out-2",
      kind: "withdraw",
      protocol: "aave-v3",
      amountUSD: 500,
      timestamp: nowSec - 1700,
      counterparty: "0xabad000000000000000000000000000000000002" as HexAddress,
      claim: "withdraw dust",
    }),
  );
  return rows;
}

/** Propagation: counterparty already tainted. */
export function registryHopFixture(): {
  evidence: Evidence[];
  tainted: string[];
} {
  const tainted = ["0x935bfb495e33f74d2e9735df1da66ace442ede48"];
  return {
    tainted,
    evidence: [
      ev({
        id: "hop-sw",
        kind: "swap",
        protocol: "uniswap-v3",
        txHash: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        amountUSD: 12_000,
        timestamp: T0,
        counterparty: tainted[0] as HexAddress,
        claim: "swap touching tainted counterparty",
      }),
    ],
  };
}

export const SIGNAL_FIXTURE_NOW = T0 + 1000;
