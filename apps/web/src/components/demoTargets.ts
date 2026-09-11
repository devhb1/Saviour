/** Shared demo targets + honesty copy — imported by AppShell and screens. */

export const DEMO_TARGETS = [
  {
    id: "ATTACK-1",
    address: "0x935bfb495e33f74d2e9735df1da66ace442ede48",
    label: "MakinaFi",
    plain: "Known exploiter",
  },
  {
    id: "ATTACK-2",
    address: "0x1f23eb80f0c16758e4a55d48097c343bd20be56f",
    label: "HopeLend",
    plain: "Named attacker",
  },
  {
    id: "BOT-1",
    address: "0x352423e2fa5d5c99343d371c9e3bc56c87723cc7",
    label: "Bot",
    plain: "Flashloan bot",
  },
  {
    id: "BENIGN-1",
    address: "0x55fe002aeff02f77364de339a1292923a15844b8",
    label: "Circle",
    plain: "Clean treasury",
  },
  {
    id: "HOP-1",
    address: "0xa6c248384c5ddd934b83d0926d2e2a1ddf008387",
    label: "Hop",
    plain: "Fund-flow hop",
  },
] as const;

/** First-fold chips — plain language, not ATTACK-1 ids. */
export const HOME_CHIPS = [
  DEMO_TARGETS[0],
  DEMO_TARGETS[2],
  DEMO_TARGETS[3],
] as const;

/** Shared honesty copy — WhatWeDont + CoverageStrip must stay in sync. */
export const HONESTY_BOUNDS = {
  title: "What this does not do",
  paths:
    "FLASHLOAN_ONE_SHOT ∧ ATOMIC → TAINTED · BOT_PROFILE → WATCH · REGISTRY_COOCCURRENCE → TAINTED on live Graph edge",
  detects:
    "flashloan-driven atomic attacks · known-tainted counterparty propagation · bot-profile (WATCH, not TAINTED)",
  notLive: "drain fan-in/out (needs counterparty wiring)",
  doesNot:
    "offchain coordination · novel contract-logic exploits · social engineering · assets outside the 8 indexed protocols (Balancer/Pancake/Convex currently broken on network)",
  refusals: [
    {
      title: "Not a general detector",
      body: "One live TAINTED class + WATCH contrast. Naming is the product.",
    },
    {
      title: "Not eight integrations",
      body: "One Messari template × eight deployments. Broken subgraphs excluded.",
    },
    {
      title: "Not mainnet ENS enforcement yet",
      body: "Evidence = mainnet Graph. Memory = Sepolia ENSv2 — stated ceiling.",
    },
    {
      title: "Not pay-per-Shield",
      body: "MEMORY HIT stays $0 on UI, MCP, and Bazantic. Investigate is the miss.",
    },
    {
      title: "Not “SAFE means safe”",
      body: "NO KNOWN THREAT / no name ≠ endorsement. UNKNOWN is deliberate.",
    },
    {
      title: "Not Immunity with ENS paint",
      body: "We remember Graph evidence under a name you can cast — not an LLM opinion.",
    },
  ],
} as const;
