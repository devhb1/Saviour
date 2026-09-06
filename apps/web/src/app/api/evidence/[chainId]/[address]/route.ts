import { getEvidenceForAddress } from "@saviours/core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ chainId: string; address: string }>;
};

/**
 * GET /api/evidence/:chainId/:address
 * Returns live The Graph evidence (Adapter A + Messari Adapter B).
 * No static blockchain payloads.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { chainId: chainIdRaw, address } = await context.params;
  const chainId = Number(chainIdRaw);

  if (!Number.isInteger(chainId) || chainId <= 0) {
    return NextResponse.json({ error: "Invalid chainId" }, { status: 400 });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const evidence = await getEvidenceForAddress(chainId, address);
    return NextResponse.json({
      chainId,
      address: address.toLowerCase(),
      count: evidence.length,
      evidence,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Evidence lookup failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
