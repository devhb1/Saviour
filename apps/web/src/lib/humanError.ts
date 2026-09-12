/** Client-safe error scrubbing — never import @saviours/core in client components. */

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
    return "Sepolia RPC rate-limited (HTTP 429). Wait a few seconds and retry — do not spam writes.";
  }
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg
      .replace(/https?:\/\/[^\s'")]+/gi, "[rpc]")
      .replace(/Request body:[\s\S]*/i, "")
      .trim()
      .slice(0, 280) || "RPC request failed"
  );
}
