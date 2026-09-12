import {
  canonicalize,
  fetchDossier,
  getLatestIncidentByTarget,
  keccakUtf8,
  resolveIncident,
} from "@saviours/core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = { address?: string; chainId?: number };

/**
 * POST /api/fingerprint/recompute
 * Body: { address, chainId? }
 * Compare ENS/registry evidenceHash to dossier when available.
 * Always returns JSON — never HTML parse crashes.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const address = String(body.address ?? "").trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const resolved = await resolveIncident(address, {
      keys: ["saviours.dossier", "saviours.evidenceHash", "saviours.status"],
    });
    const dossierUrl = resolved.records["saviours.dossier"] ?? "";
    const ensEvidenceHash = (
      resolved.records["saviours.evidenceHash"] ?? ""
    ).toLowerCase();

    const registry = await getLatestIncidentByTarget(
      1,
      address as `0x${string}`,
      "sepolia",
    ).catch(() => null);

    if (!dossierUrl) {
      return NextResponse.json({
        forAddress: address,
        dossierUrl: null,
        ensEvidenceHash: ensEvidenceHash || null,
        registryEvidenceHash: registry?.evidenceHash ?? null,
        match: null,
        verdict: "NO_DOSSIER",
        status: resolved.records["saviours.status"] ?? null,
        note: "No saviours.dossier text on ENS — evidence hashes shown when present",
      });
    }

    let dossier: Awaited<ReturnType<typeof fetchDossier>> | null = null;
    let dossierError: string | null = null;
    try {
      dossier = await fetchDossier(dossierUrl);
    } catch (e) {
      dossierError = e instanceof Error ? e.message : "dossier fetch failed";
    }

    if (!dossier) {
      return NextResponse.json({
        forAddress: address,
        dossierUrl,
        dossierError,
        ensEvidenceHash: ensEvidenceHash || null,
        registryEvidenceHash: registry?.evidenceHash ?? null,
        match: null,
        verdict: "DOSSIER_UNREACHABLE",
        status: resolved.records["saviours.status"] ?? null,
      });
    }

    const canonical = canonicalize(dossier);
    const keccak = keccakUtf8(canonical);
    const dossierEvidenceHash = (dossier.evidenceHash ?? "").toLowerCase();
    const onchain = (
      registry?.evidenceHash ??
      ensEvidenceHash ??
      ""
    ).toLowerCase();

    const match =
      Boolean(onchain) &&
      (onchain === dossierEvidenceHash || onchain === keccak.toLowerCase());

    return NextResponse.json({
      forAddress: address,
      dossierUrl,
      dossierEvidenceHash,
      ensEvidenceHash: ensEvidenceHash || null,
      registryEvidenceHash: registry?.evidenceHash ?? null,
      keccakOfCanonicalDossier: keccak,
      match,
      verdict: match ? "MATCH" : "MISMATCH",
      status: resolved.records["saviours.status"] ?? null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Fingerprint recompute failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
