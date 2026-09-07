/**
 * Deterministic "Remember" step after validateAssessment.
 *
 * AI never calls this. Investigate / API call it only for WATCH|TAINTED when a
 * deployment record exists. Missing deployments/*.json → skipped (not an error),
 * so local Graph/AI work keeps working before Sepolia deploy.
 *
 * Product: Investigate → Remember (here) → Protect (Shield reads same registry).
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Hex } from "viem";
import type { ThreatAssessment } from "../types";
import {
  registerIncidentFromAssessment,
  type RegistryNetwork,
} from "./client";
import { fingerprintBytes } from "./ids";

export type { RegistryNetwork };

export type RememberResult =
  | { persisted: false; reason: "status_not_persistable" | "deployment_missing" | "disabled" }
  | {
      persisted: true;
      incidentId: Hex;
      txHash: Hex | null;
      reused: boolean;
      incidentLabel: string;
    };

export type RememberOptions = {
  /** Default true — set false to force investigate-only. */
  enabled?: boolean;
  network?: RegistryNetwork;
  /** Override auto label SAV-<chain>-<addr8>-<fp8> */
  incidentLabel?: string;
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
  const result = await registerIncidentFromAssessment({
    assessment,
    incidentLabel,
    network,
  });

  return {
    persisted: true,
    incidentId: result.incidentId,
    txHash: result.txHash,
    reused: result.reused,
    incidentLabel,
  };
}
