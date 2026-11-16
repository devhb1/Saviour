import { NextResponse } from "next/server";
import { readCurrentControls } from "@saviours/check";
import type { Hex } from "viem";

export const dynamic = "force-dynamic";

/** Read live Delay/Safe control state for Privilege Diff before-values. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const chainId = Number(url.searchParams.get("chainId") || "1");
  const delay = url.searchParams.get("delay") as Hex | null;
  const safe = url.searchParams.get("safe") as Hex | null;
  if (!delay && !safe) {
    return NextResponse.json(
      { error: "delay or safe query param required" },
      { status: 400 },
    );
  }
  const controls = await readCurrentControls({
    chainId,
    delayOrTimelock: delay || undefined,
    safeAddress: safe || undefined,
  });
  return NextResponse.json({ ok: true, controls });
}
