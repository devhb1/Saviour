import { resolveTargetInput } from "@saviours/core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/resolve-target?q=jaredfromsubway.eth
 * GET /api/resolve-target?q=0x… · <addr>.saviours.eth
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const result = await resolveTargetInput(q);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
