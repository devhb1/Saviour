/**
 * ENSv2 Sepolia client — register incident subnames under the spike parent.
 *
 * Write order (product):
 *   1. registerIncidentSubname → ensNode
 *   2. SavioursRegistry.register(..., ensNode)
 *
 * AI never calls this. Only deterministic Remember after validateAssessment.
 *
 * Requires deployments/sepolia-ens-identity.json from `pnpm spike:ens`.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { namehash } from "viem/ens";
import { loadRootEnv, requireEnv } from "../config/env";
import { REGISTRATION_ROLE_BITMAP } from "./addresses";
import { permissionedResolverAbi, userRegistryAbi } from "./abi";
import { isEnsIdentityReady, loadEnsIdentity } from "./identity";

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

export { isEnsIdentityReady, loadEnsIdentity };

/**
 * ENS label under parent: `incident-<8 hex of incidentId>`.
 * Deterministic so retries reuse the same subname.
 */
export function ensLabelFromIncidentId(incidentId: Hex): string {
  const hex = incidentId.replace(/^0x/i, "").toLowerCase();
  if (hex.length < 8) {
    throw new Error(`incidentId too short for ENS label: ${incidentId}`);
  }
  return `incident-${hex.slice(0, 8)}`;
}

export type RegisterIncidentSubnameInput = {
  /** bytes32 incident id (same as registry incidentId) */
  incidentId: Hex;
  /** Optional override; default from ensLabelFromIncidentId */
  label?: string;
  /** Resolver text records (saviours.registry etc.) */
  textRecords?: Record<string, string>;
};

export type RegisterIncidentSubnameResult = {
  ensName: string;
  ensNode: Hex;
  label: string;
  txHash: Hex | null;
  reused: boolean;
};

function clients() {
  loadRootEnv();
  const pk = requireEnv("RELAYER_PRIVATE_KEY");
  const rpc = requireEnv("SEPOLIA_RPC_URL");
  const key = (pk.startsWith("0x") ? pk : `0x${pk}`) as Hex;
  const account = privateKeyToAccount(key);
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

/**
 * Register (or reuse) `incident-XXXXXXXX.<parent>.eth` and set text records.
 */
export async function registerIncidentSubname(
  input: RegisterIncidentSubnameInput,
): Promise<RegisterIncidentSubnameResult> {
  const identity = loadEnsIdentity().identity;
  const label = input.label ?? ensLabelFromIncidentId(input.incidentId);
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) {
    throw new Error(`Invalid ENS label: ${label}`);
  }

  const ensName = `${label}.${identity.parentName}`;
  const ensNode = namehash(ensName);
  const { account, publicClient, wallet } = clients();

  // Idempotent: getResolver(label) non-zero ⇒ already minted under UserRegistry
  const existingResolver = await publicClient.readContract({
    address: identity.userRegistry,
    abi: userRegistryAbi,
    functionName: "getResolver",
    args: [label],
  });

  let txHash: Hex | null = null;
  let reused = false;

  if (existingResolver !== ZERO) {
    reused = true;
  } else {
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);
    txHash = await wallet.writeContract({
      address: identity.userRegistry,
      abi: userRegistryAbi,
      functionName: "register",
      args: [
        label,
        account.address,
        ZERO,
        identity.permissionedResolver,
        REGISTRATION_ROLE_BITMAP,
        expiry,
      ],
      account,
      chain: sepolia,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      throw new Error(`ENS subname register failed: ${txHash}`);
    }
  }

  const texts = input.textRecords ?? {};
  for (const [key, value] of Object.entries(texts)) {
    if (!key || value === undefined) continue;
    const current = await publicClient.readContract({
      address: identity.permissionedResolver,
      abi: permissionedResolverAbi,
      functionName: "text",
      args: [ensNode, key],
    });
    if (current === value) continue;
    const h = await wallet.writeContract({
      address: identity.permissionedResolver,
      abi: permissionedResolverAbi,
      functionName: "setText",
      args: [ensNode, key, value],
      account,
      chain: sepolia,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: h });
    if (receipt.status !== "success") {
      throw new Error(`ENS setText(${key}) failed: ${h}`);
    }
    txHash = h;
  }

  return { ensName, ensNode, label, txHash, reused };
}
