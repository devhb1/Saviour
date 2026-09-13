/**
 * Film-critical ENS names — never dispute / revoke / mutate via playground govern.
 *
 * Root cause of recurring "awaiting name" / kill-switch lies:
 *   writes-open hosts let anyone POST /api/govern/revoke on ATTACK-1 →
 *   UserRegistry.unregister → address-label miss → NamingCeremony passport empty
 *   while Shield still BLOCKs via code-class (looks "fine" until Loop ③).
 *
 * Lock lives in @saviours/core so API routes, UI, and scripts cannot bypass it.
 */

export const ATTACK_1_ADDRESS =
  "0x935bfb495e33f74d2e9735df1da66ace442ede48" as const;

/** Disposable govern / EAC probe target (WATCH contrast). */
export const BOT_1_ADDRESS =
  "0x352423e2fa5d5c99343d371c9e3bc56c87723cc7" as const;

/** Addresses that must stay named for ETHOnline film. */
export const FILM_LOCKED_ADDRESSES = new Set<string>([ATTACK_1_ADDRESS]);

export class FilmLockError extends Error {
  readonly code = "FILM_LOCKED" as const;
  constructor(message: string) {
    super(message);
    this.name = "FilmLockError";
  }
}

export function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

export function isFilmLockedAddress(address: string): boolean {
  return FILM_LOCKED_ADDRESSES.has(normalizeAddress(address));
}

/**
 * Hard stop for dispute / revoke / any destructive govern write.
 */
export function assertFilmWritable(address: string, action: string): void {
  if (!isFilmLockedAddress(address)) return;
  throw new FilmLockError(
    `${action} blocked: ATTACK-1 is film-locked. Playground must use BOT-1 (${BOT_1_ADDRESS.slice(0, 10)}…). ` +
      "Revoking the hero unregisters the address-label and breaks Naming Ceremony / cast.",
  );
}

/** Swap film heroes → BOT-1 for safe govern demos. */
export function redirectFilmGovernTarget(address: string): string {
  const a = normalizeAddress(address);
  return isFilmLockedAddress(a) ? BOT_1_ADDRESS : a;
}
