import { askAboutCase, type AskPacket } from "@saviours/core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 45;

type Body = {
  address?: string;
  question?: string;
  packet?: AskPacket;
  chainId?: number;
};

/**
 * POST /api/case/ask
 * Body: { address, question, packet? }
 *
 * Bazantic gateway 404s path-param routes like /api/case/{address}/ask.
 * This body form is the agent-safe path.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const address = String(body.address ?? body.packet?.address ?? "")
    .trim()
    .toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
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
