/**
 * Saviour Transaction Review — landing copy.
 * One product: Privilege Diff for treasury control changes.
 * Watch / ENS = prototype or legacy.
 */

export const BRAND = "saviours" as const;

export const HERO_SOFT =
  "Governance Policy Guard for DAO treasury operators." as const;

export const HERO_LINE_1 = "BEFORE THIS PROPOSAL EXECUTES," as const;
export const HERO_LINE_2 = "WHO GAINS POWER?" as const;

export const HERO_BODY =
  "Import a pending Safe transaction. Verify the hash. Decode nested actions. See **before → after** privilege impact — delay, modules, roles — then decide in your existing signer." as const;

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
  "Primary experience: Transaction Review on /review" as const;

export const HERO_CAST_PILL = "SIGNER DECIDES" as const;

export const MEMORY_FOOTER =
  "Privilege Diff. Hash checked. You authorize." as const;

export const MEMORY_HIT_COST = "Review · $0" as const;
export const MEMORY_HIT_COST_LONG =
  "Transaction Review · decode + Privilege Diff · $0 protocol fee" as const;
export const MEMORY_HIT_CAPTION =
  "Day-1 product is Review. Watch is a prototype. Registry/ENS are phase-2 or legacy." as const;

export function formatCostMeter(
  graph: number,
  ai: number,
  opts?: { ms?: number | string | null; usd?: number | null },
): string {
  const parts: string[] = [];
  if (graph === 0 && ai === 0) {
    parts.push("privilege review", "$0");
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

export const HOW_MEMORY_EYEBROW = "// TRANSACTION REVIEW" as const;

export const HOW_MEMORY_TITLE =
  "Import. Diff. Decide." as const;

export const HOW_MEMORY_LEAD =
  "Focused on treasury control changes — not a generic inspector or threat-intel browser. Watch and ENS stay secondary." as const;

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
    label: "IMPORT",
    title: "Safe transaction",
    body: "Paste Safe JSON or calldata — the exact payload you will sign.",
  },
  {
    n: "02",
    label: "INTEGRITY",
    title: "Safe tx hash",
    body: "Recompute with Safe 1.3+ domain (chainId + verifyingContract).",
  },
  {
    n: "03",
    label: "DECODE",
    title: "Execution tree",
    body: "MultiSend + known privilege ABIs — not selector substring scans.",
    product: true,
  },
  {
    n: "04",
    label: "DIFF",
    title: "Privilege Diff",
    body: "Before → after for delays, modules, roles. UNKNOWN when unread.",
    product: true,
  },
  {
    n: "05",
    label: "LIMITS",
    title: "Honest coverage",
    body: "UNSUPPORTED stays visible. NO_VERDICT ≠ SAFE. Signer decides.",
  },
  {
    n: "06",
    label: "LATER",
    title: "Watch · Registry",
    body: "Monitoring prototype and shared memory — not the day-1 product.",
  },
] as const;

export const FLOW_BOARD_TITLE =
  "saviours — transaction review for treasury control" as const;

export const FLOW_BOARD_SUB =
  "Review · Privilege Diff · Safe hash integrity" as const;

export const FLOW_CONSUMERS = [
  { title: "Treasury signer", detail: "/review" },
  { title: "Builder", detail: "@saviours/check" },
  { title: "Watch (prototype)", detail: "/watch" },
] as const;

export const FLOW_GATE_STEPS = [
  { n: 1, text: "Import Safe JSON" },
  { n: 2, text: "Verify Safe tx hash (1.3+ domain)" },
  { n: 3, text: "Decode execution tree" },
  { n: 4, text: "Privilege Diff before → after" },
  { n: 5, text: "Show decision + coverage + limitations" },
  { n: 6, text: "Signer decides — never invent SAFE" },
] as const;

export const FLOW_SOURCES = [
  {
    title: "Review",
    detail: "Safe JSON · hash · Privilege Diff",
  },
  {
    title: "Watch",
    detail: "Prototype — not durable monitoring yet",
  },
  {
    title: "Legacy",
    detail: "ENS / investigate loop — deep link only",
  },
] as const;

export const PARTNER_STACK = ["QueueWatch", "Safe hash", "Privilege Diff"] as const;

export const PARTNER_LINES = {
  ens: "ENS staging is legacy film — Transaction Review is day-1.",
  graph: "Investigate loop remains a deep link, not the hero.",
  bazantic: "Optional metering — not the product.",
} as const;

export const HERO_ASSESS_PREVIEW = {
  decision: "WARN" as const,
  coverage: "PARTIAL" as const,
  headline: "Delay collapsed · module surface expanded",
  vault: "0x46DA…8613",
  rows: [
    { k: "Cooldown", v: "before ? → after 0" },
    { k: "Expiration", v: "→ 0" },
    { k: "Module", v: "new enableModule path" },
    { k: "Integrity", v: "Safe 1.3+ hash" },
  ],
  why: [
    "Security delay removed — execution can become immediate",
    "New module path into the Safe without owner threshold alone",
    "Classic Term Prop 5–class privilege capture pattern",
  ],
  evidence: "chain · Delay · Roles · Safe · decoder · hash",
} as const;

export const WORKFLOW_CARDS = [
  {
    title: "Review a transaction",
    body: "Import Safe JSON or calldata. Verify hash integrity. Decode the tree. See Privilege Diff — then sign elsewhere.",
    cta: "Open review →",
    href: "/review",
  },
  {
    title: "Watch (prototype)",
    body: "Allowlisted tip alerts only. Not a durable monitoring product yet — Review is the product.",
    cta: "Prototype →",
    href: "/watch",
  },
] as const;
