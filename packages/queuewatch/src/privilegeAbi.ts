import type { DecodedAction } from "./types.js";
import { classifySelector, registryWriteForSeverity } from "./severity.js";

/** Known privilege selectors and ABI arg layouts (static decode). */
export const PRIVILEGE_ABI: Record<
  string,
  { name: string; args: Array<"uint256" | "address"> }
> = {
  ebb2b4a2: { name: "setTxCooldown", args: ["uint256"] },
  "9b56d5be": { name: "setTxExpiration", args: ["uint256"] },
  "610b5925": { name: "enableModule", args: ["address"] },
  e177246e: { name: "updateDelay", args: ["uint256"] },
};

function readWord(hex: string, wordIndex: number): string {
  const start = wordIndex * 64;
  return hex.slice(start, start + 64);
}

function decodeArgs(
  argHex: string,
  types: Array<"uint256" | "address">,
): unknown[] {
  const out: unknown[] = [];
  for (let i = 0; i < types.length; i++) {
    const word = readWord(argHex, i);
    if (word.length < 64) break;
    if (types[i] === "address") {
      out.push(`0x${word.slice(24)}`);
    } else {
      out.push(BigInt(`0x${word}`).toString());
    }
  }
  return out;
}

export function decodePrivilegeCall(input: {
  to: string;
  data: string;
  operation?: 0 | 1;
  path?: string[];
}): DecodedAction | null {
  const hex = input.data.replace(/^0x/i, "").toLowerCase();
  if (hex.length < 8) return null;
  const sel = hex.slice(0, 8);
  const spec = PRIVILEGE_ABI[sel];
  if (!spec) return null;

  const argHex = hex.slice(8);
  const wordsNeeded = spec.args.length;
  // Require enough words for a single call (sequence walker handles shorter leftovers)
  if (argHex.length < wordsNeeded * 64) return null;

  // For single-call decode, take exactly the args for this selector
  const args = decodeArgs(argHex.slice(0, wordsNeeded * 64), spec.args);
  const { severity, note } = classifySelector(spec.name, {
    operation: input.operation ?? 0,
  });

  return {
    to: input.to,
    selector: `0x${sel}`,
    selectorHint: spec.name,
    args,
    operation: input.operation ?? 0,
    severity,
    registryWrite: registryWriteForSeverity(severity),
    path: [...(input.path ?? ["root"]), spec.name],
    note,
  };
}

/**
 * Walk concatenated known privilege calls (Term privileged-prefix style).
 * Only advances when a known selector + full arg words are present.
 */
export function walkPrivilegeSequence(
  to: string,
  data: string,
  path: string[] = ["sequence"],
): DecodedAction[] {
  let hex = data.replace(/^0x/i, "").toLowerCase();
  const actions: DecodedAction[] = [];
  let step = 0;

  while (hex.length >= 8) {
    const sel = hex.slice(0, 8);
    const spec = PRIVILEGE_ABI[sel];
    if (!spec) break;
    const wordsNeeded = spec.args.length;
    const need = 8 + wordsNeeded * 64;
    if (hex.length < need) break;
    const callData = `0x${hex.slice(0, need)}`;
    const decoded = decodePrivilegeCall({
      to,
      data: callData,
      path: [...path, `s${step}`],
    });
    if (!decoded) break;
    actions.push(decoded);
    hex = hex.slice(need);
    step += 1;
  }

  return actions;
}
