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
    const { actions: leaves, complete } = decodeMultiSendLeaves(
      data,
      [...path, "MultiSend"],
    );
    if (leaves.length) return finalize(leaves, complete);
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
): { actions: DecodedAction[]; complete: boolean } {
  const packed = extractMultiSendPacked(multiSendData);
  if (!packed) return { actions: [], complete: false };
  const parsed = parsePackedTransactions(packed);
  const out: DecodedAction[] = [];
  for (const [i, tx] of parsed.txs.entries()) {
    const leafPath = [...path, `op${i}`];
    const innerHex = tx.data.replace(/^0x/i, "").toLowerCase();
    if (innerHex.startsWith(MULTISEND_SELECTOR)) {
      out.push(...unwrapMultiSend(tx.data as `0x${string}`, leafPath));
      continue;
    }
    const seq = walkPrivilegeSequence(tx.to, tx.data, leafPath);
    if (seq.length) {
      out.push(
        ...seq.map((a) => ({
          ...a,
          value: a.value ?? tx.value,
          data: a.data ?? tx.data,
        })),
      );
      continue;
    }
    const priv = decodePrivilegeCall({
      to: tx.to,
      data: tx.data,
      operation: tx.operation,
      path: leafPath,
    });
    if (priv) {
      out.push({ ...priv, value: tx.value, data: tx.data });
      continue;
    }
    const hint = tx.data.length >= 10 ? tx.data.slice(0, 10) : "0x";
    const { severity, note } = classifySelector(hint, {
      operation: tx.operation,
    });
    out.push({
      to: tx.to,
      value: tx.value,
      data: tx.data,
      selector: hint,
      selectorHint: hint,
      operation: tx.operation,
      severity,
      registryWrite: registryWriteForSeverity(severity),
      path: [...leafPath, hint],
      note,
    });
  }
  if (!parsed.complete) {
    out.push({
      severity: "UNSUPPORTED",
      registryWrite: "NONE",
      path: [...path, "incomplete"],
      note: `MultiSend packed bytes not fully consumed (${parsed.remainingHex.length / 2} bytes left) — coverage incomplete`,
    });
  }
  return { actions: out, complete: parsed.complete };
}

function finalize(
  actions: DecodedAction[],
  complete = true,
): DecodeResult {
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
      complete: false,
    };
  }
  const sev = maxSeverity(actions);
  const hasPrivilege = actions.some(
    (a) => a.severity === "CRITICAL" || a.severity === "HIGH",
  );
  const onlyUnsupported = actions.every((a) => a.severity === "UNSUPPORTED");
  const incompleteNote = actions.some((a) =>
    (a.note ?? "").includes("coverage incomplete"),
  );
  return {
    supported: !onlyUnsupported,
    actions,
    maxSeverity: sev,
    vaultWrite: hasPrivilege ? "WATCH" : "NONE",
    complete: complete && !incompleteNote,
  };
}
