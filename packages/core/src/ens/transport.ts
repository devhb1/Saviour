/**
 * Sepolia viem transports with fallback + retry.
 * Reads prefer public endpoints; writes use the configured hosted RPC first.
 */

import { fallback, http, type Transport } from "viem";
import { loadRootEnv, requireEnv } from "../config/env";

const PUBLIC_SEPOLIA_READS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
] as const;

/** Hosted write RPC + public read fallbacks. */
export function sepoliaWriteTransport(): Transport {
  loadRootEnv();
  const primary = requireEnv("SEPOLIA_RPC_URL");
  return fallback(
    [
      http(primary, { retryCount: 3, retryDelay: 400 }),
      ...PUBLIC_SEPOLIA_READS.map((url) =>
        http(url, { retryCount: 2, retryDelay: 500 }),
      ),
    ],
    { rank: false, retryCount: 2 },
  );
}

/**
 * Read-preferring transport: public first when possible, then hosted.
 * Truthfulness win — product reads do not depend solely on a paid provider.
 */
export function sepoliaReadTransport(): Transport {
  loadRootEnv();
  const hosted = process.env.SEPOLIA_RPC_URL?.trim();
  const urls = [
    ...PUBLIC_SEPOLIA_READS,
    ...(hosted ? [hosted] : []),
  ];
  return fallback(
    urls.map((url) => http(url, { retryCount: 3, retryDelay: 400 })),
    { rank: false, retryCount: 2 },
  );
}

export function isRateLimitedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /\b429\b/.test(msg) ||
    /too many requests/i.test(msg) ||
    /rate.?limit/i.test(msg)
  );
}

/** Human message — never include RPC URLs or request bodies. */
export function humanRpcError(err: unknown): string {
  if (isRateLimitedError(err)) {
    return "Sepolia RPC rate-limited the request. Retrying with backoff…";
  }
  const msg = err instanceof Error ? err.message : String(err);
  // Strip URLs that may embed API keys
  return msg
    .replace(/https?:\/\/[^\s'")]+/gi, "[rpc]")
    .replace(/Request body:[\s\S]*/i, "")
    .trim()
    .slice(0, 280) || "RPC request failed";
}
