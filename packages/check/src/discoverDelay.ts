import { MULTISEND_SELECTOR, type DecodeResult } from "@saviours/queuewatch";
import type { Hex } from "./assessTypes.js";

export type DelayDiscovery = {
  delayAddress: Hex | null;
  inconclusive: boolean;
  reason?: string;
};

/**
 * Outer Safe tx `to` is often MultiSend — not the Delay.
 * Prefer an explicit override, else privilege-action targets, else outer `to`
 * when it is not MultiSend.
 */
export function discoverDelayAddress(opts: {
  outerTo: string;
  outerData?: string;
  decode?: DecodeResult;
  explicitDelay?: string | null;
}): DelayDiscovery {
  if (opts.explicitDelay?.startsWith("0x") && opts.explicitDelay.length === 42) {
    return { delayAddress: opts.explicitDelay as Hex, inconclusive: false };
  }

  const outerHex = (opts.outerData ?? "").replace(/^0x/i, "").toLowerCase();
  const outerIsMultiSend =
    outerHex.startsWith(MULTISEND_SELECTOR) ||
    opts.outerTo.toLowerCase().includes("multisend");

  const privilegeHints = [
    "settxcooldown",
    "settxexpiration",
    "enablemodule",
    "updatedelay",
  ];
  if (opts.decode?.actions?.length) {
    for (const a of opts.decode.actions) {
      const hint = (a.selectorHint ?? "").toLowerCase();
      if (
        privilegeHints.some((h) => hint.includes(h)) &&
        a.to?.startsWith("0x") &&
        a.to.length === 42
      ) {
        return { delayAddress: a.to as Hex, inconclusive: false };
      }
    }
  }

  if (outerIsMultiSend) {
    return {
      delayAddress: null,
      inconclusive: true,
      reason:
        "Outer destination is MultiSend — Delay address not discovered for before-state",
    };
  }

  if (opts.outerTo?.startsWith("0x") && opts.outerTo.length === 42) {
    return { delayAddress: opts.outerTo as Hex, inconclusive: false };
  }

  return {
    delayAddress: null,
    inconclusive: true,
    reason: "No Delay address available",
  };
}
