/**
 * Product story copy — Hook + Docs.
 * V2: Base registry + QueueWatch pre-sign; Sepolia ENS remains staging memory.
 */

export const HERO_SOFT =
  "Privileged actions sit in queues for days. Wallets still sign blind." as const;

export const HERO_LINE_1 = "WARN BEFORE IT EXECUTES." as const;
export const HERO_LINE_2 = "RESOLVE FREE ON BASE." as const;

export const HERO_BODY =
  "**Security memory** for wallets, agents, and treasury signers. QueueWatch catches privileged ops before earliestExec; proven threats stay TAINTED. Resolve is **$0** protocol fee on Base." as const;

export const HERO_FRAMING =
  "Example: known exploiter (Horizon B) — or open Review for a queue op" as const;

export const HERO_CAST_PILL = "CAST WORKS IF WE DIE" as const;

export const MEMORY_FOOTER =
  "Discovery is metered once. Memory resolves free forever." as const;

/**
 * MEMORY HIT cost framing — never lead with “0 Graph”.
 * That reads as anti-Graph; the truth is Graph already did the work once.
 */
export const MEMORY_HIT_COST = "Base resolve · $0" as const;
export const MEMORY_HIT_COST_LONG =
  "Named once · resolve from Base registry · $0" as const;
export const MEMORY_HIT_CAPTION =
  "No re-query — finding kept in onchain security memory." as const;

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
  "From a queued op to a free Base resolve." as const;

export const HOW_MEMORY_LEAD =
  "QueueWatch decodes before earliestExec. The registry remembers. Agents and wallets read $0." as const;

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
    label: "QUEUE",
    title: "QueueWatch decode",
    body: "Aragon / Zodiac / Safe module ops → severity. CRITICAL = vault WATCH only.",
  },
  {
    n: "02",
    label: "WATCH",
    title: "Pre-exec warn",
    body: "Affected vault WARN until earliestExec + 72h quarantine — or cancel clears it.",
  },
  {
    n: "03",
    label: "ATTEST",
    title: "Proven threats",
    body: "Attester writes TAINTED for confirmed attackers / impls (Makina-class).",
  },
  {
    n: "04",
    label: "RESOLVE",
    title: "Base registry",
    body: "resolve(chainId, subject) · NO_VERDICT never means ALLOW.",
  },
  {
    n: "05",
    label: "THE PRODUCT",
    title: "Wallets & agents read $0",
    body: "@saviours/check · MCP · cast — no founder API on a hit.",
    product: true,
  },
  {
    n: "06",
    label: "STAGING",
    title: "Sepolia ENS still live",
    body: "ETHOnline memory path remains for film; product home is Base.",
  },
] as const;

export const FLOW_BOARD_TITLE = "saviours — warn before exec, resolve free" as const;

export const FLOW_BOARD_SUB =
  "QueueWatch · Base registry · $0 protocol fee on hit" as const;

export const FLOW_CONSUMERS = [
  { title: "Wallet", detail: "@saviours/check" },
  { title: "Agent", detail: "MCP · Claude / Cursor" },
  { title: "Anyone", detail: "cast · public RPC" },
] as const;

export const FLOW_GATE_STEPS = [
  { n: 1, text: "QueueWatch decode privileged ops" },
  { n: 2, text: "WATCH vault before earliestExec" },
  { n: 3, text: "Cancel / expire / 72h quarantine" },
  { n: 4, text: "Attester TAINTED for proven malice" },
  { n: 5, text: "resolveBase · WARN / BLOCK / NO_VERDICT" },
  { n: 6, text: "Option B /review before you sign" },
] as const;

export const FLOW_SOURCES = [
  {
    title: "QueueWatch",
    detail: "Term / Thessaly fixtures · public CI",
  },
  {
    title: "Base registry V2",
    detail: "Ops lifecycle · AuthorityLink · 7702",
  },
  {
    title: "Sepolia ENS (staging)",
    detail: "ETHOnline memory path still live",
  },
] as const;

export const PARTNER_STACK = ["QueueWatch", "Base", "ENS staging"] as const;

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
