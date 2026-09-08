/**
 * ENS incident label = lowercase target address (PIVOT §2.3).
 * One name per target: `<address>.<parent>.eth` — no index required.
 */

import type { HexAddress } from "../types";
import { loadEnsIdentity } from "./identity";

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

/** Lowercase 0x…40 hex — the ENS label under the SAVIOURS parent. */
export function labelForAddress(address: string): string {
  if (!ADDR_RE.test(address)) {
    throw new Error(`Invalid address for ENS label: ${address}`);
  }
  return address.toLowerCase();
}

export function asHexAddress(address: string): HexAddress {
  return labelForAddress(address) as HexAddress;
}

/**
 * Full ENS name for a target address under the spike parent
 * (e.g. `0x935b….eth` → `0x935b….savioursqsy56o.eth`).
 */
export function ensNameForAddress(
  address: string,
  parentName?: string,
): string {
  const label = labelForAddress(address);
  const parent = parentName ?? loadEnsIdentity().identity.parentName;
  return `${label}.${parent}`;
}

/** True if label looks like a 0x address (product naming rule). */
export function isAddressLabel(label: string): boolean {
  return ADDR_RE.test(label);
}
