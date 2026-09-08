/**
 * Govern — dispute + revoke over ENSv2 (PIVOT §3.4 / S3.5).
 *
 * Dispute (disputer EOA):
 *   saviours.status → WATCH
 *   saviours.dispute → `<reason> @ <unix> by <disputer>`
 *   renew → now+7d when that *extends* current expiry (cannot reduce TAINTED 10y)
 *
 * Revoke (relayer root ROLE_UNREGISTER):
 *   clear saviours.status (+ dispute note)
 *   UserRegistry.unregister(findTokenId(label))
 *
 * Shield is ENS-first: dispute ⇒ WARN. After revoke, ENS miss (registration check);
 * SavioursRegistry rows stay append-only in this cut (documented).
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
import { userRegistryAbi, permissionedResolverAbi } from "./abi";
import { expiryUnixForStatus } from "./addresses";
import { isEnsIdentityReady, loadEnsIdentity } from "./identity";
import { ensNameForAddress, labelForAddress } from "./label";
import { disputerAccount, relayerAccount } from "./roles";
import {
  isIncidentNameRegistered,
  resolveIncident,
} from "./resolve";

export type DisputeInput = {
  address: string;
  reason: string;
};

export type DisputeResult = {
  ensName: string;
  ensNode: Hex;
  status: "WATCH";
  disputeRecord: string;
  statusTxHash: Hex;
  disputeTxHash: Hex;
  renewTxHash: Hex | null;
  renewSkipped: string | null;
  expiryUnix: bigint | null;
  disputer: Address;
};

export type RevokeInput = {
  address: string;
  /** Optional note written to saviours.dispute before clear/unregister */
  note?: string;
};

export type RevokeResult = {
  ensName: string;
  ensNode: Hex;
  label: string;
  tokenId: bigint;
  clearStatusTxHash: Hex | null;
  unregisterTxHash: Hex;
  relayer: Address;
  /** Registry memory is unchanged in this hackathon cut */
  registryNote: string;
};

function pk(name: string): Hex {
  loadRootEnv();
  const raw = requireEnv(name);
  return (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
}

function clients(envName: string): {
  account: ReturnType<typeof privateKeyToAccount>;
  publicClient: PublicClient;
  wallet: WalletClient;
} {
  const account = privateKeyToAccount(pk(envName));
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

async function setText(
  wallet: WalletClient,
  publicClient: PublicClient,
  resolver: Address,
  node: Hex,
  key: string,
  value: string,
): Promise<Hex> {
  const hash = await wallet.writeContract({
    address: resolver,
    abi: permissionedResolverAbi,
    functionName: "setText",
    args: [node, key, value],
    account: wallet.account!,
    chain: sepolia,
  });
  await waitOk(publicClient, hash, `setText(${key})`);
  return hash;
}

/**
 * Disputer flips named incident to WATCH and records the dispute reason.
 */
export async function disputeIncident(
  input: DisputeInput,
): Promise<DisputeResult> {
  if (!isEnsIdentityReady()) {
    throw new Error("Need deployments/sepolia-ens-identity.json");
  }
  const reason = input.reason.trim();
  if (!reason || reason.length > 500) {
    throw new Error("dispute reason required (1–500 chars)");
  }
  const label = labelForAddress(input.address);
  const ensName = ensNameForAddress(input.address);
  const ensNode = namehash(ensName);

  if (!(await isIncidentNameRegistered(input.address))) {
    throw new Error(`ENS name not registered: ${ensName}`);
  }

  const identity = loadEnsIdentity().identity;
  const disputer = disputerAccount();
  const { publicClient, wallet } = clients("DISPUTER_PRIVATE_KEY");
  const ts = Math.floor(Date.now() / 1000);
  const disputeRecord = `${reason} @ ${ts} by ${disputer.address.toLowerCase()}`;

  const statusTxHash = await setText(
    wallet,
    publicClient,
    identity.permissionedResolver,
    ensNode,
    "saviours.status",
    "WATCH",
  );
  const disputeTxHash = await setText(
    wallet,
    publicClient,
    identity.permissionedResolver,
    ensNode,
    "saviours.dispute",
    disputeRecord,
  );

  // renew to WATCH window when it extends; cannot reduce TAINTED 10y expiry
  const watchExpiry = expiryUnixForStatus("WATCH");
  let renewTxHash: Hex | null = null;
  let renewSkipped: string | null = null;
  let expiryUnix: bigint | null = null;

  const relayer = clients("RELAYER_PRIVATE_KEY");
  try {
    const tokenId = await relayer.publicClient.readContract({
      address: identity.userRegistry,
      abi: userRegistryAbi,
      functionName: "findTokenId",
      args: [label],
    });
    const currentExpiry = await relayer.publicClient.readContract({
      address: identity.userRegistry,
      abi: userRegistryAbi,
      functionName: "getExpiry",
      args: [tokenId],
    });
    if (currentExpiry < watchExpiry) {
      renewTxHash = await relayer.wallet.writeContract({
        address: identity.userRegistry,
        abi: userRegistryAbi,
        functionName: "renew",
        args: [tokenId, watchExpiry],
        account: relayer.wallet.account!,
        chain: sepolia,
      });
      await waitOk(relayer.publicClient, renewTxHash, "renew");
      expiryUnix = watchExpiry;
    } else {
      renewSkipped =
        `cannot_reduce_expiry (current=${currentExpiry} watch=${watchExpiry}) — status is WATCH; revoke to drop name`;
      expiryUnix = currentExpiry;
    }
  } catch (e) {
    renewSkipped = e instanceof Error ? e.message : String(e);
  }

  return {
    ensName,
    ensNode,
    status: "WATCH",
    disputeRecord,
    statusTxHash,
    disputeTxHash,
    renewTxHash,
    renewSkipped,
    expiryUnix,
    disputer: disputer.address,
  };
}

/**
 * Relayer clears verdict status and unregisters the address-label name.
 * Does not mutate SavioursRegistry (append-only in this cut).
 */
export async function revokeIncidentName(
  input: RevokeInput,
): Promise<RevokeResult> {
  if (!isEnsIdentityReady()) {
    throw new Error("Need deployments/sepolia-ens-identity.json");
  }
  const label = labelForAddress(input.address);
  const ensName = ensNameForAddress(input.address);
  const ensNode = namehash(ensName);
  const identity = loadEnsIdentity().identity;
  const relayer = relayerAccount();

  if (!(await isIncidentNameRegistered(input.address))) {
    throw new Error(`ENS name not registered: ${ensName}`);
  }

  const { publicClient, wallet } = clients("RELAYER_PRIVATE_KEY");

  let clearStatusTxHash: Hex | null = null;
  if (input.note?.trim()) {
    clearStatusTxHash = await setText(
      wallet,
      publicClient,
      identity.permissionedResolver,
      ensNode,
      "saviours.dispute",
      `revoked: ${input.note.trim()} @ ${Math.floor(Date.now() / 1000)}`,
    );
  }
  // Clear status so any lingering post-unregister reads are empty
  const clearTx = await setText(
    wallet,
    publicClient,
    identity.permissionedResolver,
    ensNode,
    "saviours.status",
    "",
  );
  clearStatusTxHash = clearTx;

  const tokenId = await publicClient.readContract({
    address: identity.userRegistry,
    abi: userRegistryAbi,
    functionName: "findTokenId",
    args: [label],
  });

  const unregisterTxHash = await wallet.writeContract({
    address: identity.userRegistry,
    abi: userRegistryAbi,
    functionName: "unregister",
    args: [tokenId],
    account: wallet.account!,
    chain: sepolia,
  });
  await waitOk(publicClient, unregisterTxHash, "unregister");

  // Sanity: registration gone
  if (await isIncidentNameRegistered(input.address)) {
    throw new Error(`unregister did not clear resolver for ${ensName}`);
  }

  return {
    ensName,
    ensNode,
    label,
    tokenId,
    clearStatusTxHash,
    unregisterTxHash,
    relayer: relayer.address,
    registryNote:
      "SavioursRegistry is append-only in this cut — ENS name revoked; Shield falls through to registry if a row exists",
  };
}

/** Read-only helper for govern UI. */
export async function governSnapshot(address: string) {
  const registered = await isIncidentNameRegistered(address);
  const resolved = registered
    ? await resolveIncident(address)
    : await resolveIncident(address);
  return {
    address: labelForAddress(address),
    ensName: ensNameForAddress(address),
    registered,
    status: resolved.records["saviours.status"] ?? "",
    dispute: resolved.records["saviours.dispute"] ?? "",
    records: resolved.records,
  };
}
