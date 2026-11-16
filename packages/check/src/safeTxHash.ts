import { type Hex, hashTypedData, keccak256, toHex } from "viem";

export type SafeTxFields = {
  to: Hex;
  value: bigint;
  data: Hex;
  operation: 0 | 1;
  safeTxGas: bigint;
  baseGas: bigint;
  gasPrice: bigint;
  gasToken: Hex;
  refundReceiver: Hex;
  nonce: bigint;
};

/**
 * EIP-712 Safe transaction hash (Safe 1.3.0 / 1.4.1 domain).
 * Used for integrity: imported review must match the hash the signer will approve.
 */
export function computeSafeTxHash(params: {
  chainId: number;
  safeAddress: Hex;
  safeVersion?: string;
  safeTx: SafeTxFields;
}): Hex {
  const version = params.safeVersion ?? "1.3.0";
  return hashTypedData({
    domain: {
      chainId: params.chainId,
      verifyingContract: params.safeAddress,
    },
    types: {
      // Safe uses EIP712Domain with name+version in some paths; viem domain
      // already binds chainId + verifyingContract. Include name/version via
      // primaryType domain extension for 1.3.0 compatibility:
      SafeTx: [
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "data", type: "bytes" },
        { name: "operation", type: "uint8" },
        { name: "safeTxGas", type: "uint256" },
        { name: "baseGas", type: "uint256" },
        { name: "gasPrice", type: "uint256" },
        { name: "gasToken", type: "address" },
        { name: "refundReceiver", type: "address" },
        { name: "nonce", type: "uint256" },
      ],
    },
    primaryType: "SafeTx",
    message: {
      to: params.safeTx.to,
      value: params.safeTx.value,
      data: params.safeTx.data,
      operation: params.safeTx.operation,
      safeTxGas: params.safeTx.safeTxGas,
      baseGas: params.safeTx.baseGas,
      gasPrice: params.safeTx.gasPrice,
      gasToken: params.safeTx.gasToken,
      refundReceiver: params.safeTx.refundReceiver,
      nonce: params.safeTx.nonce,
    },
  });
}

/** Domain separator variant used by Safe contracts (name + version explicit). */
export function computeSafeTxHashWithDomainName(params: {
  chainId: number;
  safeAddress: Hex;
  safeVersion?: string;
  safeTx: SafeTxFields;
}): Hex {
  const version = params.safeVersion ?? "1.3.0";
  return hashTypedData({
    domain: {
      name: "Safe Transaction",
      version,
      chainId: params.chainId,
      verifyingContract: params.safeAddress,
    },
    types: {
      SafeTx: [
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "data", type: "bytes" },
        { name: "operation", type: "uint8" },
        { name: "safeTxGas", type: "uint256" },
        { name: "baseGas", type: "uint256" },
        { name: "gasPrice", type: "uint256" },
        { name: "gasToken", type: "address" },
        { name: "refundReceiver", type: "address" },
        { name: "nonce", type: "uint256" },
      ],
    },
    primaryType: "SafeTx",
    message: {
      to: params.safeTx.to,
      value: params.safeTx.value,
      data: params.safeTx.data,
      operation: params.safeTx.operation,
      safeTxGas: params.safeTx.safeTxGas,
      baseGas: params.safeTx.baseGas,
      gasPrice: params.safeTx.gasPrice,
      gasToken: params.safeTx.gasToken,
      refundReceiver: params.safeTx.refundReceiver,
      nonce: params.safeTx.nonce,
    },
  });
}

/** Extract 4-byte selector hints from calldata (top-level + naive Multisend scan). */
export function extractSelectorHints(data: Hex, max = 32): string[] {
  const hex = data.replace(/^0x/i, "");
  if (hex.length < 8) return [];
  const hints = new Set<string>([`0x${hex.slice(0, 8)}`]);
  // Naive scan for known admin selectors inside nested bytes
  const known = [
    "ebb2b4a2", // setTxCooldown
    "9b56d5be", // setTxExpiration
    "610b5925", // enableModule
    "e177246e", // updateDelay (OZ TimelockController-ish)
  ];
  const lower = hex.toLowerCase();
  for (const sel of known) {
    if (lower.includes(sel)) hints.add(`0x${sel}`);
  }
  return [...hints].slice(0, max);
}

export function selectorLabel(sel: string): string {
  const s = sel.toLowerCase().replace(/^0x/, "");
  const map: Record<string, string> = {
    ebb2b4a2: "setTxCooldown",
    "9b56d5be": "setTxExpiration",
    "610b5925": "enableModule",
    e177246e: "updateDelay",
  };
  return map[s] ?? `0x${s}`;
}

/** Deterministic digest for offline integrity demos when full Safe domain differs. */
export function digestSafeTxFields(safeTx: SafeTxFields): Hex {
  return keccak256(
    toHex(
      JSON.stringify({
        to: safeTx.to.toLowerCase(),
        value: safeTx.value.toString(),
        data: safeTx.data.toLowerCase(),
        operation: safeTx.operation,
        safeTxGas: safeTx.safeTxGas.toString(),
        baseGas: safeTx.baseGas.toString(),
        gasPrice: safeTx.gasPrice.toString(),
        gasToken: safeTx.gasToken.toLowerCase(),
        refundReceiver: safeTx.refundReceiver.toLowerCase(),
        nonce: safeTx.nonce.toString(),
      }),
    ),
  );
}
