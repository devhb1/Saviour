import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";

type TipState = {
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

function loadCsv() {
  try {
    const path = join(process.cwd(), "../../fixtures/queues/initial-5.csv");
        const text = readFileSync(/*turbopackIgnore: true*/ path, "utf8").trim();
    const [header, ...lines] = text.split("\n");
    const cols = header.split(",");
    return lines.filter(Boolean).map((line) => {
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
  } catch {
    return [];
  }
}

function loadTip(): TipState | null {
  const candidates = [
    join(process.cwd(), "../../packages/indexer/data/tip-1.json"),
    join(process.cwd(), "../../../packages/indexer/data/tip-1.json"),
  ];
  for (const p of candidates) {
    if (existsSync(/*turbopackIgnore: true*/ p)) {
      try {
        return JSON.parse(
          readFileSync(/*turbopackIgnore: true*/ p, "utf8"),
        ) as TipState;
      } catch {
        /* continue */
      }
    }
  }
  return null;
}

function computeHealth(tip: TipState | null) {
  const STALE_MS = 10 * 60 * 1000;
  const updatedAtMs = tip?.updatedAtMs ?? null;
  const stale =
    updatedAtMs == null || Date.now() - updatedAtMs > STALE_MS || tip?.lastProcessedBlock == null;
  return {
    lastProcessedBlock: tip?.lastProcessedBlock ?? null,
    stale,
    updatedAt: updatedAtMs ? new Date(updatedAtMs).toISOString() : null,
    lastCriticalAt: tip?.lastCriticalAt ?? null,
    note: tip
      ? "Watch tip file present — poller/replay has run"
      : "No tip yet — run pnpm --filter @saviours/indexer replay or start",
  };
}

export async function GET() {
  const queues = loadCsv();
  const tip = loadTip();
  return NextResponse.json({
    queues,
    health: computeHealth(tip),
    recentAlerts: tip?.alerts?.slice(0, 10) ?? [],
  });
}
