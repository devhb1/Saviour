/**
 * Short-lived in-memory cache for live Graph adapter results.
 * Caches responses only — never seeds or substitutes static chain data.
 */

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const store = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL_MS = 60 * 60 * 1000;

export function cacheKey(parts: {
  chainId: number;
  address: string;
  adapterName: string;
}): string {
  return `${parts.chainId}:${parts.address.toLowerCase()}:${parts.adapterName}`;
}

/** In-memory TTL cache for adapter results (hackathon-scale). */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) {
    return hit.value;
  }
  const value = await fn();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function clearEvidenceCache(): void {
  store.clear();
}
