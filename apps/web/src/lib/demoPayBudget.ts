/**
 * Playground / demo budget for real Bazantic x402 settles.
 * Who pays: the grant account (film-base), NOT the visitor's MetaMask.
 * Cap stops the public UI from draining the grant.
 */

export const DEMO_PAY_CAP = 100;
export const DEMO_PAY_COOKIE = "saviours_demo_pays";
export const DEMO_PAY_STORAGE_KEY = "saviours.demoPayCount";

export function parsePayCount(raw: string | undefined | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), DEMO_PAY_CAP + 50);
}

export function remainingPays(used: number): number {
  return Math.max(0, DEMO_PAY_CAP - used);
}

/** Browser: sync local mirror of cookie budget (cookie is source of truth on API). */
export function readDemoPaysUsedClient(): number {
  if (typeof window === "undefined") return 0;
  try {
    return parsePayCount(sessionStorage.getItem(DEMO_PAY_STORAGE_KEY));
  } catch {
    return 0;
  }
}

export function writeDemoPaysUsedClient(used: number): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DEMO_PAY_STORAGE_KEY, String(Math.max(0, used)));
  } catch {
    // ignore
  }
}

export function assertDemoPayAllowedClient(): void {
  const used = readDemoPaysUsedClient();
  if (used >= DEMO_PAY_CAP) {
    throw new Error(
      `Demo pay cap reached (${DEMO_PAY_CAP}/session). Grant account pays Base USDC — not your wallet. Use memory/$0 shield or try again later.`,
    );
  }
}
