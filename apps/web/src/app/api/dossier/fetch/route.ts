import { fetchDossier } from "@saviours/core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  /** ipfs://CID or https://…/dossiers/<hash>.json */
  url?: string;
};

/**
 * POST /api/dossier/fetch
 * Body: { url }
 * Fetches a pinned investigation dossier (never invents CIDs).
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = String(body.url ?? "").trim();
  if (!url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  try {
    const dossier = await fetchDossier(url);
    return NextResponse.json({ dossier });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Dossier fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
