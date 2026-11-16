/**
 * Saviour Privilege Guard — landing copy.
 * Day-1: Review + Watch. ENS/memory secondary.
 */

export const BRAND = "saviours" as const;

export const HERO_SOFT =
  "Privilege Guard for DAO treasuries and Safe signers." as const;

export const HERO_LINE_1 = "BEFORE YOU AUTHORIZE," as const;
export const HERO_LINE_2 = "KNOW WHO GAINS CONTROL." as const;

export const HERO_BODY =
  "Explain whether a transaction **zeros a delay**, **enables a module**, or widens roles — then match the Safe hash you will sign. Watch queues for CRITICAL privilege ops." as const;

export const HERO_FRAMING =
  "First experience: import the exact Safe transaction — or subscribe Watch alerts" as const;

export const HERO_CAST_PILL = "SIGNER DECIDES" as const;

export const MEMORY_FOOTER =
  "Privilege explained. Hash checked. You authorize." as const;

export const MEMORY_HIT_COST = "Base resolve · $0" as const;
export const MEMORY_HIT_COST_LONG =
  "Phase-2 memory · resolve from Base registry · $0 protocol fee" as const;
export const MEMORY_HIT_CAPTION =
  "Day-1 is Review + Watch. Registry memory is optional later." as const;

export function formatCostMeter(
  graph: number,
  ai: number,
  opts?: { ms?: number | string | null; usd?: number | null },
): string {
  const parts: string[] = [];
  if (graph === 0 && ai === 0) {
    parts.push("privilege assess", "$0");
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

export const HOW_MEMORY_EYEBROW = "// PRIVILEGE GUARD" as const;

export const HOW_MEMORY_TITLE =
  "Review the tx. Watch the queue. Decide." as const;

export const HOW_MEMORY_LEAD =
  "Focused on governance privilege mutation — not another generic Safe inspector. ENS staging stays legacy." as const;

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
    label: "REVIEW",
    title: "Import Safe tx",
    body: "JSON or calldata · recompute Safe hash · decode privilege actions.",
  },
  {
    n: "02",
    label: "EXPLAIN",
    title: "English risk",
    body: "Delay→0, enableModule, roles — plain language for signers.",
    product: true,
  },
  {
    n: "03",
    label: "WATCH",
    title: "Telegram CRITICAL",
    body: "Allowlisted Delay/DAO/Roles tips → alert when privilege mutates.",
  },
  {
    n: "04",
    label: "DECIDE",
    title: "You authorize",
    body: "NO_VERDICT ≠ SAFE. Coverage can be PARTIAL. Signer retains authority.",
  },
  {
    n: "05",
    label: "PHASE-2",
    title: "Shared memory",
    body: "Base registry + ENS staging optional — not required for day-1.",
  },
  {
    n: "06",
    label: "SCALE",
    title: "More queues",
    body: "3 Term targets first → 5 → 40 after the habit works.",
  },
] as const;

export const FLOW_BOARD_TITLE =
  "saviours — privilege guard for treasury signers" as const;

export const FLOW_BOARD_SUB =
  "Review · Watch · English privilege risk · Safe hash integrity" as const;

export const FLOW_CONSUMERS = [
  { title: "Treasury signer", detail: "/review" },
  { title: "Operator", detail: "/watch · Telegram" },
  { title: "Builder", detail: "@saviours/check" },
] as const;

export const FLOW_GATE_STEPS = [
  { n: 1, text: "Import Safe JSON or Watch a target" },
  { n: 2, text: "Verify Safe tx hash when provided" },
  { n: 3, text: "Decode privilege actions · English explain" },
  { n: 4, text: "Telegram CRITICAL on allowlisted queues" },
  { n: 5, text: "Show decision + coverage + integrity" },
  { n: 6, text: "Signer decides — never invent SAFE" },
] as const;

export const FLOW_SOURCES = [
  {
    title: "Review",
    detail: "Safe JSON · hash integrity · privilege bullets",
  },
  {
    title: "Watch",
    detail: "Term Delay/DAO/Roles · Telegram",
  },
  {
    title: "Legacy",
    detail: "ENS staging / investigate loop — deep link only",
  },
] as const;

export const PARTNER_STACK = ["QueueWatch", "Safe hash", "Telegram"] as const;

export const PARTNER_LINES = {
  ens: "ENS staging is legacy film — Privilege Guard is day-1.",
  graph: "Investigate loop remains as a deep link, not the hero.",
  bazantic: "Optional discovery metering — not the product.",
} as const;

export const HERO_ASSESS_PREVIEW = {
  decision: "WARN" as const,
  coverage: "PARTIAL" as const,
  headline: "Delay zeroed and a module enabled",
  vault: "0x46DA…8613",
  rows: [
    { k: "Cooldown", v: "→ 0 (delay collapse)" },
    { k: "Expiration", v: "→ 0" },
    { k: "Module", v: "DAO enabled on Delay" },
    { k: "Integrity", v: "hash MATCH" },
  ],
  why: [
    "Security delay removed — execution can become immediate",
    "New module path into the Safe without owner threshold alone",
    "Classic Term Prop 5–class privilege capture pattern",
  ],
  evidence: "chain · Delay · Roles · Safe · decoder · hash",
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
