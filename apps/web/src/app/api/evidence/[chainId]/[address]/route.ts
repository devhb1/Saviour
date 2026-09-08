import { getEvidenceBundle } from "@saviours/core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ chainId: string; address: string }>;
};

/**
 * GET /api/evidence/:chainId/:address
 * Returns live The Graph evidence (Messari fan-out + Adapter A) + signals.
 * No static blockchain payloads.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { chainId: chainIdRaw, address } = await context.params;
  const chainId = Number(chainIdRaw);

  if (!Number.isInteger(chainId) || chainId <= 0) {
    return NextResponse.json({ error: "Invalid chainId" }, { status: 400 });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
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
          status: r.status,
          ms: r.ms,
          rowCount: r.rowCount,
          error: r.error,
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
    const message = err instanceof Error ? err.message : "Evidence lookup failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
