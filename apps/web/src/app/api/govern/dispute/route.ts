import { disputeIncident } from "@saviours/core";
import { NextResponse } from "next/server";

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
 */
export async function POST(request: Request) {
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
    return NextResponse.json({ dispute: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Dispute failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
