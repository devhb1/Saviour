/**
 * ENS incident label = lowercase target address (PIVOT §2.3).
 * One name per target: `<address>.<parent>.eth` — no index required.
 *
 * ENDGAME Phase 4 scaffold — class / deployer namespaces (clone defense):
 *   code-<hash20>.saviours.eth
 *   deployer-<address>.saviours.eth
 * Shield cascade (address → code → deployer) lands when names are registered.
 */

import type { HexAddress } from "../types";
import { loadEnsIdentity } from "./identity";
import { keccak256, type Hex } from "viem";

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;
const CODE_LABEL_RE = /^code-[a-f0-9]{20}$/;
const DEPLOYER_LABEL_RE = /^deployer-0x[a-f0-9]{40}$/;

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

/**
 * Label for a runtime bytecode class: `code-` + first 20 hex of keccak256(code).
 * Empty code (EOA) returns null — EOAs have no class name.
 */
export function labelForRuntimeCode(bytecode: Hex | string): string | null {
  const code = (bytecode || "0x").toLowerCase();
  if (code === "0x" || code === "0x0") return null;
  const hash = keccak256(code as Hex);
  return `code-${hash.slice(2, 22)}`;
}

export function ensNameForRuntimeCode(
  bytecode: Hex | string,
  parentName?: string,
): string | null {
  const label = labelForRuntimeCode(bytecode);
  if (!label) return null;
  const parent = parentName ?? loadEnsIdentity().identity.parentName;
  return `${label}.${parent}`;
}

/** Label for a deployer EOA that ships threats. */
export function labelForDeployer(address: string): string {
  return `deployer-${labelForAddress(address)}`;
}

export function ensNameForDeployer(
  address: string,
  parentName?: string,
): string {
  const label = labelForDeployer(address);
  const parent = parentName ?? loadEnsIdentity().identity.parentName;
  return `${label}.${parent}`;
}

/** True if label looks like a 0x address (product naming rule). */
export function isAddressLabel(label: string): boolean {
  return ADDR_RE.test(label);
}

export function isCodeClassLabel(label: string): boolean {
  return CODE_LABEL_RE.test(label.toLowerCase());
}

export function isDeployerLabel(label: string): boolean {
  return DEPLOYER_LABEL_RE.test(label.toLowerCase());
}

/**
 * Canonical product ENS: `<lowercase-0x40>.saviours.eth` (or configured parent).
 * Rejects category paths (`.hack.`, `.exploit.`) and malformed double-dots.
 * Class/deployer labels are separate namespaces — not "canonical address names".
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
