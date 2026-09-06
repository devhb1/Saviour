import type { HexAddress } from "../packages/core/src/types";

/**
 * Address list for **live** Graph / investigate checks.
 *
 * Important:
 * - These are real mainnet addresses used as query inputs.
 * - We do NOT ship static swap/tx tables — every run pulls The Graph live.
 * - `expectedEvidence` describes what we require from live data, not a canned verdict.
 * - Demo incident lock (Step 8) is still a separate human choice.
 */
export type LiveTarget = {
  id: string;
  category: "active" | "protocol" | "thin";
  chainId: number;
  address: HexAddress;
  /** What live Graph should roughly produce */
  expectedEvidence: "nonempty" | "empty_or_thin";
  note: string;
};

export const liveTargets: LiveTarget[] = [
  {
    id: "active-vitalik",
    category: "active",
    chainId: 1,
    address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
    expectedEvidence: "nonempty",
    note: "High Uniswap activity — Adapter A/B should return rows",
  },
  {
    id: "protocol-uniswap-router",
    category: "protocol",
    chainId: 1,
    address: "0xe592427a0aece92de3edee1f18e0157c05861564",
    expectedEvidence: "nonempty",
    note: "Uniswap V3 SwapRouter — protocol context + possible interactions",
  },
  {
    id: "protocol-usdc",
    category: "protocol",
    chainId: 1,
    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    expectedEvidence: "nonempty",
    note: "USDC — Messari protocol / pool context expected",
  },
  {
    id: "protocol-weth",
    category: "protocol",
    chainId: 1,
    address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    expectedEvidence: "nonempty",
    note: "WETH wrapper",
  },
  {
    id: "thin-near-zero",
    category: "thin",
    chainId: 1,
    address: "0x0000000000000000000000000000000000000001",
    expectedEvidence: "empty_or_thin",
    note: "Little/no DEX activity — investigate should lean UNKNOWN",
  },
];

/** @deprecated use liveTargets — kept name for older imports */
export const fixtures = liveTargets;
