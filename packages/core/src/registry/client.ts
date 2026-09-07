/**
 * TypeScript client for SavioursRegistry.
 *
 * ## Chain boundary (sorted — intentional)
 * - **Evidence / threats:** Ethereum mainnet (and other L1s later) via The Graph.
 *   `Incident.chainId` stores the *target’s* chain (usually `1`).
 * - **Security memory:** SavioursRegistry on **Sepolia** (hackathon write surface).
 *   `anvil` is for local gates only.
 * - Looking up a mainnet drainer reads Sepolia for key `(chainId=1, target)`.
 *   We are NOT deploying the registry to mainnet in this hackathon.
 *
 * - Address always from deployments/<network>.json (never .env)
 * - Writes require RELAYER_PRIVATE_KEY (REGISTRAR_ROLE)
 * - AI never calls this — only deterministic code after validateAssessment
 *
 * Product loop: Investigate (mainnet Graph) → Remember (Sepolia) → Protect (Shield)
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Chain,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry, sepolia } from "viem/chains";
import { loadRootEnv, requireEnv } from "../config/env";
import type { AssessmentStatus, ThreatAssessment } from "../types";
import { savioursRegistryAbi } from "./abi";
import {
  confidenceBucket,
  evidenceHashFrom,
  fingerprintBytes,
  incidentIdBytes,
  primaryThreatIndex,
} from "./ids";

export type RegistryNetwork = "sepolia" | "anvil";

export type DeploymentRecord = {
  network: string;
  chainId: number;
  contracts: {
    SavioursRegistry: {
      address: string;
      blockNumber: number;
      abiHash: string;
      deployedAt: string;
      deployTxHash?: string;
    };
  };
};

export type OnChainIncident = {
  incidentId: Hex;
  chainId: number;
  target: Address;
  fingerprint: Hex;
  status: AssessmentStatus;
  threatType: number;
  confidenceBucket: number;
  evidenceHash: Hex;
  ensNode: Hex;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

const STATUS_TO_ENUM: Record<"WATCH" | "TAINTED", number> = {
  WATCH: 1,
  TAINTED: 2,
};

const ENUM_TO_STATUS: AssessmentStatus[] = ["SAFE", "WATCH", "TAINTED", "UNKNOWN"];

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

function repoRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "../../../../");
}

function chainFor(network: RegistryNetwork): Chain {
  return network === "anvil" ? foundry : sepolia;
}

function rpcFor(network: RegistryNetwork): string {
  loadRootEnv();
  if (network === "anvil") {
    return process.env.ANVIL_RPC_URL?.trim() || "http://127.0.0.1:8545";
  }
  return requireEnv("SEPOLIA_RPC_URL");
}

/** Load deployments/<network>.json written by `pnpm deploy:record`. */
export function loadDeployment(network: RegistryNetwork = "sepolia"): DeploymentRecord {
  const path = resolve(repoRoot(), `deployments/${network}.json`);
  if (!existsSync(path)) {
    throw new Error(
      `Missing ${path}. Deploy with forge, then run: pnpm deploy:record -- --network ${network}`,
    );
  }
  return JSON.parse(readFileSync(path, "utf8")) as DeploymentRecord;
}

export function registryAddress(network: RegistryNetwork = "sepolia"): Address {
  const dep = loadDeployment(network);
  const addr = dep.contracts.SavioursRegistry.address as Address;
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    throw new Error(`Invalid SavioursRegistry address in deployments/${network}.json`);
  }
  return addr;
}

export function createRegistryPublicClient(
  network: RegistryNetwork = "sepolia",
): PublicClient {
  return createPublicClient({
    chain: chainFor(network),
    transport: http(rpcFor(network)),
  });
}

function createRegistryWalletClient(network: RegistryNetwork): WalletClient {
  loadRootEnv();
  const pk = requireEnv("RELAYER_PRIVATE_KEY");
  const key = (pk.startsWith("0x") ? pk : `0x${pk}`) as Hex;
  const account = privateKeyToAccount(key);
  return createWalletClient({
    account,
    chain: chainFor(network),
    transport: http(rpcFor(network)),
  });
}

function mapIncident(row: {
  incidentId: Hex;
  chainId: bigint | number;
  target: Address;
  fingerprint: Hex;
  status: number;
  threatType: number;
  confidenceBucket: number;
  evidenceHash: Hex;
  ensNode: Hex;
  createdAt: bigint | number;
  updatedAt: bigint | number;
  expiresAt: bigint | number;
}): OnChainIncident {
  return {
    incidentId: row.incidentId,
    chainId: Number(row.chainId),
    target: row.target,
    fingerprint: row.fingerprint,
    status: ENUM_TO_STATUS[row.status] ?? "UNKNOWN",
    threatType: row.threatType,
    confidenceBucket: row.confidenceBucket,
    evidenceHash: row.evidenceHash,
    ensNode: row.ensNode,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
    expiresAt: Number(row.expiresAt),
  };
}

/** Read an incident by id. Returns null if unset (createdAt == 0). */
export async function getIncident(
  incidentId: Hex,
  network: RegistryNetwork = "sepolia",
): Promise<OnChainIncident | null> {
  const client = createRegistryPublicClient(network);
  const address = registryAddress(network);
  const row = await client.readContract({
    address,
    abi: savioursRegistryAbi,
    functionName: "getIncident",
    args: [incidentId],
  });
  const mapped = mapIncident(row as Parameters<typeof mapIncident>[0]);
  if (mapped.createdAt === 0) return null;
  return mapped;
}

/** Lookup by idempotency key used on-chain. */
export async function getIncidentIdByTargetFingerprint(
  chainId: number,
  target: Address,
  fingerprint: Hex,
  network: RegistryNetwork = "sepolia",
): Promise<Hex | null> {
  const client = createRegistryPublicClient(network);
  const address = registryAddress(network);
  const id = await client.readContract({
    address,
    abi: savioursRegistryAbi,
    functionName: "getIncidentIdByTargetFingerprint",
    args: [BigInt(chainId), target, fingerprint],
  });
  const hex = id as Hex;
  if (hex === ZERO_BYTES32) return null;
  return hex;
}

/** Lookup by target alone — used by Shield Tier-1 and get_known_incidents. */
export async function getLatestIncidentByTarget(
  chainId: number,
  target: Address,
  network: RegistryNetwork = "sepolia",
): Promise<OnChainIncident | null> {
  const client = createRegistryPublicClient(network);
  const address = registryAddress(network);
  const id = await client.readContract({
    address,
    abi: savioursRegistryAbi,
    functionName: "getLatestIncidentIdByTarget",
    args: [BigInt(chainId), target],
  });
  const hex = id as Hex;
  if (hex === ZERO_BYTES32) return null;
  return getIncident(hex, network);
}

export type RegisterFromAssessmentInput = {
  assessment: ThreatAssessment;
  /** Human label hashed to bytes32, e.g. SAV-ETH-0001 */
  incidentLabel: string;
  ensNode?: Hex;
  network?: RegistryNetwork;
};

/**
 * Persist a validated WATCH/TAINTED assessment.
 * Call only from deterministic code after validateAssessment — never from the LLM.
 */
export async function registerIncidentFromAssessment(
  input: RegisterFromAssessmentInput,
): Promise<{ incidentId: Hex; txHash: Hex | null; reused: boolean }> {
  const { assessment, incidentLabel } = input;
  const network = input.network ?? "sepolia";

  if (assessment.status !== "WATCH" && assessment.status !== "TAINTED") {
    throw new Error(`Refusing to register status ${assessment.status}`);
  }

  const incidentId = incidentIdBytes(incidentLabel);
  const fingerprint = fingerprintBytes(
    assessment.fingerprint,
    `${assessment.entity.chainId}:${assessment.entity.address}`,
  );
  const evidenceHash = evidenceHashFrom(assessment.evidence);
  const address = registryAddress(network);

  const existing = await getIncidentIdByTargetFingerprint(
    assessment.entity.chainId,
    assessment.entity.address as Address,
    fingerprint,
    network,
  );
  if (existing) {
    return { incidentId: existing, txHash: null, reused: true };
  }

  const wallet = createRegistryWalletClient(network);
  const account = wallet.account;
  if (!account) throw new Error("Relayer wallet has no account");

  const hash = await wallet.writeContract({
    address,
    abi: savioursRegistryAbi,
    functionName: "register",
    args: [
      {
        incidentId,
        chainId: BigInt(assessment.entity.chainId),
        target: assessment.entity.address as Address,
        fingerprint,
        status: STATUS_TO_ENUM[assessment.status],
        threatType: primaryThreatIndex(assessment),
        confidenceBucket: confidenceBucket(assessment.confidence),
        evidenceHash,
        ensNode: input.ensNode ?? ZERO_BYTES32,
        expiresAt: BigInt(assessment.expiresAt ?? 0),
      },
    ],
    account,
    chain: chainFor(network),
  });

  // Wait until mined so Shield / getLatest see the write immediately
  const publicClient = createRegistryPublicClient(network);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`Registry register tx failed: ${hash}`);
  }

  return { incidentId, txHash: hash, reused: false };
}
