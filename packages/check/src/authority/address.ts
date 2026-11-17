import type { Hex } from "../assessTypes.js";

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

/** Strict EVM address check (40 hex). */
export function isHexAddress(value: string | null | undefined): value is Hex {
  return typeof value === "string" && ADDR_RE.test(value);
}

export function assertHexAddress(value: string, label = "address"): Hex {
  if (!isHexAddress(value)) {
    throw new Error(`${label} must be 0x + 40 hex`);
  }
  return value.toLowerCase() as Hex;
}

export function filterHexAddresses(values: string[]): Hex[] {
  return values.filter(isHexAddress).map((v) => v.toLowerCase() as Hex);
}
