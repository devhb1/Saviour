import {
  ensNameForAddress,
  getLatestIncidentByTarget,
  isEnsIdentityReady,
  loadEnsIdentity,
  resolveIncident,
} from "@saviours/core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/resolve?address=0x…
 * Live ENS text records + cast snippet + registry row (if any).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = String(url.searchParams.get("address") ?? "");
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    if (!isEnsIdentityReady()) {
      return NextResponse.json(
        { error: "ENS identity not ready" },
        { status: 503 },
      );
    }
    const identity = loadEnsIdentity().identity;
    const ensName = ensNameForAddress(address);
    const resolved = await resolveIncident(address);
    const registry = await getLatestIncidentByTarget(
      1,
      address.toLowerCase() as `0x${string}`,
      "sepolia",
    ).catch(() => null);

    const cast = [
      `cast call ${identity.permissionedResolver} \\`,
      `  "text(bytes32,string)(string)" $(cast namehash ${ensName}) saviours.status \\`,
      `  --rpc-url $SEPOLIA_RPC_URL`,
    ].join("\n");

    return NextResponse.json({
      address: address.toLowerCase(),
      ensName,
      parentName: identity.parentName,
      permissionedResolver: identity.permissionedResolver,
      hit: resolved.hit,
      source: resolved.source,
      records: resolved.records,
      registry: registry
        ? {
            incidentId: registry.incidentId,
            status: registry.status,
            evidenceHash: registry.evidenceHash,
            confidenceBucket: registry.confidenceBucket,
            createdAt: registry.createdAt,
            expiresAt: registry.expiresAt,
          }
        : null,
      cast,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resolve failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
