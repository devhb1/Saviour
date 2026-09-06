import { cacheKey, withCache } from "../evidence/cache";
import type { Evidence } from "../types";
import { collectAdapterAEvidence } from "../graph/adapterA";
import { collectAdapterBEvidence } from "../graph/adapterB";

/** Gather live Graph evidence from Adapter A + Adapter B (cached). */
export async function getEvidenceForAddress(
  chainId: number,
  address: string,
): Promise<Evidence[]> {
  const key = cacheKey({
    chainId,
    address,
    adapterName: "adapterA+B",
  });

  return withCache(key, async () => {
    const [a, b] = await Promise.all([
      collectAdapterAEvidence(chainId, address),
      collectAdapterBEvidence(chainId, address),
    ]);
    return [...a, ...b];
  });
}
