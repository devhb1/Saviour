/**
 * Watch subscriptions — works on Vercel (read-only FS) via in-memory +
 * optional local file when writable (local `next dev` / indexer).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type Subscriber = {
  id: string;
  chainId: number;
  target: string;
  label?: string;
  telegramChatId?: string;
  webhookUrl?: string;
  createdAt: string;
  durable: boolean;
};

const memory = new Map<string, Subscriber>();

const TERM_SEED: Subscriber[] = [
  {
    id: "seed-term-delay",
    chainId: 1,
    target: "0x35C99CF4a5DF2D9bCd822BeE32676D9590229e33",
    label: "Term Zodiac Delay (seed)",
    createdAt: "2026-11-16T00:00:00.000Z",
    durable: true,
  },
  {
    id: "seed-term-dao",
    chainId: 1,
    target: "0x0ae12AF3878a2d896f5C4DCE3Be7250FB187c0a6",
    label: "Term Aragon DAO (seed)",
    createdAt: "2026-11-16T00:00:00.000Z",
    durable: true,
  },
  {
    id: "seed-term-roles",
    chainId: 1,
    target: "0xD9DdE54D99a27F0f0E2b282369BFaa95528e9B75",
    label: "Term Zodiac Roles (seed)",
    createdAt: "2026-11-16T00:00:00.000Z",
    durable: true,
  },
];

function fileCandidates() {
  return [
    join(process.cwd(), "data", "subscribers.json"),
    join(process.cwd(), "../../packages/indexer/data/subscribers.json"),
    join(process.cwd(), "../../../packages/indexer/data/subscribers.json"),
  ];
}

function readFileSubs(): Subscriber[] {
  for (const p of fileCandidates()) {
    try {
      if (!existsSync(/*turbopackIgnore: true*/ p)) continue;
      const raw = JSON.parse(
        readFileSync(/*turbopackIgnore: true*/ p, "utf8"),
      ) as Array<Omit<Subscriber, "durable"> & { durable?: boolean }>;
      return raw.map((r) => ({ ...r, durable: r.durable ?? true }));
    } catch {
      /* try next */
    }
  }
  return [];
}

function tryWriteFile(rows: Subscriber[]): boolean {
  const p = join(process.cwd(), "data", "subscribers.json");
  try {
    mkdirSync(/*turbopackIgnore: true*/ join(process.cwd(), "data"), {
      recursive: true,
    });
    writeFileSync(
      /*turbopackIgnore: true*/ p,
      JSON.stringify(
        rows.filter((r) => !r.id.startsWith("seed-")),
        null,
        2,
      ),
    );
    return true;
  } catch {
    return false;
  }
}

export function listSubscribers(): Subscriber[] {
  const byId = new Map<string, Subscriber>();
  for (const s of [...TERM_SEED, ...readFileSubs(), ...memory.values()]) {
    byId.set(s.id, s);
  }
  return [...byId.values()];
}

export function addSubscriber(input: {
  chainId: number;
  target: string;
  label?: string;
  telegramChatId?: string;
  webhookUrl?: string;
}): Subscriber {
  const row: Subscriber = {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    chainId: input.chainId,
    target: input.target,
    label: input.label,
    telegramChatId: input.telegramChatId,
    webhookUrl: input.webhookUrl,
    createdAt: new Date().toISOString(),
    durable: false,
  };
  memory.set(row.id, row);

  const merged = listSubscribers();
  if (tryWriteFile(merged)) {
    row.durable = true;
    memory.set(row.id, row);
  }
  return row;
}
