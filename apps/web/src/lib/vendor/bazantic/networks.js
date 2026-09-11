/**
 * Supported x402 networks. For each: the EVM chain id, the canonical Circle
 * USDC contract, and the export name in `viem/chains`. Base mainnet and Base
 * Sepolia only — the two the gateway's x402 rail advertises.
 */

export const USDC_DECIMALS = 6;

// Sepolia-first while mainnet is behind facilitator + screening sign-off.
export const DEFAULT_NETWORK = 'base-sepolia';

export const NETWORKS = {
  base: {
    chainId: 8453,
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    viemChain: 'base',
  },
  'base-sepolia': {
    chainId: 84532,
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    viemChain: 'baseSepolia',
  },
};

/**
 * Resolve a challenge's `network` field to a NETWORKS key. x402 v1 uses the
 * name directly ("base-sepolia"); v2 uses CAIP-2 ("eip155:8453"). Returns the
 * name, or null if unknown/unsupported.
 */
export function resolveNetworkKey(networkField) {
  if (typeof networkField !== 'string') return null;
  if (NETWORKS[networkField]) return networkField;
  const m = /^eip155:(\d+)$/.exec(networkField);
  if (m) {
    const chainId = Number(m[1]);
    for (const [name, cfg] of Object.entries(NETWORKS)) {
      if (cfg.chainId === chainId) return name;
    }
  }
  return null;
}

/** CAIP-2 id for a NETWORKS key ("base" → "eip155:8453"). */
export function caip2For(name) {
  return NETWORKS[name] ? `eip155:${NETWORKS[name].chainId}` : null;
}

// Block-explorer tx bases, keyed by NETWORKS key and by CAIP-2 (settlement
// receipts report the network as CAIP-2).
const EXPLORER_TX = {
  base: 'https://basescan.org/tx/',
  'base-sepolia': 'https://sepolia.basescan.org/tx/',
  'eip155:8453': 'https://basescan.org/tx/',
  'eip155:84532': 'https://sepolia.basescan.org/tx/',
};

/** Explorer URL for a settlement tx, or null for an unknown network. */
export function explorerTxUrl(network, txHash) {
  if (!txHash) return null;
  const base = EXPLORER_TX[network] ?? EXPLORER_TX[resolveNetworkKey(network)];
  return base ? base + txHash : null;
}
