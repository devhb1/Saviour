/**
 * Product story copy — single source of truth for Hook + Docs.
 * Product-true; Option A (Graph+Saviours) aligned; no Uniswap live claims.
 */

export const HERO_STATUS_PILL = "SEPOLIA · ENS MEMORY · LIVE" as const;

/** SourceMark-style two-beat thesis */
export const HERO_LINE_1 = "SECURITY MEMORY." as const;
export const HERO_LINE_2 = "RESOLVE FOR $0." as const;

/**
 * Mono body — render with bold on marked segments.
 * Phrases in ** are highlighted at render time.
 */
export const HERO_BODY =
  "Public **security memory** for AI agents and wallets. ENS text records are the API — **cast works if we die**. Investigate once on The Graph; name on ENSv2; every agent after resolves free. The registry stays on-chain forever." as const;

export const HERO_MECHANISM =
  "Investigate once · Name on ENS · Resolve $0 forever." as const;

export const HERO_FRAMING = "Example: a known exploiter — try your own" as const;

export const MEMORY_FOOTER =
  "Discovery is metered once. Memory resolves free forever." as const;

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
  /** SourceMark-style “the product” highlight */
  product?: boolean;
};

export const MEMORY_STAGES: readonly MemoryStage[] = [
  {
    n: "01",
    label: "RESOLVE",
    title: "Check memory",
    body: "ENS saviours.status first — 0 Graph · 0 AI · $0.",
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
  { n: 2, text: "Named? → HIT BLOCK/WARN · 0 Graph · 0 AI · $0" },
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

/** Split HERO_BODY on **markers** into plain / bold segments. */
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
