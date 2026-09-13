/**
 * Product story copy — Hook + Docs.
 * Hero: A soft line + C mechanism highlight; D as live cast proof-pill.
 */

export const HERO_SOFT =
  "Somebody proved it. Nobody wrote it down." as const;

export const HERO_LINE_1 = "INVESTIGATE ONCE." as const;
export const HERO_LINE_2 = "RESOLVE FREE, FOREVER." as const;

export const HERO_BODY =
  "**Security memory** for AI agents and wallets. Investigate once on The Graph; name on ENSv2; every resolve after is free — ENS is the API." as const;

export const HERO_FRAMING = "Example: a known exploiter — try your own" as const;

export const HERO_CAST_PILL = "CAST WORKS IF WE DIE" as const;

export const MEMORY_FOOTER =
  "Discovery is metered once. Memory resolves free forever." as const;

/**
 * MEMORY HIT cost framing — never lead with “0 Graph”.
 * That reads as anti-Graph; the truth is Graph already did the work once.
 */
export const MEMORY_HIT_COST = "ENS resolve · $0" as const;
export const MEMORY_HIT_COST_LONG =
  "The Graph already paid · resolve from ENS · $0" as const;
export const MEMORY_HIT_CAPTION =
  "No re-query — Graph finding kept in ENS memory." as const;

/** Receipt / meter line: reuse Graph work on hit; show Graph/AI only when spent. */
export function formatCostMeter(
  graph: number,
  ai: number,
  opts?: { ms?: number | string | null; usd?: number | null },
): string {
  const parts: string[] = [];
  if (graph === 0 && ai === 0) {
    parts.push("ENS resolve", "$0");
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

export const HOW_MEMORY_EYEBROW = "// HOW MEMORY WORKS" as const;

export const HOW_MEMORY_TITLE =
  "Six stages between a signature and a free resolve." as const;

export const HOW_MEMORY_LEAD =
  "The fifth is the product. Everything before it is plumbing; everything after only runs because it was named." as const;

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
    label: "RESOLVE",
    title: "Check memory",
    body: "ENS saviours.status first — resolve from memory · $0.",
  },
  {
    n: "02",
    label: "HIT",
    title: "BLOCK / WARN",
    body: "Named threat → agent stops. Free forever.",
  },
  {
    n: "03",
    label: "MISS",
    title: "Agent pays",
    body: "x402 ~$0.01 on Base via Bazantic — this website does not pay.",
  },
  {
    n: "04",
    label: "FAN OUT",
    title: "Ask The Graph",
    body: "5 Messari templates × 8 pinned deployments · honest empties.",
  },
  {
    n: "05",
    label: "THE PRODUCT",
    title: "Code decides · then Name",
    body: "Signals → LLM cites only → validateAssessment → <addr>.saviours.eth.",
    product: true,
  },
  {
    n: "06",
    label: "FOREVER",
    title: "Next agent free",
    body: "Same resolve path. Memory hit never re-pays.",
  },
] as const;

export const FLOW_BOARD_TITLE = "saviours — investigate once, resolve free" as const;

export const FLOW_BOARD_SUB =
  "Metered discovery · permanent ENS memory · $0 forever on hit" as const;

export const FLOW_CONSUMERS = [
  { title: "Wallet", detail: "@saviours/check" },
  { title: "Agent", detail: "MCP · Claude / Cursor" },
  { title: "Anyone", detail: "cast · public RPC" },
] as const;

export const FLOW_GATE_STEPS = [
  { n: 1, text: "Resolve ENS · saviours.status" },
  { n: 2, text: "Named? → HIT BLOCK/WARN · ENS resolve · $0" },
  { n: 3, text: "MISS → x402 · agent pays ~$0.01" },
  { n: 4, text: "Fan out · 5 templates × 8 Messari" },
  { n: 5, text: "deriveSignals · LLM cites · validateAssessment" },
  { n: 6, text: "Name on ENSv2 · WATCH 7d / TAINTED 10y" },
] as const;

export const FLOW_SOURCES = [
  {
    title: "The Graph — mainnet",
    detail: "Messari standardized · 3 excluded, stated",
  },
  {
    title: "ENSv2 Sepolia",
    detail: "PermissionedResolver · EAC role ceilings",
  },
  {
    title: "Bazantic x402",
    detail: "USDC on Base · Free / $0.01 / $0.05",
  },
] as const;

export const PARTNER_STACK = ["The Graph", "ENSv2", "Bazantic"] as const;

/** DEMO_CUE partner one-liners — Hook / Loop / Build depth docks. */
export const PARTNER_LINES = {
  ens: "The name is the API — our server can die and the verdict still resolves.",
  graph:
    "One standardized query, eight deployments, and the AI is not allowed to vote.",
  bazantic:
    "Free to remember, paid to discover — and the agent pays, not us.",
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
