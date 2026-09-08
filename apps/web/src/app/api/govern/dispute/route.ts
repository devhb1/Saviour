import { disputeIncident } from "@saviours/core";
import { NextResponse } from "next/server";
import { assertWriteAllowed } from "../../../../lib/writeGuard";

export const runtime = "nodejs";

type Body = {
  address?: string;
  reason?: string;
};

/**
 * POST /api/govern/dispute
 * Body: { address, reason }
 *
 * Disputer key (server env) flips ENS status → WATCH and writes saviours.dispute.
 * Shield Tier-1 then returns WARN (ENS-first).
 * Renew to 7d only when it *extends* expiry (TAINTED 10y cannot be shortened).
 */
export async function POST(request: Request) {
  const denied = assertWriteAllowed(request);
  if (denied) return denied;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const address = String(body.address ?? "");
  const reason = String(body.reason ?? "");
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }
  if (!reason.trim()) {
    return NextResponse.json({ error: "reason required" }, { status: 400 });
  }

  try {
    const result = await disputeIncident({ address, reason });
    return NextResponse.json({
      dispute: result,
      honesty: {
        statusNow: "WATCH",
        renewSkipped: result.renewSkipped,
        expiryNote: result.renewSkipped
          ? "ENS status is WATCH; name expiry was NOT shortened (TAINTED 10y cannot reduce to 7d)."
          : "ENS status WATCH; expiry renewed toward 7d window.",
        shieldExpect: "WARN via ENS-first",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Dispute failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
