import { investigateAndRemember } from "@saviours/core";
import { assertWriteAllowed } from "../../../lib/writeGuard";
import { jsonSafe } from "../../../lib/jsonSafe";

export const runtime = "nodejs";
/** Investigations call Graph + OpenAI (+ optional registry write); allow enough time. */
export const maxDuration = 60;

type Body = {
  chainId?: number;
  address?: string;
  /** Persist WATCH/TAINTED when registry is deployed. Default true. */
  persist?: boolean;
  /** sepolia (default) or anvil */
  registryNetwork?: "sepolia" | "anvil";
  /** Force Graph+AI even when Shield has memory. Default false. */
  forceFresh?: boolean;
};

/**
 * POST /api/investigate
 * Body: { chainId, address, persist?, registryNetwork?, forceFresh? }
 * Shield pre-check → (MEMORY HIT | live Graph + explain LLM + signal gate) → optional Remember.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return jsonSafe({ error: "Invalid JSON body" }, { status: 400 });
  }

  const chainIdRaw = body.chainId;
  const chainId =
    chainIdRaw === undefined || chainIdRaw === null
      ? 1
      : Number(chainIdRaw);
  const address = String(body.address ?? "");
  const persist = body.persist !== false;

  if (!Number.isInteger(chainId) || chainId <= 0) {
    return jsonSafe({ error: "Invalid chainId" }, { status: 400 });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return jsonSafe({ error: "Invalid address" }, { status: 400 });
  }

  if (persist) {
    const denied = assertWriteAllowed(request);
    if (denied) return denied;
  }

  try {
    const { assessment, remember, run } = await investigateAndRemember(
      chainId,
      address,
      {
        persist: body.persist,
        registryNetwork: body.registryNetwork,
        forceFresh: body.forceFresh,
      },
    );
    return jsonSafe({
      assessment,
      remember,
      signals: run.signals,
      banner: run.banner,
      protocols: run.protocols,
      excluded: run.excluded,
      explanation: run.explanation,
      trace: run.trace,
      cost: run.cost,
      memoryHit: run.memoryHit,
      shield: {
        decision: run.shield.decision,
        reason: run.shield.reason,
        source: run.shield.source,
        usedAi: run.shield.usedAi,
        latencyMs: run.shield.latencyMs,
        ensName: run.shield.ensName,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Investigation failed";
    return jsonSafe({ error: message }, { status: 502 });
  }
}
