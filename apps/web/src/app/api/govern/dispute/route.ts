import { disputeIncident, invalidateIncidentListCache } from "@saviours/core";
import { assertWriteAllowed } from "../../../../lib/writeGuard";
import { jsonSafe } from "../../../../lib/jsonSafe";

export const runtime = "nodejs";

type Body = {
  address?: string;
  reason?: string;
};

/**
 * POST /api/govern/dispute
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
  const reason = String(body.reason ?? "");
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return jsonSafe({ error: "Invalid address" }, { status: 400 });
  }
  if (!reason.trim()) {
    return jsonSafe({ error: "reason required" }, { status: 400 });
  }

  try {
    const result = await disputeIncident({ address, reason });
    invalidateIncidentListCache();
    return jsonSafe({
      dispute: {
        ...result,
        expiryUnix:
          result.expiryUnix != null ? result.expiryUnix.toString() : null,
      },
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
    return jsonSafe({ error: message }, { status: 502 });
  }
}
