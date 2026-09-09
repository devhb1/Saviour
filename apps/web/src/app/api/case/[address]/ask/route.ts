import { askAboutCase, type AskPacket } from "@saviours/core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 45;

type Body = {
  question?: string;
  packet?: AskPacket;
};

/**
 * POST /api/case/[address]/ask
 * Read-only Q&A over the case packet + ENS/registry tools. Never writes.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ address: string }> },
) {
  const { address: raw } = await ctx.params;
  const address = decodeURIComponent(raw ?? "").toLowerCase();
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const question = String(body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }

  const packet: AskPacket = {
    ...(body.packet ?? { address }),
    address,
  };

  try {
    const result = await askAboutCase({ question, packet });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ask failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
