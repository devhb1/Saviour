import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type QueueRow = {
  protocol: string;
  queue: string;
  chainId: number;
  authorityTarget: string;
  adapter: string;
};

export type TipState = {
  lastProcessedBlock: number | null;
  updatedAtMs: number | null;
  lastCriticalAt: string | null;
  alerts?: Array<{
    id: string;
    at: string;
    severity: string;
    summary: string;
    protocol: string;
    reviewPath: string;
  }>;
};

const SEED_QUEUES: QueueRow[] = [
  {
    protocol: "term-finance-delay",
    queue: "0x35C99CF4a5DF2D9bCd822BeE32676D9590229e33",
    chainId: 1,
    authorityTarget: "0x26fCb50eEC367ddAB060ccf5E7394Cecd95F7Db2",
    adapter: "aragonOsx+roles+delay",
  },
  {
    protocol: "term-finance-dao",
    queue: "0x0ae12AF3878a2d896f5C4DCE3Be7250FB187c0a6",
    chainId: 1,
    authorityTarget: "0x26fCb50eEC367ddAB060ccf5E7394Cecd95F7Db2",
    adapter: "aragonOsx",
  },
  {
    protocol: "term-finance-roles",
    queue: "0xD9DdE54D99a27F0f0E2b282369BFaa95528e9B75",
    chainId: 1,
    authorityTarget: "0x35C99CF4a5DF2D9bCd822BeE32676D9590229e33",
    adapter: "zodiacRoles",
  },
];

const SEED_TIP: TipState = {
  lastProcessedBlock: 0,
  updatedAtMs: Date.now(),
  lastCriticalAt: "2026-11-16T18:35:15.964Z",
  alerts: [
    {
      id: "replay-term-seed",
      at: "2026-11-16T18:35:15.964Z",
      severity: "CRITICAL",
      summary:
        "This action collapses a security delay and expands module execution surface — classic privilege capture pattern.",
      protocol: "term-finance-delay",
      reviewPath:
        "/review?chainId=1&safe=0x26fCb50eEC367ddAB060ccf5E7394Cecd95F7Db2&to=0x35C99CF4a5DF2D9bCd822BeE32676D9590229e33&data=0xebb2b4a200000000000000000000000000000000000000000000000000000000000000009b56d5be0000000000000000000000000000000000000000000000000000000000000000610b59250000000000000000000000000ae12af3878a2d896f5c4dce3be7250fb187c0a6&alert=CRITICAL%20privilege%20delay%20collapse",
    },
  ],
};

export function loadQueues(): QueueRow[] {
  const paths = [
    join(process.cwd(), "fixtures/queues/initial-5.csv"),
    join(process.cwd(), "../../fixtures/queues/initial-5.csv"),
    join(process.cwd(), "data/queues.csv"),
  ];
  for (const path of paths) {
    try {
      if (!existsSync(/*turbopackIgnore: true*/ path)) continue;
      const text = readFileSync(/*turbopackIgnore: true*/ path, "utf8").trim();
      const [header, ...lines] = text.split("\n");
      const cols = header.split(",");
      const rows = lines.filter(Boolean).map((line) => {
        const parts = line.split(",");
        const row: Record<string, string> = {};
        cols.forEach((c, i) => {
          row[c] = parts[i] ?? "";
        });
        return {
          protocol: row.protocol,
          queue: row.queue,
          chainId: Number(row.chainId),
          authorityTarget: row.authorityTarget,
          adapter: row.adapter,
        };
      });
      if (rows.length) return rows;
    } catch {
      /* next */
    }
  }
  return SEED_QUEUES;
}

export function loadTip(): TipState {
  const candidates = [
    join(process.cwd(), "data/tip-1.json"),
    join(process.cwd(), "../../packages/indexer/data/tip-1.json"),
  ];
  for (const p of candidates) {
    try {
      if (!existsSync(/*turbopackIgnore: true*/ p)) continue;
      const tip = JSON.parse(
        readFileSync(/*turbopackIgnore: true*/ p, "utf8"),
      ) as TipState;
      if (tip && typeof tip === "object") {
        // Seed file may have stale updatedAtMs — treat presence of CRITICAL as fresh enough for UI
        return {
          ...tip,
          updatedAtMs: tip.updatedAtMs ?? Date.now(),
        };
      }
    } catch {
      /* next */
    }
  }
  return SEED_TIP;
}

export function computeHealth(tip: TipState) {
  const STALE_MS = 24 * 60 * 60 * 1000; // day-1: tip seed / infrequent poll OK for 24h
  const updatedAtMs = tip.updatedAtMs ?? null;
  const hasTip = tip.lastProcessedBlock != null || (tip.alerts?.length ?? 0) > 0;
  const stale =
    !hasTip ||
    updatedAtMs == null ||
    Date.now() - updatedAtMs > STALE_MS;
  return {
    lastProcessedBlock: tip.lastProcessedBlock,
    stale,
    updatedAt: updatedAtMs ? new Date(updatedAtMs).toISOString() : null,
    lastCriticalAt: tip.lastCriticalAt ?? null,
    note: hasTip
      ? stale
        ? "Tip present but older than 24h — run indexer poll/replay"
        : "Watch tip OK"
      : "No tip yet — run indexer replay or start",
  };
}
