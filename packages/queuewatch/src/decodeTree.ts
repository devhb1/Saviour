import type { DecodedAction, DecodeResult } from "./types.js";
import {
  classifySelector,
  maxSeverity,
  registryWriteForSeverity,
} from "./severity.js";
import {
  extractMultiSendPacked,
  MULTISEND_SELECTOR,
  parsePackedTransactions,
  unwrapMultiSend,
} from "./unwrap/multisend.js";
import {
  decodePrivilegeCall,
  walkPrivilegeSequence,
} from "./privilegeAbi.js";

export type TreeInput = {
  to: string;
  data: string;
  operation?: 0 | 1;
  value?: string;
};

/**
 * Decode a call into an execution tree.
 * MultiSend → packed inner calls; else known privilege ABI / sequence; else UNSUPPORTED.
 * No substring selector scanning.
 */
export function decodeExecutionTree(
  input: TreeInput,
  path: string[] = ["root"],
): DecodeResult {
  const data = input.data?.startsWith("0x")
    ? input.data
    : `0x${input.data ?? ""}`;
  const hex = data.slice(2).toLowerCase();

  if (hex.length < 8) {
    return finalize([
      {
        severity: "UNSUPPORTED",
        registryWrite: "NONE",
        path,
        note: "Empty or non-calldata",
      },
    ]);
  }

  if (hex.startsWith(MULTISEND_SELECTOR)) {
    const leaves = decodeMultiSendLeaves(data, [...path, "MultiSend"]);
    if (leaves.length) return finalize(leaves);
    return finalize(
      unwrapMultiSend(data as `0x${string}`, [...path, "MultiSend"]),
    );
  }

  const sequence = walkPrivilegeSequence(input.to, data, path);
  if (sequence.length > 0) {
    return finalize(sequence);
  }

  const privileged = decodePrivilegeCall({
    to: input.to,
    data,
    operation: input.operation ?? 0,
    path,
  });
  if (privileged) {
    return finalize([privileged]);
  }

  const selector = `0x${hex.slice(0, 8)}`;
  const { severity, note } = classifySelector(selector, {
    operation: input.operation ?? 0,
  });
  return finalize([
    {
      to: input.to,
      selector,
      selectorHint: selector,
      operation: input.operation ?? 0,
      severity,
      registryWrite: registryWriteForSeverity(severity),
      path: [...path, selector],
      note: note ?? "Unrecognized selector — not treated as privilege change",
    },
  ]);
}

function decodeMultiSendLeaves(
  multiSendData: string,
  path: string[],
): DecodedAction[] {
  const packed = extractMultiSendPacked(multiSendData);
  if (!packed) return [];
  const txs = parsePackedTransactions(packed);
  const out: DecodedAction[] = [];
  for (const [i, tx] of txs.entries()) {
    const leafPath = [...path, `op${i}`];
    const innerHex = tx.data.replace(/^0x/i, "").toLowerCase();
    if (innerHex.startsWith(MULTISEND_SELECTOR)) {
      out.push(...unwrapMultiSend(tx.data as `0x${string}`, leafPath));
      continue;
    }
    const seq = walkPrivilegeSequence(tx.to, tx.data, leafPath);
    if (seq.length) {
      out.push(...seq);
      continue;
    }
    const priv = decodePrivilegeCall({
      to: tx.to,
      data: tx.data,
      operation: tx.operation,
      path: leafPath,
    });
    if (priv) {
      out.push(priv);
      continue;
    }
    const hint = tx.data.length >= 10 ? tx.data.slice(0, 10) : "0x";
    const { severity, note } = classifySelector(hint, {
      operation: tx.operation,
    });
    out.push({
      to: tx.to,
      selector: hint,
      selectorHint: hint,
      operation: tx.operation,
      severity,
      registryWrite: registryWriteForSeverity(severity),
      path: [...leafPath, hint],
      note,
    });
  }
  return out;
}

function finalize(actions: DecodedAction[]): DecodeResult {
  if (actions.length === 0) {
    return {
      supported: false,
      actions: [
        {
          severity: "UNSUPPORTED",
          registryWrite: "NONE",
          path: ["empty"],
          note: "No actions decoded",
        },
      ],
      maxSeverity: "UNSUPPORTED",
      vaultWrite: "NONE",
    };
  }
  const sev = maxSeverity(actions);
  const hasPrivilege = actions.some(
    (a) => a.severity === "CRITICAL" || a.severity === "HIGH",
  );
  const onlyUnsupported = actions.every((a) => a.severity === "UNSUPPORTED");
  return {
    supported: !onlyUnsupported,
    actions,
    maxSeverity: sev,
    vaultWrite: hasPrivilege ? "WATCH" : "NONE",
  };
}
