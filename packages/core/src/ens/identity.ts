/**
 * Load the one-time ENSv2 Sepolia identity created by `pnpm spike:ens`.
 *
 * Addresses live in deployments/sepolia-ens-identity.json — never .env.
 * Missing file → ENS writes are skipped (registry may still use zero ensNode).
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Address, Hex } from "viem";
import { repoRoot } from "../paths";

export type EnsIdentityRecord = {
  network: string;
  chainId: number;
  identity: {
    parentLabel: string;
    parentName: string;
    parentRegisterTx: Hex;
    userRegistry: Address;
    permissionedResolver: Address;
    incidentLabel: string;
    incidentName: string;
    incidentNode: Hex;
    incidentRegisterTx: Hex;
    textRecords: Record<string, string>;
    createdAt: string;
  };
};

export function ensIdentityPath(): string {
  return resolve(repoRoot(), "deployments/sepolia-ens-identity.json");
}

export function isEnsIdentityReady(): boolean {
  return existsSync(ensIdentityPath());
}

export function loadEnsIdentity(): EnsIdentityRecord {
  const path = ensIdentityPath();
  if (!existsSync(path)) {
    throw new Error(
      `Missing ${path}. Run pnpm spike:ens once to create the parent .eth + UserRegistry.`,
    );
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as EnsIdentityRecord;
  if (raw.chainId !== 11155111) {
    throw new Error(`ENS identity chainId ${raw.chainId} is not Sepolia`);
  }
  const { userRegistry, permissionedResolver, parentName } = raw.identity;
  if (!/^0x[a-fA-F0-9]{40}$/.test(userRegistry)) {
    throw new Error("Invalid userRegistry in sepolia-ens-identity.json");
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(permissionedResolver)) {
    throw new Error("Invalid permissionedResolver in sepolia-ens-identity.json");
  }
  if (!parentName.endsWith(".eth")) {
    throw new Error(`Invalid parentName: ${parentName}`);
  }
  return raw;
}
