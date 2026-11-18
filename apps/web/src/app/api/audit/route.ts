import { NextResponse } from "next/server";
import { auditSafe } from "@saviours/check";
import type { Hex } from "viem";
import { clientIp, rateLimitConsume } from "../../../lib/rateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * Baseline Permission Auditor for a Safe address (mainnet).
 *
 * Response contract:
 * - ok true  + status COMPLETE|PARTIAL → usable report (PARTIAL still has gaps)
 * - ok false + status INCONCLUSIVE     → snapshot/essential evidence failed
 * - ok false + status INVALID_INPUT    → bad chain/address (also HTTP 400)
 *
 * Never treat HTTP 200 alone as a successful audit — read `status` and `ok`.
 */
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
      {
        ok: false,
        status: "INVALID_INPUT",
        error: "safe=0x… (40 hex) required",
      },
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
        ok: false,
        status: "INVALID_INPUT",
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
        {
          ok: false,
          status: "INVALID_INPUT",
          error: "block must be a decimal block number",
        },
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
    const status = report.status;
    const ok = status === "COMPLETE" || status === "PARTIAL";
    const httpStatus =
      status === "INVALID_INPUT" ? 400 : status === "INCONCLUSIVE" ? 422 : 200;

    return NextResponse.json(
      {
        ok,
        status,
        report,
        ...(ok
          ? {}
          : {
              error:
                status === "INVALID_INPUT"
                  ? report.errors[0] ?? "invalid input"
                  : report.errors[0] ??
                    "Audit inconclusive — essential evidence could not be established",
            }),
      },
      {
        status: httpStatus,
        headers: {
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-Audit-Status": status,
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        status: "INCONCLUSIVE",
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
