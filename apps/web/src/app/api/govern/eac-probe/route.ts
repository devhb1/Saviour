import { probeInvestigatorDispute } from "@saviours/core";
import { assertWriteAllowed } from "../../../../lib/writeGuard";
import { jsonSafe } from "../../../../lib/jsonSafe";

export const runtime = "nodejs";

type Body = { address?: string };

/**
 * POST /api/govern/eac-probe
 * Investigator attempts setText(saviours.dispute) — expect live EAC revert.
 */
export async function POST(request: Request) {
  const denied = assertWriteAllowed(request);
  if (denied) return denied;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return jsonSafe({ error: "Invalid JSON body" }, { status: 400 });
  }

  const address = String(body.address ?? "");
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return jsonSafe({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const result = await probeInvestigatorDispute(address);
    return jsonSafe(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "EAC probe failed";
    return jsonSafe({ error: message }, { status: 502 });
  }
}
