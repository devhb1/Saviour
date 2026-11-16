/**
 * Saviour V3 product story — landing, docs, review.
 * Lead: transaction assessment. Address resolve is secondary memory.
 */

export const BRAND = "saviours" as const;

export const HERO_SOFT =
  "Understand the action. Remember the threat. Explain the risk before signing." as const;

export const HERO_LINE_1 = "BEFORE YOU AUTHORIZE," as const;
export const HERO_LINE_2 = "KNOW WHAT IT DOES." as const;

export const HERO_BODY =
  "Transaction-security intelligence for **DAO treasuries** and Safe signers. Decode supported privileged actions, check reusable findings on Base, see evidence — then you decide. Not a guarantee of safety." as const;

export const HERO_FRAMING =
  "First experience: import the exact Safe transaction you are about to sign" as const;

export const HERO_CAST_PILL = "SIGNER DECIDES" as const;

export const MEMORY_FOOTER =
  "Supported actions decoded. Known risks assessed. You authorize." as const;

export const MEMORY_HIT_COST = "Base resolve · $0" as const;
export const MEMORY_HIT_COST_LONG =
  "Named once · resolve from Base registry · $0 protocol fee" as const;
export const MEMORY_HIT_CAPTION =
  "Memory lookup is free. Assessment explains the transaction." as const;

/** Receipt / meter line — keep Graph/AI metering for legacy investigate path. */
export function formatCostMeter(
  graph: number,
  ai: number,
  opts?: { ms?: number | string | null; usd?: number | null },
): string {
  const parts: string[] = [];
  if (graph === 0 && ai === 0) {
    parts.push("Base resolve", "$0");
  } else {
    parts.push(`${graph} Graph`, `${ai} AI`);
    if (typeof opts?.usd === "number") {
      parts.push(`$${opts.usd.toFixed(2)}`);
    }
  }
  if (opts?.ms != null && opts.ms !== "") {
    parts.push(typeof opts.ms === "number" ? `${opts.ms}ms` : String(opts.ms));
  }
  return parts.join(" · ");
}

export const HOW_MEMORY_EYEBROW = "// FOUR LAYERS" as const;

export const HOW_MEMORY_TITLE =
  "Understand. Remember. Assess. Decide." as const;

export const HOW_MEMORY_LEAD =
  "QueueWatch and the Registry stay independently useful. Check connects them to the transaction you are about to sign." as const;

export type MemoryStage = {
  n: string;
  label: string;
  title: string;
  body: string;
  product?: boolean;
};

export const MEMORY_STAGES: readonly MemoryStage[] = [
  {
    n: "01",
    label: "UNDERSTAND",
    title: "QueueWatch",
    body: "Decode supported governance / module / MultiSend trees. Unsupported stays unsupported — never SAFE.",
  },
  {
    n: "02",
    label: "REMEMBER",
    title: "Registry",
    body: "Evidence-backed UNSET · WATCH · TAINTED on Base. Attester for TAINTED. Versioned corrections.",
  },
  {
    n: "03",
    label: "ASSESS",
    title: "Saviour Check",
    body: "Correlate the imported tx with findings, authority links, coverage and freshness.",
    product: true,
  },
  {
    n: "04",
    label: "ACT",
    title: "Review",
    body: "What happens · why risky · what evidence. Signer retains authority.",
  },
  {
    n: "05",
    label: "MONITOR",
    title: "Workflow A",
    body: "Queued proposals discovered continuously — cancel, expire, 72h quarantine.",
  },
  {
    n: "06",
    label: "REVIEW",
    title: "Workflow B",
    body: "Import Safe JSON / calldata with hash integrity — the tx you will approve.",
  },
] as const;

export const FLOW_BOARD_TITLE =
  "saviours — assess the transaction, remember the threat" as const;

export const FLOW_BOARD_SUB =
  "Two workflows · one decoder · Base memory · $0 protocol fee on resolve" as const;

export const FLOW_CONSUMERS = [
  { title: "Treasury signer", detail: "/review · Safe JSON" },
  { title: "Operator", detail: "/queues · monitor" },
  { title: "Wallet / agent", detail: "@saviours/check · MCP" },
] as const;

export const FLOW_GATE_STEPS = [
  { n: 1, text: "Import Safe tx or monitor a queued op" },
  { n: 2, text: "Verify Safe tx hash integrity when provided" },
  { n: 3, text: "Decode supported actions · mark unsupported" },
  { n: 4, text: "Resolve findings on Base registry" },
  { n: 5, text: "Return decision + coverage + evidence" },
  { n: 6, text: "Signer decides — never auto-block from NO_VERDICT" },
] as const;

export const FLOW_SOURCES = [
  {
    title: "Workflow B — Review",
    detail: "Safe JSON / calldata · hash integrity",
  },
  {
    title: "Workflow A — Monitor",
    detail: "Queued governance · AuthorityLink",
  },
  {
    title: "Base registry",
    detail: "Sepolia staging → mainnet after gate",
  },
] as const;

export const PARTNER_STACK = ["QueueWatch", "Base", "Safe review"] as const;

export const PARTNER_LINES = {
  ens: "Staging ENS memory remains for film — product home is Base.",
  graph: "Investigate path still exists; assessment is the V3 product.",
  bazantic: "Optional discovery metering — not required for resolve hits.",
} as const;

/** Illustrative hero assessment — not a live finding. */
export const HERO_ASSESS_PREVIEW = {
  decision: "WARN" as const,
  coverage: "PARTIAL" as const,
  headline: "Disable delay and enable an unverified module",
  vault: "0x7a12…82d1",
  rows: [
    { k: "Delay change", v: "7 days → 0" },
    { k: "Module", v: "Unverified" },
    { k: "Integrity", v: "hash MATCH" },
    { k: "Coverage", v: "PARTIAL · 1 unsupported nested" },
  ],
  why: [
    "Proposed action removes a security delay",
    "Enabled module has no attested trust record",
    "Associated operation still pending / under review",
  ],
  evidence: "chain · queue · proposal · tx · block · decoder v3",
} as const;

export function heroBodySegments(
  body: string = HERO_BODY,
): Array<{ text: string; bold: boolean }> {
  const parts = body.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p) =>
    p.startsWith("**") && p.endsWith("**")
      ? { text: p.slice(2, -2), bold: true }
      : { text: p, bold: false },
  );
}
