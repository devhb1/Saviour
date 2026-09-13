import {
  ensureAttack1FilmReady,
  FilmLockError,
} from "@saviours/core";
import { assertWriteAllowed } from "../../../../lib/writeGuard";
import { jsonSafe } from "../../../../lib/jsonSafe";

export const runtime = "nodejs";

/**
 * POST /api/govern/heal-hero
 * Re-register / restore ATTACK-1 address-label to TAINTED.
 * Idempotent. Writes-gated. Safe to call from Naming Ceremony when passport is empty.
 */
export async function POST(request: Request) {
  const denied = assertWriteAllowed(request);
  if (denied) return denied;

  try {
    const result = await ensureAttack1FilmReady();
    return jsonSafe({ ok: true, ...result });
  } catch (err) {
    if (err instanceof FilmLockError) {
      return jsonSafe({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Heal failed";
    return jsonSafe({ error: message }, { status: 502 });
  }
}
