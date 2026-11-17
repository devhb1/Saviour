import type { DecodedAction } from "../types.js";
import { classifySelector, registryWriteForSeverity } from "../severity.js";

export const MULTISEND_SELECTOR = "8d80ff0a";

export interface PackedTx {
  operation: 0 | 1;
  to: string;
  value: string;
  data: string;
  selectorHint?: string;
}

export type ParsePackedResult = {
  txs: PackedTx[];
  /** True only when every packed byte was consumed */
  complete: boolean;
  remainingHex: string;
};

/**
 * Parse Safe MultiSend packed `transactions` bytes:
 * repeating (uint8 operation, address to, uint256 value, uint256 dataLength, bytes data)
 */
export function parsePackedTransactions(packed: string): ParsePackedResult {
  let hex = packed.replace(/^0x/i, "").toLowerCase();
  const txs: PackedTx[] = [];
  while (hex.length >= 2 + 40 + 64 + 64) {
    const operation = Number.parseInt(hex.slice(0, 2), 16) as 0 | 1;
    if (operation !== 0 && operation !== 1) {
      return { txs, complete: false, remainingHex: hex };
    }
    const to = `0x${hex.slice(2, 42)}`;
    const value = BigInt(`0x${hex.slice(42, 106)}`).toString();
    const dataLength = Number(BigInt(`0x${hex.slice(106, 170)}`));
    if (!Number.isFinite(dataLength) || dataLength < 0 || dataLength > 1_000_000) {
      return { txs, complete: false, remainingHex: hex };
    }
    const dataHexLen = dataLength * 2;
    if (hex.length < 170 + dataHexLen) {
      return { txs, complete: false, remainingHex: hex };
    }
    const data = `0x${hex.slice(170, 170 + dataHexLen)}`;
    const selectorHint =
      dataLength >= 4 ? `0x${hex.slice(170, 178)}` : "0x";
    txs.push({ operation, to, value, data, selectorHint });
    hex = hex.slice(170 + dataHexLen);
  }
  return {
    txs,
    complete: hex.length === 0,
    remainingHex: hex,
  };
}

/** Extract packed blob from multiSend(bytes) ABI calldata. */
export function extractMultiSendPacked(data: string): string | null {
  const hex = data.replace(/^0x/i, "").toLowerCase();
  if (!hex.startsWith(MULTISEND_SELECTOR)) return null;
  if (hex.length < 8 + 64 + 64) {
    const rest = hex.slice(8);
    return rest.length ? `0x${rest}` : null;
  }
  const offset = Number(BigInt(`0x${hex.slice(8, 72)}`));
  const start = 8 + offset * 2;
  if (start + 64 > hex.length) {
    return `0x${hex.slice(8)}`;
  }
  const length = Number(BigInt(`0x${hex.slice(start, start + 64)}`));
  const bodyStart = start + 64;
  const body = hex.slice(bodyStart, bodyStart + length * 2);
  if (body.length < length * 2) return `0x${hex.slice(8)}`;
  return `0x${body}`;
}

/** Hex MultiSend transactions blob (Safe) — recursive unwrap maxDepth. */
export function unwrapMultiSend(
  data: `0x${string}` | string,
  path: string[] = ["MultiSend"],
  depth = 0,
  maxDepth = 8,
): DecodedAction[] {
  if (depth > maxDepth) {
    return [
      {
        severity: "UNSUPPORTED",
        registryWrite: "NONE",
        path: [...path, "maxDepth"],
        note: "Exceeded MultiSend unwrap depth",
      },
    ];
  }

  const hex = data.startsWith("0x") ? data.slice(2) : data;
  if (!hex.toLowerCase().startsWith(MULTISEND_SELECTOR) && depth === 0) {
    return [
      {
        selector: `0x${hex.slice(0, 8)}`,
        severity: "UNSUPPORTED",
        registryWrite: "NONE",
        path,
        note: "Not MultiSend; higher adapter required",
      },
    ];
  }

  const packed = extractMultiSendPacked(data.startsWith("0x") ? data : `0x${data}`);
  if (!packed) {
    return [
      {
        selector: `0x${MULTISEND_SELECTOR}`,
        severity: "UNSUPPORTED",
        registryWrite: "NONE",
        path,
        note: "MultiSend envelope without parseable packed body",
      },
    ];
  }

  const parsed = parsePackedTransactions(packed);
  if (parsed.txs.length === 0) {
    return [
      {
        selector: `0x${MULTISEND_SELECTOR}`,
        severity: "UNSUPPORTED",
        registryWrite: "NONE",
        path,
        note: "MultiSend packed body empty or invalid",
      },
    ];
  }

  const actions = decodePackedTransactions(parsed.txs, path, depth, maxDepth);
  if (!parsed.complete) {
    actions.push({
      severity: "UNSUPPORTED",
      registryWrite: "NONE",
      path: [...path, "incomplete"],
      note: `MultiSend packed bytes not fully consumed (${parsed.remainingHex.length / 2} bytes left) — coverage incomplete`,
    });
  }
  return actions;
}

export function decodePackedTransactions(
  txs: PackedTx[],
  path: string[] = ["MultiSend"],
  depth = 0,
  maxDepth = 8,
): DecodedAction[] {
  if (depth > maxDepth) {
    return [
      {
        severity: "UNSUPPORTED",
        registryWrite: "NONE",
        path: [...path, "maxDepth"],
      },
    ];
  }
  const out: DecodedAction[] = [];
  for (const tx of txs) {
    const hint =
      tx.selectorHint ??
      (tx.data.length >= 10 ? tx.data.slice(0, 10) : "0x");
    const { severity, note } = classifySelector(hint, {
      operation: tx.operation,
      targetKnownProxy: false,
    });
    out.push({
      to: tx.to,
      value: tx.value,
      data: tx.data,
      selector: hint.startsWith("0x") ? hint : undefined,
      selectorHint: hint,
      operation: tx.operation,
      severity,
      registryWrite: registryWriteForSeverity(severity),
      path: [...path, hint],
      note,
      args: undefined,
    });
    const innerHex = tx.data.replace(/^0x/i, "").toLowerCase();
    if (innerHex.startsWith(MULTISEND_SELECTOR)) {
      out.push(
        ...unwrapMultiSend(
          tx.data as `0x${string}`,
          [...path, "nested"],
          depth + 1,
          maxDepth,
        ),
      );
    }
  }
  return out;
}
