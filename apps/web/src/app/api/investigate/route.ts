import { investigateAndRemember } from "@saviours/core";
import { NextResponse } from "next/server";

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
};

/**
 * POST /api/investigate
 * Body: { chainId, address, persist?, registryNetwork? }
 * Live Graph → AI classify → validateAssessment → optional Remember write.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const chainId = Number(body.chainId);
  const address = String(body.address ?? "");

  if (!Number.isInteger(chainId) || chainId <= 0) {
    return NextResponse.json({ error: "Invalid chainId" }, { status: 400 });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const { assessment, remember } = await investigateAndRemember(chainId, address, {
      persist: body.persist,
      registryNetwork: body.registryNetwork,
    });
    return NextResponse.json({ assessment, remember });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Investigation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
