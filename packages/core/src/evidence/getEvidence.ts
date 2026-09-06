import { cacheKey, withCache } from "../evidence/cache";
import type { Evidence } from "../types";
import { collectAdapterAEvidence } from "../graph/adapterA";

/** Gather live Graph evidence for an address (cached). */
export async function getEvidenceForAddress(
  chainId: number,
  address: string,
): Promise<Evidence[]> {
  const key = cacheKey({
    chainId,
    address,
    adapterName: "adapterA",
  });
  return withCache(key, () => collectAdapterAEvidence(chainId, address));
}
