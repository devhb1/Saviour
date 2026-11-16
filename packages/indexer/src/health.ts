export type IndexerHealth = {
  lastProcessedBlock: number | null;
  stale: boolean;
  updatedAt: string | null;
  lagBlocks?: number;
};

const STALE_AFTER_MS = 15 * 60 * 1000;

export function computeHealth(input: {
  lastProcessedBlock: number | null;
  tipBlock?: number | null;
  updatedAtMs: number | null;
  nowMs?: number;
}): IndexerHealth {
  const now = input.nowMs ?? Date.now();
  const staleByTime =
    input.updatedAtMs == null || now - input.updatedAtMs > STALE_AFTER_MS;
  const lag =
    input.tipBlock != null && input.lastProcessedBlock != null
      ? input.tipBlock - input.lastProcessedBlock
      : undefined;
  const staleByLag = lag != null && lag > 50;
  return {
    lastProcessedBlock: input.lastProcessedBlock,
    stale: staleByTime || staleByLag || input.lastProcessedBlock == null,
    updatedAt: input.updatedAtMs ? new Date(input.updatedAtMs).toISOString() : null,
    lagBlocks: lag,
  };
}
