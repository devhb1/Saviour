import { NextResponse } from "next/server";
import { auditSafe } from "@saviours/check";
import type { Hex } from "viem";
import { clientIp, rateLimitConsume } from "../../../lib/rateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

/** Baseline Permission Auditor for a Safe address (mainnet). */
export async function GET(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimitConsume(`audit:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate limit exceeded — retry shortly" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const url = new URL(req.url);
  const safe = url.searchParams.get("safe");
  const chainId = Number(url.searchParams.get("chainId") || "1");
  if (!safe || !ADDR_RE.test(safe)) {
    return NextResponse.json(
      { error: "safe=0x… (40 hex) required" },
      { status: 400 },
    );
  }

  // Validate probe members; drop invalid — never inject severity via query flags
  const probeMembers = url.searchParams
    .getAll("member")
    .filter((m) => ADDR_RE.test(m)) as Hex[];

  // Reject legacy injection knobs loudly
  if (url.searchParams.has("suspectFreeRecipient")) {
    return NextResponse.json(
      {
        error:
          "suspectFreeRecipient is not accepted on the public API (fixture/CLI only)",
      },
      { status: 400 },
    );
  }

  const blockRaw = url.searchParams.get("block");
  let blockNumber: bigint | undefined;
  if (blockRaw) {
    if (!/^\d+$/.test(blockRaw)) {
      return NextResponse.json(
        { error: "block must be a decimal block number" },
        { status: 400 },
      );
    }
    blockNumber = BigInt(blockRaw);
  }

  try {
    const report = await auditSafe({
      safeAddress: safe as Hex,
      chainId,
      probeMembers: probeMembers.length ? probeMembers : undefined,
      blockNumber,
    });
    return NextResponse.json(
      { ok: true, report },
      {
        headers: {
          "X-RateLimit-Remaining": String(rl.remaining),
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
