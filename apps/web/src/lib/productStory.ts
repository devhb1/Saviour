/**
 * Saviour — Safe Treasury Permission Auditor landing copy.
 */

export const BRAND = "saviours" as const;

export const HERO_SOFT =
  "Safe Treasury Permission Auditor" as const;

export const HERO_LINE_1 = "Who can act through your Safe" as const;
export const HERO_LINE_2 = "beyond who can sign." as const;

export const HERO_BODY =
  "Independent, block-pinned reconstruction of standing authority on Safe + supported modules. **Findings · Coverage · Freshness · Reach.** Roles v2.1.1 selectors come from chain logs. Condition amounts stay UNKNOWN. Never SAFE." as const;

export const PRODUCT_STATUS_CHIPS = [
  { label: "Safe inventory", status: "ready" as const },
  { label: "Roles selectors", status: "limited" as const },
  { label: "Delay coverage", status: "limited" as const },
] as const;

/** Split HERO_BODY on **bold** markers for Hook rendering. */
export function heroBodySegments(body: string): Array<{ text: string; bold?: boolean }> {
  const parts = body.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p) =>
    p.startsWith("**") && p.endsWith("**")
      ? { text: p.slice(2, -2), bold: true }
      : { text: p },
  );
}

export const HERO_FRAMING =
  "Primary experience: Permission Audit on /audit · Review is secondary" as const;

export const HERO_CAST_PILL = "NEVER SAFE" as const;

export const MEMORY_FOOTER =
  "Reach · Coverage · You decide." as const;

export const MEMORY_HIT_COST = "Audit · $0" as const;
export const MEMORY_HIT_COST_LONG =
  "Permission Audit · topology + Reach · $0 protocol fee" as const;
export const MEMORY_HIT_CAPTION =
  "Day-1 product is Audit. Review is secondary. Watch/Registry/ENS are archive or frozen." as const;

export function formatCostMeter(
  graph: number,
  ai: number,
  opts?: { ms?: number | string | null; usd?: number | null },
): string {
  const parts: string[] = [];
  if (graph === 0 && ai === 0) {
    parts.push("permission audit", "$0");
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

export const HOW_MEMORY_EYEBROW =
  "// PERMISSION AUDITOR" as const;

export const HOW_MEMORY_TITLE =
  "Six stages between a Safe and a decision." as const;

export const HOW_MEMORY_LEAD =
  "Shipped: Safe, Delay, and Roles v2.1.1 selectors at one block. Condition amounts stay UNKNOWN. Signer decides elsewhere." as const;

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
    label: "AUDIT",
    title: "Baseline Safe",
    body: "Owners, modules, Delay — Findings · Coverage · Freshness. No pending tx required.",
    product: true,
  },
  {
    n: "02",
    label: "REACH",
    title: "Standing authority",
    body: "What each principal can already do — BOUNDED / UNBOUNDED / UNKNOWN.",
    product: true,
  },
  {
    n: "03",
    label: "IMPORT",
    title: "Safe transaction",
    body: "Paste Safe JSON or calldata — the exact payload you will sign.",
  },
  {
    n: "04",
    label: "INTEGRITY",
    title: "Safe tx hash",
    body: "Recompute with Safe 1.3+ domain (chainId + verifyingContract).",
  },
  {
    n: "05",
    label: "DIFF",
    title: "Privilege Diff",
    body: "Before → after for delays, modules, roles. UNKNOWN when unread.",
    product: true,
  },
  {
    n: "06",
    label: "SIGNER",
    title: "You authorize",
    body: "NO_VERDICT ≠ SAFE. Approve or reject in your existing Safe UI.",
  },
] as const;

export const FLOW_BOARD_TITLE =
  "saviours — Permission Auditor for treasury control" as const;

export const FLOW_BOARD_SUB =
  "Audit · Reach · Coverage · Review / Privilege Diff" as const;

export const FLOW_CONSUMERS = [
  { title: "Treasury signer", detail: "/audit · /review" },
  { title: "Builder", detail: "@saviours/check · CLI" },
  { title: "Co-signer", detail: "Pinned report digest (when stored)" },
] as const;

export const FLOW_GATE_STEPS = [
  { n: 1, text: "Audit Safe baseline (primary)" },
  { n: 2, text: "Read Reach + Coverage components" },
  { n: 3, text: "Pin / share report digest" },
  { n: 4, text: "Import Safe JSON for change review (optional)" },
  { n: 5, text: "Privilege Diff before → after" },
  { n: 6, text: "Signer decides — never invent SAFE" },
] as const;

export const FLOW_DECISION = {
  prompt: "Pending?",
  yes: "YES → REVIEW · Privilege Diff · hash",
  no: "NO → AUDIT · Findings · Coverage · Reach",
} as const;

export const FLOW_SOURCES = [
  {
    title: "Mainnet RPC",
    detail: "Block-pinned reads · chain = trust root",
  },
  {
    title: "Roles v2.1.1",
    detail: "Selectors from chain logs · amounts UNKNOWN",
  },
  {
    title: "Safe 1.3+ hash",
    detail: "chainId + verifyingContract domain",
  },
] as const;

export const PARTNER_STACK = ["Permission Audit", "Reach", "Privilege Diff"] as const;

export const PARTNER_LINES = {
  ens: "ENS staging is legacy film — Permission Auditor is day-1.",
  graph: "Investigate loop remains a deep link, not the hero.",
  bazantic: "Optional metering — not the product.",
} as const;

export const HERO_ASSESS_PREVIEW = {
  decision: "WARN" as const,
  coverage: "PARTIAL" as const,
  headline: "Roles path · Coverage incomplete",
  vault: "0x46DA…8613",
  rows: [
    { k: "Owners", v: "threshold inventory" },
    { k: "Roles", v: "v2.1.1 selectors · amounts UNKNOWN" },
    { k: "Delay", v: "inventory · lifecycle limited" },
    { k: "Verdict", v: "never SAFE" },
  ],
  why: [
    "Standing authority may exceed what operators believe they granted",
    "Incomplete Coverage must not be read as safe",
    "Independent evidence complements Zodiac App configuration",
  ],
  evidence: "chain · Delay · Roles · Safe · Coverage components",
} as const;

export const WORKFLOW_CARDS = [
  {
    title: "Audit a Safe",
    body: "Paste a Safe address. Get Findings · Coverage · Freshness · Reach — then share a pinned digest.",
    cta: "Open audit →",
    href: "/audit",
  },
  {
    title: "Review a change",
    body: "Import Safe JSON or calldata. Verify hash. Privilege Diff — then sign elsewhere.",
    cta: "Open review →",
    href: "/review",
  },
] as const;
