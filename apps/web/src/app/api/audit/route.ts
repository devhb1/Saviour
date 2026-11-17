import { NextResponse } from "next/server";
import { auditSafe } from "@saviours/check";
import type { Hex } from "viem";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Baseline Control-Path audit for a Safe address (mainnet). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const safe = url.searchParams.get("safe");
  const chainId = Number(url.searchParams.get("chainId") || "1");
  if (!safe || !/^0x[a-fA-F0-9]{40}$/.test(safe)) {
    return NextResponse.json(
      { error: "safe=0x… (40 hex) required" },
      { status: 400 },
    );
  }
  try {
    const report = await auditSafe({
      safeAddress: safe as Hex,
      chainId,
    });
    return NextResponse.json({ ok: true, report });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
