export type Authorization = {
  /** 0 = universal (all chains); else specific chain */
  chainId: number;
  address: `0x${string}`;
  nonce: number;
};

export type DelegationResult = {
  /** Resulting code delegation target, or null if cleared / none */
  impl: `0x${string}` | null;
  cleared: boolean;
};

const ZERO = "0x0000000000000000000000000000000000000000" as const;

/**
 * Simulate EIP-7702 authorization_list processing for one authority.
 * - Process in order; last valid auth for this authority wins
 * - chainId 0 = universal; else must match txChainId
 * - address(0) clears delegation
 * - Auth processing is NOT rolled back if later execution reverts (caller responsibility)
 */
export function simulateAuthorizationList(
  authorizations: Authorization[],
  txChainId: number,
): DelegationResult {
  let impl: `0x${string}` | null = null;
  let cleared = false;
  for (const auth of authorizations) {
    if (auth.chainId !== 0 && auth.chainId !== txChainId) continue;
    if (auth.address.toLowerCase() === ZERO) {
      impl = null;
      cleared = true;
      continue;
    }
    impl = auth.address;
    cleared = false;
  }
  return { impl, cleared };
}

/** Parse 0xef0100 || address from account code. */
export function parseEofDelegationCode(code: string): `0x${string}` | null {
  const hex = code.startsWith("0x") ? code.slice(2).toLowerCase() : code.toLowerCase();
  if (!hex.startsWith("ef0100") || hex.length < 46) return null;
  return `0x${hex.slice(6, 46)}` as `0x${string}`;
}
