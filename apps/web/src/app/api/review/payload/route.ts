import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { clientIp, rateLimitConsume } from "../../../../lib/rateLimit";

export const dynamic = "force-dynamic";

const STORE = join(process.cwd(), ".data", "payloads");

async function ensureStore() {
  await mkdir(STORE, { recursive: true });
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Store Safe JSON / review payload; returns content digest. */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimitConsume(`payload:${ip}`, { capacity: 40 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
  }
  try {
    const body = (await req.json()) as {
      safeJson?: string;
      safe?: string;
      chainId?: number;
      expectedHash?: string;
    };
    if (!body.safeJson || typeof body.safeJson !== "string") {
      return NextResponse.json({ error: "safeJson required" }, { status: 400 });
    }
    if (body.safeJson.length > 200_000) {
      return NextResponse.json({ error: "payload too large" }, { status: 413 });
    }
    const digest = await sha256Hex(body.safeJson);
    const envelope = {
      digest,
      safe: body.safe ?? null,
      chainId: body.chainId ?? 1,
      expectedHash: body.expectedHash ?? null,
      safeJson: body.safeJson,
      storedAt: new Date().toISOString(),
    };
    let stored = false;
    try {
      await ensureStore();
      await writeFile(
        join(STORE, `${digest}.json`),
        JSON.stringify(envelope),
        "utf8",
      );
      stored = true;
    } catch {
      stored = false;
    }
    return NextResponse.json({ ok: true, digest, stored });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  const digest = new URL(req.url).searchParams.get("digest");
  if (!digest || !/^[a-f0-9]{64}$/.test(digest)) {
    return NextResponse.json({ error: "digest required" }, { status: 400 });
  }
  try {
    const raw = await readFile(join(STORE, `${digest}.json`), "utf8");
    return NextResponse.json({ ok: true, payload: JSON.parse(raw) });
  } catch {
    return NextResponse.json({ error: "payload not found" }, { status: 404 });
  }
}
