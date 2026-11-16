import type { DecodedAction } from "../types.js";
import { classifySelector, registryWriteForSeverity } from "../severity.js";

const MULTISEND_SELECTOR = "8d80ff0a";

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
    // Not a MultiSend entry — treat as opaque single call
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

  // Minimal packed transactions parser: skip selector + offset/length ABI noise when present.
  // For CI we also accept synthetic JSON-fed actions via decodeSynthetic.
  return [
    {
      selector: `0x${MULTISEND_SELECTOR}`,
      severity: "WATCH",
      registryWrite: "WATCH",
      path,
      note: "MultiSend envelope detected — use decodePackedTransactions for inner ops",
    },
  ];
}

export interface PackedTx {
  operation: 0 | 1;
  to: string;
  value: string;
  data: string;
  selectorHint?: string;
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
    const hint = tx.selectorHint ?? `0x${tx.data.replace(/^0x/, "").slice(0, 8)}`;
    const { severity, note } = classifySelector(hint, {
      operation: tx.operation,
      targetKnownProxy: false,
    });
    out.push({
      to: tx.to,
      selectorHint: hint,
      operation: tx.operation,
      severity,
      registryWrite: registryWriteForSeverity(severity),
      path: [...path, hint],
      note,
    });
    if (tx.data.toLowerCase().includes(MULTISEND_SELECTOR)) {
      out.push(...unwrapMultiSend(tx.data as `0x${string}`, [...path, "nested"], depth + 1, maxDepth));
    }
  }
  return out;
}
