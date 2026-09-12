import { getEvidenceBundle } from "@saviours/core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/evidence
 * Body: { chainId, address }
 *
 * Bazantic MCP proxies GET path-param routes as
 *   /{slug}/api/evidence/{chainId}/{address} → 404 on the gateway.
 * POST + JSON body is the reliable agent path (same payload as Fan-Out).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      chainId?: number;
      address?: string;
    };
    const chainId = Number(body.chainId ?? 1);
    const address = (body.address ?? "").trim().toLowerCase();

    if (!Number.isInteger(chainId) || chainId <= 0) {
      return NextResponse.json({ error: "Invalid chainId" }, { status: 400 });
    }
    if (!/^0x[a-f0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const bundle = await getEvidenceBundle(chainId, address);
    return NextResponse.json({
      chainId: bundle.chainId,
      address: bundle.address,
      count: bundle.evidence.length,
      banner: bundle.banner,
      fanOut: {
        queryTemplates: bundle.fanOut.queryTemplates,
        protocolsQueried: bundle.fanOut.protocolsQueried,
        protocolsOk: bundle.fanOut.protocolsOk,
        protocolsEmpty: bundle.fanOut.protocolsEmpty,
        protocolsError: bundle.fanOut.protocolsError,
        rowCount: bundle.fanOut.rowCount,
        totalMs: bundle.fanOut.totalMs,
        excluded: bundle.fanOut.excluded,
        protocols: bundle.fanOut.results.map((r) => ({
          protocol: r.protocol,
          displayName: r.displayName,
          status: r.status,
          ms: r.ms,
          rowCount: r.rowCount,
          error: r.error,
          subgraphId: r.subgraphId,
          schema: r.schema,
          family: r.family,
        })),
      },
      adapterACount: bundle.adapterACount,
      taintedPeers: bundle.taintedPeers,
      cooccurrenceLinked: bundle.cooccurrenceLinked,
      signals: bundle.signals,
      signalStatus: bundle.signalStatus,
      evidence: bundle.evidence,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Evidence lookup failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
