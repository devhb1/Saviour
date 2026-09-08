/**
 * ENSv2 EAC role helpers (PIVOT §3.4).
 *
 * Relayer (resolver/UserRegistry root) grants:
 * - Investigator: ROLE_REGISTRAR on UserRegistry + ROLE_SET_TEXT for evidence keys (any name)
 * - Disputer: ROLE_SET_TEXT for saviours.status + saviours.dispute only
 *
 * `authorizeTextRoles(NameCoder.encode(""), key, account, true)` = any-name grant.
 * DNS-encoded empty name is a single 0x00 terminator byte.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { namehash } from "viem/ens";
import { loadRootEnv, requireEnv } from "../config/env";
import { INCIDENT_ROLE_BITMAP, ROLE_REGISTRAR } from "./addresses";
import { isEnsIdentityReady, loadEnsIdentity } from "./identity";

/** NameCoder.encode("") — any-name scope for authorizeTextRoles. */
export const ANY_NAME_DNS = "0x00" as Hex;

export const ROLE_SET_TEXT = 1n << 4n;

/** Keys the investigator may write (PIVOT §2.4 / §3.4). */
export const INVESTIGATOR_TEXT_KEYS = [
  "saviours.status",
  "saviours.threat",
  "saviours.confidence",
  "saviours.evidenceHash",
  "saviours.dossier",
  "saviours.investigator",
  "saviours.incident",
  "saviours.plainVerdict",
  "saviours.atomicTx",
  "saviours.protocols",
  "saviours.rulesVersion",
] as const;

/** Keys the disputer may write. */
export const DISPUTER_TEXT_KEYS = [
  "saviours.status",
  "saviours.dispute",
] as const;

export const eacAbi = [
  {
    type: "function",
    name: "authorizeTextRoles",
    stateMutability: "nonpayable",
    inputs: [
      { name: "toName", type: "bytes" },
      { name: "key", type: "string" },
      { name: "account", type: "address" },
      { name: "grant", type: "bool" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "grantRootRoles",
    stateMutability: "nonpayable",
    inputs: [
      { name: "roleBitmap", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "setText",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
      { name: "value", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "text",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ type: "string" }],
  },
] as const;

export const userRegistryRolesAbi = [
  {
    type: "function",
    name: "grantRootRoles",
    stateMutability: "nonpayable",
    inputs: [
      { name: "roleBitmap", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [
      { name: "label", type: "string" },
      { name: "owner", type: "address" },
      { name: "registry", type: "address" },
      { name: "resolver", type: "address" },
      { name: "roleBitmap", type: "uint256" },
      { name: "expiry", type: "uint64" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getResolver",
    stateMutability: "view",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ type: "address" }],
  },
] as const;

function pkFromEnv(name: string): Hex {
  const raw = requireEnv(name);
  return (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
}

export function investigatorAccount() {
  loadRootEnv();
  return privateKeyToAccount(pkFromEnv("INVESTIGATOR_PRIVATE_KEY"));
}

export function disputerAccount() {
  loadRootEnv();
  return privateKeyToAccount(pkFromEnv("DISPUTER_PRIVATE_KEY"));
}

export function relayerAccount() {
  loadRootEnv();
  return privateKeyToAccount(pkFromEnv("RELAYER_PRIVATE_KEY"));
}

function clientsFor(pkName: string): {
  account: ReturnType<typeof privateKeyToAccount>;
  publicClient: PublicClient;
  wallet: WalletClient;
} {
  loadRootEnv();
  const account = privateKeyToAccount(pkFromEnv(pkName));
  const rpc = requireEnv("SEPOLIA_RPC_URL");
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpc),
  });
  const wallet = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpc),
  });
  return { account, publicClient, wallet };
}

async function waitOk(
  publicClient: PublicClient,
  hash: Hex,
  label: string,
): Promise<void> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`${label} failed: ${hash}`);
  }
}

/**
 * Grant investigator + disputer EAC text roles (any-name) and investigator REGISTRAR.
 * Idempotent enough to re-run (re-grants are fine).
 */
export async function setupEacRoles(): Promise<{
  investigator: Address;
  disputer: Address;
  txs: Hex[];
}> {
  if (!isEnsIdentityReady()) {
    throw new Error("Need deployments/sepolia-ens-identity.json");
  }
  const identity = loadEnsIdentity().identity;
  const inv = investigatorAccount();
  const dis = disputerAccount();
  const { publicClient, wallet } = clientsFor("RELAYER_PRIVATE_KEY");
  const txs: Hex[] = [];

  // UserRegistry: investigator can register address-label incidents
  {
    const h = await wallet.writeContract({
      address: identity.userRegistry,
      abi: userRegistryRolesAbi,
      functionName: "grantRootRoles",
      args: [ROLE_REGISTRAR, inv.address],
      account: wallet.account!,
      chain: sepolia,
    });
    await waitOk(publicClient, h, "grantRootRoles REGISTRAR");
    txs.push(h);
  }

  for (const key of INVESTIGATOR_TEXT_KEYS) {
    const h = await wallet.writeContract({
      address: identity.permissionedResolver,
      abi: eacAbi,
      functionName: "authorizeTextRoles",
      args: [ANY_NAME_DNS, key, inv.address, true],
      account: wallet.account!,
      chain: sepolia,
    });
    await waitOk(publicClient, h, `authorizeTextRoles investigator ${key}`);
    txs.push(h);
  }

  for (const key of DISPUTER_TEXT_KEYS) {
    const h = await wallet.writeContract({
      address: identity.permissionedResolver,
      abi: eacAbi,
      functionName: "authorizeTextRoles",
      args: [ANY_NAME_DNS, key, dis.address, true],
      account: wallet.account!,
      chain: sepolia,
    });
    await waitOk(publicClient, h, `authorizeTextRoles disputer ${key}`);
    txs.push(h);
  }

  return { investigator: inv.address, disputer: dis.address, txs };
}

/**
 * Mint `investigator-01.<parent>.eth` owned by the investigator EOA (10y).
 */
export async function registerInvestigatorNamespace(): Promise<{
  ensName: string;
  label: string;
  txHash: Hex | null;
  reused: boolean;
}> {
  const identity = loadEnsIdentity().identity;
  const inv = investigatorAccount();
  const { publicClient, wallet } = clientsFor("RELAYER_PRIVATE_KEY");
  const label = "investigator-01";
  const ensName = `${label}.${identity.parentName}`;
  const ZERO = "0x0000000000000000000000000000000000000000" as Address;

  const existing = await publicClient.readContract({
    address: identity.userRegistry,
    abi: userRegistryRolesAbi,
    functionName: "getResolver",
    args: [label],
  });

  if (existing !== ZERO) {
    return { ensName, label, txHash: null, reused: true };
  }

  const expiry = BigInt(Math.floor(Date.now() / 1000) + 10 * 365 * 86_400);
  const txHash = await wallet.writeContract({
    address: identity.userRegistry,
    abi: userRegistryRolesAbi,
    functionName: "register",
    args: [
      label,
      inv.address,
      ZERO,
      identity.permissionedResolver,
      INCIDENT_ROLE_BITMAP,
      expiry,
    ],
    account: wallet.account!,
    chain: sepolia,
  });
  await waitOk(publicClient, txHash, "register investigator-01");

  // Point investigator namespace at itself for demos
  const node = namehash(ensName);
  const textTx = await wallet.writeContract({
    address: identity.permissionedResolver,
    abi: eacAbi,
    functionName: "setText",
    args: [node, "saviours.investigator", ensName],
    account: wallet.account!,
    chain: sepolia,
  });
  await waitOk(publicClient, textTx, "setText investigator namespace");

  return { ensName, label, txHash, reused: false };
}

/** Attempt setText as a named role; returns revert message or null on success. */
export async function trySetTextAs(
  role: "investigator" | "disputer" | "relayer",
  ensNode: Hex,
  key: string,
  value: string,
): Promise<{ ok: true; txHash: Hex } | { ok: false; error: string }> {
  const pkName =
    role === "investigator"
      ? "INVESTIGATOR_PRIVATE_KEY"
      : role === "disputer"
        ? "DISPUTER_PRIVATE_KEY"
        : "RELAYER_PRIVATE_KEY";
  const { publicClient, wallet } = clientsFor(pkName);
  const identity = loadEnsIdentity().identity;
  try {
    const hash = await wallet.writeContract({
      address: identity.permissionedResolver,
      abi: eacAbi,
      functionName: "setText",
      args: [ensNode, key, value],
      account: wallet.account!,
      chain: sepolia,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      return { ok: false, error: `tx reverted on-chain: ${hash}` };
    }
    return { ok: true, txHash: hash };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
