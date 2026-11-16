import { NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";

type Subscriber = {
  id: string;
  chainId: number;
  target: string;
  label?: string;
  telegramChatId?: string;
  webhookUrl?: string;
  createdAt: string;
};

function path() {
  const dir = join(process.cwd(), "../../packages/indexer/data");
  mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
  return join(dir, "subscribers.json");
}

function load(): Subscriber[] {
  const p = path();
  if (!existsSync(/*turbopackIgnore: true*/ p)) return [];
  return JSON.parse(
    readFileSync(/*turbopackIgnore: true*/ p, "utf8"),
  ) as Subscriber[];
}

function save(rows: Subscriber[]) {
  writeFileSync(/*turbopackIgnore: true*/ path(), JSON.stringify(rows, null, 2));
}

export async function GET() {
  return NextResponse.json({ subscribers: load() });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    chainId?: number;
    target?: string;
    label?: string;
    telegramChatId?: string;
    webhookUrl?: string;
  };
  const target = body.target?.trim();
  if (!target || !/^0x[a-fA-F0-9]{40}$/.test(target)) {
    return NextResponse.json({ error: "valid target 0x address required" }, { status: 400 });
  }
  const row: Subscriber = {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    chainId: body.chainId ?? 1,
    target,
    label: body.label,
    telegramChatId: body.telegramChatId?.trim() || undefined,
    webhookUrl: body.webhookUrl?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  const rows = load();
  rows.push(row);
  save(rows);
  return NextResponse.json({ ok: true, subscriber: row });
}
