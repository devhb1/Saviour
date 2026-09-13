import {
  FilmLockError,
  invalidateIncidentListCache,
  isFilmLockedAddress,
  revokeIncidentName,
} from "@saviours/core";
import { assertWriteAllowed } from "../../../../lib/writeGuard";
import { jsonSafe } from "../../../../lib/jsonSafe";

export const runtime = "nodejs";

type Body = {
  address?: string;
  note?: string;
};

/**
 * POST /api/govern/revoke
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
  if (isFilmLockedAddress(address)) {
    return jsonSafe(
      {
        error:
          "ATTACK-1 is film-locked (core). Revoke unregisters the address-label and breaks Naming Ceremony. Use BOT-1.",
        code: "FILM_LOCKED",
      },
      { status: 403 },
    );
  }

  try {
    const result = await revokeIncidentName({
      address,
      note: body.note,
    });
    invalidateIncidentListCache();
    return jsonSafe({
      revoke: {
        ...result,
        tokenId: result.tokenId.toString(),
      },
      honesty: {
        ens: "unregistered — resolveIncident miss",
        registry: result.registryNote,
        shieldExpect:
          "ENS miss; Shield may still BLOCK via append-only SavioursRegistry (source=registry). Narrate ENS-first vs ledger.",
      },
    });
  } catch (err) {
    if (err instanceof FilmLockError) {
      return jsonSafe({ error: err.message, code: "FILM_LOCKED" }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Revoke failed";
    return jsonSafe({ error: message }, { status: 502 });
  }
}
