import {
  canonicalize,
  fetchDossier,
  getLatestIncidentByTarget,
  keccakUtf8,
  resolveIncident,
} from "@saviours/core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = { address?: string };

/**
 * POST /api/fingerprint/recompute
 * Body: { address }
 * Fetch dossier from ENS → canonicalize → keccak → compare to on-chain evidenceHash.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const address = String(body.address ?? "");
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
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

    if (!dossierUrl) {
      return NextResponse.json(
        { error: "No saviours.dossier text on ENS" },
        { status: 404 },
      );
    }

    const dossier = await fetchDossier(dossierUrl);
    const canonical = canonicalize(dossier);
    const keccak = keccakUtf8(canonical);
    const dossierEvidenceHash = (dossier.evidenceHash ?? "").toLowerCase();

    const registry = await getLatestIncidentByTarget(
      1,
      address.toLowerCase() as `0x${string}`,
      "sepolia",
    ).catch(() => null);
    const onchain = (
      registry?.evidenceHash ??
      ensEvidenceHash ??
      ""
    ).toLowerCase();

    const match =
      Boolean(onchain) &&
      (onchain === dossierEvidenceHash ||
        onchain === keccak.toLowerCase());

    return NextResponse.json({
      dossierUrl,
      dossierEvidenceHash,
      ensEvidenceHash: ensEvidenceHash || null,
      registryEvidenceHash: registry?.evidenceHash ?? null,
      keccakOfCanonicalDossier: keccak,
      match,
      verdict: match ? "MATCH ✓" : "MISMATCH",
      status: resolved.records["saviours.status"] ?? null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Fingerprint recompute failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
