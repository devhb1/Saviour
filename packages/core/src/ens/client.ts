/**
 * ENSv2 Sepolia client — register address-label incident names + verdict texts.
 *
 * Write order (product):
 *   1. registerIncidentName(address label) → ensNode + setText verdicts
 *   2. SavioursRegistry.register(..., ensNode)
 *
 * Label = lowercase target address (PIVOT §2.3). Non-transferable bitmap.
 * Expiry: WATCH 7d / TAINTED 10y.
 * Writer: INVESTIGATOR_PRIVATE_KEY if set, else RELAYER_PRIVATE_KEY (until S3.3 EAC).
 *
 * AI never calls this. Only deterministic Remember after validateAssessment.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { namehash } from "viem/ens";
import { confidenceToPct } from "../confidence";
import { loadRootEnv, requireEnv } from "../config/env";
import { registryAddress } from "../registry/client";
import {
  INCIDENT_ROLE_BITMAP,
  REGISTRATION_ROLE_BITMAP,
  expiryUnixForStatus,
} from "./addresses";
import { permissionedResolverAbi, userRegistryAbi } from "./abi";
import { isEnsIdentityReady, loadEnsIdentity } from "./identity";
import { ensNameForAddress, labelForAddress } from "./label";

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

export { isEnsIdentityReady, loadEnsIdentity };
export { expiryUnixForStatus, INCIDENT_ROLE_BITMAP } from "./addresses";

/**
 * Legacy helper: `incident-<8 hex of incidentId>`.
 * Prefer address labels via `registerIncidentName` (PIVOT §2.3).
 */
export function ensLabelFromIncidentId(incidentId: Hex): string {
  const hex = incidentId.replace(/^0x/i, "").toLowerCase();
  if (hex.length < 8) {
    throw new Error(`incidentId too short for ENS label: ${incidentId}`);
  }
  return `incident-${hex.slice(0, 8)}`;
}

export type RegisterIncidentSubnameInput = {
  incidentId: Hex;
  label?: string;
  textRecords?: Record<string, string>;
  /** Override expiry unix; default 1y (legacy spike path) */
  expiryUnix?: bigint;
  /** Override role bitmap; default REGISTRATION_ROLE_BITMAP (legacy) */
  roleBitmap?: bigint;
};

export type RegisterIncidentSubnameResult = {
  ensName: string;
  ensNode: Hex;
  label: string;
  txHash: Hex | null;
  reused: boolean;
};

export type RegisterIncidentNameInput = {
  /** Target address — becomes the ENS label (lowercase). */
  address: string;
  status: "WATCH" | "TAINTED";
  /** On-chain / text incident id (bytes32 hex or SAV- label string already hashed elsewhere). */
  incidentId: Hex;
  /** Human incident label stored in saviours.incident */
  incidentLabel: string;
  /** 0–1 → written as 0–100 */
  confidence: number;
  evidenceHash: Hex;
  /** Signal ids or threat type tags */
  threat?: string;
  dossierUrl?: string;
  investigatorName?: string;
  /** Extra / override text records */
  textRecords?: Record<string, string>;
};

export type RegisterIncidentNameResult = RegisterIncidentSubnameResult & {
  expiryUnix: bigint;
  writer: Address;
};

function loadKey(envName: string): Hex {
  loadRootEnv();
  const raw = requireEnv(envName);
  return (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
}

function hasInvestigatorKey(): boolean {
  loadRootEnv();
  return Boolean(process.env.INVESTIGATOR_PRIVATE_KEY?.trim());
}

/** Verdict keys written by investigator (or relayer fallback). */
const VERDICT_KEYS = new Set([
  "saviours.status",
  "saviours.threat",
  "saviours.confidence",
  "saviours.evidenceHash",
  "saviours.dossier",
  "saviours.investigator",
  "saviours.incident",
]);

function clients(envName = "RELAYER_PRIVATE_KEY") {
  const key = loadKey(envName);
  const rpc = requireEnv("SEPOLIA_RPC_URL");
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

async function setTexts(
  wallet: WalletClient,
  publicClient: ReturnType<typeof createPublicClient>,
  resolver: Address,
  ensNode: Hex,
  texts: Record<string, string>,
): Promise<Hex | null> {
  let last: Hex | null = null;
  for (const [key, value] of Object.entries(texts)) {
    if (!key || value === undefined) continue;
    const current = await publicClient.readContract({
      address: resolver,
      abi: permissionedResolverAbi,
      functionName: "text",
      args: [ensNode, key],
    });
    if (current === value) continue;
    const h = await wallet.writeContract({
      address: resolver,
      abi: permissionedResolverAbi,
      functionName: "setText",
      args: [ensNode, key, value],
      account: wallet.account!,
      chain: sepolia,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: h });
    if (receipt.status !== "success") {
      throw new Error(`ENS setText(${key}) failed: ${h}`);
    }
    last = h;
  }
  return last;
}

/**
 * Register (or reuse) a label under the parent UserRegistry and set text records.
 * Low-level; prefer `registerIncidentName` for product Remember.
 */
export async function registerIncidentSubname(
  input: RegisterIncidentSubnameInput,
): Promise<RegisterIncidentSubnameResult> {
  const identity = loadEnsIdentity().identity;
  const label = input.label ?? ensLabelFromIncidentId(input.incidentId);

  // Address labels are 0x + 40 hex; legacy incident-* labels stay DNS-ish
  const addressLabel = /^0x[a-f0-9]{40}$/.test(label);
  if (
    !addressLabel &&
    !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label)
  ) {
    throw new Error(`Invalid ENS label: ${label}`);
  }

  const ensName = `${label}.${identity.parentName}`;
  const ensNode = namehash(ensName);
  // Register always via relayer (root registrar); verdict setText may use investigator.
  const { account, publicClient, wallet } = clients("RELAYER_PRIVATE_KEY");

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
    const expiry =
      input.expiryUnix ??
      BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);
    const roleBitmap = input.roleBitmap ?? REGISTRATION_ROLE_BITMAP;
    txHash = await wallet.writeContract({
      address: identity.userRegistry,
      abi: userRegistryAbi,
      functionName: "register",
      args: [
        label,
        account.address,
        ZERO,
        identity.permissionedResolver,
        roleBitmap,
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

  const textTx = await setTexts(
    wallet,
    publicClient,
    identity.permissionedResolver,
    ensNode,
    input.textRecords ?? {},
  );
  if (textTx) txHash = textTx;

  return { ensName, ensNode, label, txHash, reused };
}

/**
 * Product path: `<address>.<parent>.eth` + PIVOT §2.4 verdict texts + status expiry.
 *
 * Relayer registers + writes admin pointers (`saviours.registry` / network).
 * Investigator (if keyed) writes verdict texts; else relayer fallback.
 */
export async function registerIncidentName(
  input: RegisterIncidentNameInput,
): Promise<RegisterIncidentNameResult> {
  const label = labelForAddress(input.address);
  const ensName = ensNameForAddress(input.address);
  const expiryUnix = expiryUnixForStatus(input.status);
  const identity = loadEnsIdentity().identity;
  const confidencePct = confidenceToPct(input.confidence);

  const investigatorName =
    input.investigatorName ?? `investigator-01.${identity.parentName}`;

  const allTexts: Record<string, string> = {
    "saviours.status": input.status,
    "saviours.confidence": String(confidencePct),
    "saviours.evidenceHash": input.evidenceHash.toLowerCase(),
    "saviours.incident": input.incidentLabel,
    "saviours.registry": registryAddress("sepolia"),
    "saviours.network": "sepolia",
    "saviours.investigator": investigatorName,
    ...(input.threat ? { "saviours.threat": input.threat } : {}),
    ...(input.dossierUrl ? { "saviours.dossier": input.dossierUrl } : {}),
    ...input.textRecords,
  };

  const adminTexts: Record<string, string> = {};
  const verdictTexts: Record<string, string> = {};
  for (const [k, v] of Object.entries(allTexts)) {
    if (VERDICT_KEYS.has(k)) verdictTexts[k] = v;
    else adminTexts[k] = v;
  }

  const result = await registerIncidentSubname({
    incidentId: input.incidentId,
    label,
    textRecords: {},
    expiryUnix,
    roleBitmap: INCIDENT_ROLE_BITMAP,
  });

  const relayer = clients("RELAYER_PRIVATE_KEY");
  let txHash = result.txHash;
  const adminTx = await setTexts(
    relayer.wallet,
    relayer.publicClient,
    identity.permissionedResolver,
    result.ensNode,
    adminTexts,
  );
  if (adminTx) txHash = adminTx;

  const writerEnv = hasInvestigatorKey()
    ? "INVESTIGATOR_PRIVATE_KEY"
    : "RELAYER_PRIVATE_KEY";
  const writer = clients(writerEnv);
  const verdictTx = await setTexts(
    writer.wallet,
    writer.publicClient,
    identity.permissionedResolver,
    result.ensNode,
    verdictTexts,
  );
  if (verdictTx) txHash = verdictTx;

  return {
    ...result,
    ensName,
    txHash,
    expiryUnix,
    writer: writer.account.address,
  };
}
