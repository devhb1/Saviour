import { revokeIncidentName } from "@saviours/core";
import { NextResponse } from "next/server";
import { assertWriteAllowed } from "../../../../lib/writeGuard";

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
 * Registry rows remain append-only — Shield may still BLOCK via source=registry.
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
    const result = await revokeIncidentName({
      address,
      note: body.note,
    });
    return NextResponse.json({
      revoke: result,
      honesty: {
        ens: "unregistered — resolveIncident miss",
        registry: result.registryNote,
        shieldExpect:
          "ENS miss; Shield may still BLOCK via append-only SavioursRegistry (source=registry). Narrate ENS-first vs ledger.",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Revoke failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
