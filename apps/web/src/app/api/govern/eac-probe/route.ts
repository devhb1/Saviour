import { probeInvestigatorDispute } from "@saviours/core";
import { NextResponse } from "next/server";
import { assertWriteAllowed } from "../../../../lib/writeGuard";

export const runtime = "nodejs";

type Body = { address?: string };

/**
 * POST /api/govern/eac-probe
 * Investigator attempts setText(saviours.dispute) — expect live EAC revert.
 * Write-gated (uses investigator key / gas) — same as dispute/revoke.
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
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const result = await probeInvestigatorDispute(address);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "EAC probe failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
