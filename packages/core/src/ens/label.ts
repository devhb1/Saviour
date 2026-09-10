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
 * (e.g. `0x935b….eth` → `0x935b….saviours.eth`).
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

/**
 * Canonical product ENS: `<lowercase-0x40>.saviours.eth` (or configured parent).
 * Rejects category paths (`.hack.`, `.exploit.`) and malformed double-dots.
 */
export function isCanonicalSavioursEnsName(
  ensName: string,
  parentName?: string,
): boolean {
  const parent = (parentName ?? loadEnsIdentity().identity.parentName).toLowerCase();
  const n = ensName.trim().toLowerCase();
  if (!n.endsWith(`.${parent}`)) return false;
  const label = n.slice(0, n.length - parent.length - 1);
  if (label.includes(".")) return false; // category / nested segments forbidden
  return ADDR_RE.test(label);
}

export function assertCanonicalSavioursEnsName(
  ensName: string,
  parentName?: string,
): string {
  if (!isCanonicalSavioursEnsName(ensName, parentName)) {
    throw new Error(
      `ENS name must be <address>.${parentName ?? "saviours.eth"} — got ${ensName}`,
    );
  }
  return ensName.toLowerCase();
}
