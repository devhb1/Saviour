import { revokeIncidentName } from "@saviours/core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  address?: string;
  note?: string;
};

/**
 * POST /api/govern/revoke
 * Body: { address, note? }
 *
 * Relayer clears saviours.status and UserRegistry.unregister(label).
 * Registry rows remain append-only in this cut (see result.registryNote).
 */
export async function POST(request: Request) {
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
    const result = await revokeIncidentName({
      address,
      note: body.note,
    });
    return NextResponse.json({ revoke: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Revoke failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
