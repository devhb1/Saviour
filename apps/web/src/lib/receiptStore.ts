/**
 * Persist first-encounter investigation cost per address (browser-local).
 * Used by ReceiptStrip for the film WOW: first vs now.
 */

export type EncounterCost = {
  graphQueries: number;
  aiCalls: number;
  latencyMs: number;
  at: string;
};

const STORE_KEY = "saviours.firstEncounter.v1";

function readAll(): Record<string, EncounterCost> {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, EncounterCost>;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, EncounterCost>): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode
  }
}

export function getFirstEncounter(address: string): EncounterCost | null {
  const key = address.toLowerCase();
  return readAll()[key] ?? null;
}

/** Save only if this address has no first encounter yet. */
export function recordFirstEncounter(
  address: string,
  cost: Omit<EncounterCost, "at"> & { at?: string },
): EncounterCost {
  const key = address.toLowerCase();
  const all = readAll();
  const existing = all[key];
  if (existing) return existing;
  const row: EncounterCost = {
    graphQueries: cost.graphQueries,
    aiCalls: cost.aiCalls,
    latencyMs: cost.latencyMs,
    at: cost.at ?? new Date().toISOString(),
  };
  all[key] = row;
  writeAll(all);
  return row;
}
