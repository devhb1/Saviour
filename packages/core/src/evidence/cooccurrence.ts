/**
 * Live REGISTRY_COOCCURRENCE enrichment.
 *
 * For each TAINTED peer (ENS/registry confirmed):
 * 1) Subject evidence already lists peer as counterparty → keep as-is
 * 2) Else pull peer's live Graph footprint; if subject appears as their
 *    counterparty, add a provenance Evidence row pointing at the peer
 *
 * Never invents edges. Peer Graph fetch uses fan-out + Adapter A directly
 * (not getEvidenceBundle) to avoid recursive co-occurrence.
 */

import { collectAdapterAEvidence } from "../graph/adapterA";
import { fanOut } from "../graph/standard";
import { cacheKey, withCache } from "./cache";
import type { Evidence, HexAddress } from "../types";
import type { TaintedPeer } from "../memory/taintedPeers";

function lc(a: string | undefined): string | null {
  if (!a) return null;
  return a.toLowerCase();
}

async function peerFootprint(
  chainId: number,
  peer: HexAddress,
): Promise<Evidence[]> {
  const key = cacheKey({
    chainId,
    address: peer,
    adapterName: "cooccur-peer-footprint",
  });
  return withCache(key, async () => {
    const [fan, adapterA] = await Promise.all([
      fanOut(peer, { first: 25 }),
      collectAdapterAEvidence(chainId, peer),
    ]);
    return [...fan.evidence, ...adapterA];
  });
}

function subjectTouchesPeer(
  subjectEvidence: Evidence[],
  peer: string,
): Evidence[] {
  return subjectEvidence.filter((e) => lc(e.counterparty) === peer);
}

function peerTouchesSubject(
  peerEvidence: Evidence[],
  subject: string,
): Evidence[] {
  return peerEvidence.filter((e) => lc(e.counterparty) === subject);
}

/**
 * Append co-occurrence Evidence (if any) for REGISTRY_COOCCURRENCE detection.
 */
export async function enrichCooccurrenceEvidence(input: {
  chainId: number;
  address: HexAddress;
  evidence: Evidence[];
  taintedPeers: TaintedPeer[];
}): Promise<{ evidence: Evidence[]; linkedPeers: string[] }> {
  const subject = input.address.toLowerCase() as HexAddress;
  const out = [...input.evidence];
  const linked = new Set<string>();
  let hopIdx = 0;

  for (const peer of input.taintedPeers) {
    if (peer.address === subject) continue;

    const direct = subjectTouchesPeer(out, peer.address);
    if (direct.length) {
      linked.add(peer.address);
      continue;
    }

    const footprint = await peerFootprint(input.chainId, peer.address);
    const reverse = peerTouchesSubject(footprint, subject);
    if (!reverse.length) continue;

    linked.add(peer.address);
    const sample = reverse[0]!;
    hopIdx += 1;
    out.push({
      id: `cooccur:${peer.address.slice(2, 10)}:${hopIdx}`,
      source: "saviours:cooccurrence",
      reference: sample.txHash ?? sample.reference,
      claim: `Live Graph link: subject appears as counterparty of TAINTED ${peer.address} (${peer.source}); sample from ${sample.source}`,
      timestamp: sample.timestamp,
      rawHash: sample.rawHash,
      kind: sample.kind ?? "protocol",
      protocol: sample.protocol,
      txHash: sample.txHash,
      counterparty: peer.address,
      amountUSD: sample.amountUSD,
      block: sample.block,
    });
  }

  return { evidence: out, linkedPeers: [...linked] };
}
