import { NextResponse } from "next/server";
import { readCurrentControls } from "@saviours/check";
import type { Hex } from "viem";
import { clientIp, rateLimitConsume } from "../../../../lib/rateLimit";

export const dynamic = "force-dynamic";

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

/** Read live Delay/Safe control state for Privilege Diff before-values. */
export async function GET(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimitConsume(`controls:${ip}`, { capacity: 40 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate limit exceeded — retry shortly" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const url = new URL(req.url);
  const chainId = Number(url.searchParams.get("chainId") || "1");
  const delayRaw = url.searchParams.get("delay");
  const safeRaw = url.searchParams.get("safe");
  const inconclusive = url.searchParams.get("inconclusive") === "1";
  const reason = url.searchParams.get("reason") ?? undefined;

  if (delayRaw && !ADDR_RE.test(delayRaw)) {
    return NextResponse.json({ error: "delay must be 0x + 40 hex" }, { status: 400 });
  }
  if (safeRaw && !ADDR_RE.test(safeRaw)) {
    return NextResponse.json({ error: "safe must be 0x + 40 hex" }, { status: 400 });
  }

  const delay = delayRaw as Hex | null;
  const safe = safeRaw as Hex | null;

  if (!delay && !safe && !inconclusive) {
    return NextResponse.json(
      { error: "delay or safe query param required" },
      { status: 400 },
    );
  }
  const controls = await readCurrentControls({
    chainId,
    delayOrTimelock: delay || undefined,
    safeAddress: safe || undefined,
    inconclusive,
    inconclusiveReason: reason,
  });
  return NextResponse.json(
    { ok: true, controls },
    { headers: { "X-RateLimit-Remaining": String(rl.remaining) } },
  );
}
