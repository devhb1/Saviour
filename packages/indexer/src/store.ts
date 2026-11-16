import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type AlertEvent = {
  id: string;
  at: string;
  chainId: number;
  queue: string;
  protocol: string;
  severity: string;
  summary: string;
  bullets: string[];
  txHash?: string;
  data?: string;
  to?: string;
  reviewPath: string;
};

export type TipState = {
  chainId: number;
  lastProcessedBlock: number | null;
  updatedAtMs: number | null;
  lastCriticalAt: string | null;
  alerts: AlertEvent[];
};

export type Subscriber = {
  id: string;
  chainId: number;
  target: string;
  label?: string;
  telegramChatId?: string;
  webhookUrl?: string;
  createdAt: string;
};

function dataDir() {
  return join(dirname(fileURLToPath(import.meta.url)), "../data");
}

function tipPath(chainId = 1) {
  return join(dataDir(), `tip-${chainId}.json`);
}

function subscribersPath() {
  return join(dataDir(), "subscribers.json");
}

export function ensureDataDir() {
  mkdirSync(dataDir(), { recursive: true });
}

export function loadTip(chainId = 1): TipState {
  ensureDataDir();
  const p = tipPath(chainId);
  if (!existsSync(p)) {
    return {
      chainId,
      lastProcessedBlock: null,
      updatedAtMs: null,
      lastCriticalAt: null,
      alerts: [],
    };
  }
  return JSON.parse(readFileSync(p, "utf8")) as TipState;
}

export function saveTip(tip: TipState) {
  ensureDataDir();
  writeFileSync(tipPath(tip.chainId), JSON.stringify(tip, null, 2));
}

export function loadSubscribers(): Subscriber[] {
  ensureDataDir();
  const p = subscribersPath();
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, "utf8")) as Subscriber[];
}

export function saveSubscribers(rows: Subscriber[]) {
  ensureDataDir();
  writeFileSync(subscribersPath(), JSON.stringify(rows, null, 2));
}

export function addSubscriber(
  input: Omit<Subscriber, "id" | "createdAt">,
): Subscriber {
  const rows = loadSubscribers();
  const row: Subscriber = {
    ...input,
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  rows.push(row);
  saveSubscribers(rows);
  return row;
}
