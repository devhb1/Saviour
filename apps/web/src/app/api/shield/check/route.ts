import { checkTarget } from "@saviours/core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  /** Chain of the target (mainnet threats → 1). Not the registry chain. */
  chainId?: number;
  address?: string;
  /** Where memory lives: sepolia (default) or anvil */
  registryNetwork?: "sepolia" | "anvil";
};

/**
 * POST /api/shield/check
 * Body: { chainId, address, registryNetwork? }
 *
 * Tier-1: ENS text first → registry fallback. Never Graph, never AI.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const chainIdRaw = body.chainId;
  const chainId =
    chainIdRaw === undefined || chainIdRaw === null
      ? 1
      : Number(chainIdRaw);
  const address = String(body.address ?? "");

  if (!Number.isInteger(chainId) || chainId <= 0) {
    return NextResponse.json({ error: "Invalid chainId" }, { status: 400 });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const result = await checkTarget({
      targetChainId: chainId,
      address,
      registryNetwork: body.registryNetwork,
    });
    return NextResponse.json({
      check: result,
      memoryHit:
        result.source === "ens" || result.source === "registry"
          ? {
              graphQueries: 0,
              aiCalls: 0,
              ensResolutions: result.cost.ensResolutions,
              latencyMs: result.latencyMs,
              source: result.source,
            }
          : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Shield check failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
