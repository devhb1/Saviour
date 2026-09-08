/**
 * Deterministic "Remember" step after validateAssessment.
 *
 * AI never calls this. Investigate / API call it only for WATCH|TAINTED when a
 * deployment record exists. Missing deployments/*.json → skipped (not an error),
 * so local Graph/AI work keeps working before Sepolia deploy.
 *
 * ## Write order (Sepolia + ENS identity present)
 * 0. Idempotency check (chainId+target+fingerprint) — reuse skips ENS+register
 * 1. Register ENSv2 address-label name → verdict text records → ensNode
 * 2. SavioursRegistry.register(..., ensNode)
 *
 * Anvil / missing ENS identity → registry write with zero ensNode (local gates).
 *
 * Product: Investigate → Remember (here) → Protect (Shield reads ENS then registry).
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Address, Hex } from "viem";
import {
  isEnsIdentityReady,
  registerIncidentName,
} from "../ens/client";
import type { ThreatAssessment } from "../types";
import {
  getIncident,
  getIncidentIdByTargetFingerprint,
  registerIncidentFromAssessment,
  registryAddress,
  type RegistryNetwork,
} from "./client";
import {
  evidenceHashFrom,
  fingerprintBytes,
  incidentIdBytes,
} from "./ids";

export type { RegistryNetwork };

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

export type RememberResult =
  | { persisted: false; reason: "status_not_persistable" | "deployment_missing" | "disabled" }
  | {
      persisted: true;
      incidentId: Hex;
      txHash: Hex | null;
      reused: boolean;
      incidentLabel: string;
      /** ENSv2 namehash written on-chain (zero if ENS skipped) */
      ensNode: Hex;
      /** Full name e.g. 0xabc….parent.eth — null if ENS skipped */
      ensName: string | null;
      ensTxHash: Hex | null;
      ensReused: boolean;
      expiryUnix?: bigint;
    };

export type RememberOptions = {
  /** Default true — set false to force investigate-only. */
  enabled?: boolean;
  network?: RegistryNetwork;
  /** Override auto label SAV-<chain>-<addr8>-<fp8> */
  incidentLabel?: string;
  /**
   * Attempt ENSv2 address-label name before registry write.
   * Default true on sepolia when sepolia-ens-identity.json exists; ignored on anvil.
   */
  ens?: boolean;
  /** Optional signal ids for saviours.threat text */
  threatSignals?: string[];
  /** Optional dossier URL — never invent ipfs:// CIDs */
  dossierUrl?: string;
};

function deploymentPath(network: RegistryNetwork): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, `../../../../deployments/${network}.json`);
}

export function isRegistryDeployed(network: RegistryNetwork = "sepolia"): boolean {
  return existsSync(deploymentPath(network));
}

function defaultLabel(assessment: ThreatAssessment): string {
  const addr = assessment.entity.address.replace(/^0x/i, "").slice(0, 8).toLowerCase();
  const fp = fingerprintBytes(
    assessment.fingerprint,
    `${assessment.entity.chainId}:${assessment.entity.address}`,
  ).slice(2, 10);
  return `SAV-${assessment.entity.chainId}-${addr}-${fp}`;
}

/**
 * Persist a validated assessment when status is WATCH/TAINTED and registry is deployed.
 */
export async function rememberValidatedAssessment(
  assessment: ThreatAssessment,
  options: RememberOptions = {},
): Promise<RememberResult> {
  const network = options.network ?? "sepolia";
  const enabled = options.enabled ?? true;

  if (!enabled) {
    return { persisted: false, reason: "disabled" };
  }
  if (assessment.status !== "WATCH" && assessment.status !== "TAINTED") {
    return { persisted: false, reason: "status_not_persistable" };
  }
  if (!isRegistryDeployed(network)) {
    return { persisted: false, reason: "deployment_missing" };
  }

  const incidentLabel = options.incidentLabel ?? defaultLabel(assessment);
  const incidentId = incidentIdBytes(incidentLabel);
  const fingerprint = fingerprintBytes(
    assessment.fingerprint,
    `${assessment.entity.chainId}:${assessment.entity.address}`,
  );

  // Idempotent reuse — do not mint another ENS subname or re-register
  const existingId = await getIncidentIdByTargetFingerprint(
    assessment.entity.chainId,
    assessment.entity.address as Address,
    fingerprint,
    network,
  );
  if (existingId) {
    const row = await getIncident(existingId, network);
    return {
      persisted: true,
      incidentId: existingId,
      txHash: null,
      reused: true,
      incidentLabel,
      ensNode: row?.ensNode ?? ZERO_BYTES32,
      ensName: null,
      ensTxHash: null,
      ensReused: false,
    };
  }

  let ensNode: Hex = ZERO_BYTES32;
  let ensName: string | null = null;
  let ensTxHash: Hex | null = null;
  let ensReused = false;
  let expiryUnix: bigint | undefined;

  const wantEns =
    (options.ens ?? true) && network === "sepolia" && isEnsIdentityReady();

  if (wantEns) {
    const threat =
      options.threatSignals?.join(",") ||
      assessment.threatTypes.join(",") ||
      undefined;

    // ENS first — if this throws, we do not write the registry (ordered memory).
    const ens = await registerIncidentName({
      address: assessment.entity.address,
      status: assessment.status,
      incidentId,
      incidentLabel,
      confidence: assessment.confidence,
      evidenceHash: evidenceHashFrom(assessment.evidence),
      threat,
      dossierUrl: options.dossierUrl,
      textRecords: {
        // keep registry pointer even if registerIncidentName already sets it
        "saviours.registry": registryAddress(network),
      },
    });
    ensNode = ens.ensNode;
    ensName = ens.ensName;
    ensTxHash = ens.txHash;
    ensReused = ens.reused;
    expiryUnix = ens.expiryUnix;
  }

  const result = await registerIncidentFromAssessment({
    assessment,
    incidentLabel,
    ensNode,
    network,
  });

  return {
    persisted: true,
    incidentId: result.incidentId,
    txHash: result.txHash,
    reused: result.reused,
    incidentLabel,
    ensNode,
    ensName,
    ensTxHash,
    ensReused,
    expiryUnix,
  };
}
