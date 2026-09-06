/**
 * Hash helpers for on-chain registry fields.
 *
 * On-chain stores bytes32 only — never the full AI report.
 * incidentId / fingerprint / evidenceHash are derived deterministically
 * so retries stay idempotent with SavioursRegistry.register().
 */

import { createHash } from "node:crypto";
import { keccak256, stringToBytes } from "viem";
import type { Evidence, Fingerprint, ThreatAssessment } from "../types";

/** keccak256 of UTF-8 string → 0x-prefixed 32-byte hex. */
export function keccakUtf8(value: string): `0x${string}` {
  return keccak256(stringToBytes(value));
}

/** Stable incident id bytes32 from a human label, e.g. SAV-ETH-0001. */
export function incidentIdBytes(label: string): `0x${string}` {
  return keccakUtf8(label);
}

/**
 * Fingerprint hash for idempotency key (chainId+target+fingerprint on-chain).
 * Prefers runtime/behavior hashes when present; otherwise hashes the object.
 */
export function fingerprintBytes(
  fingerprint: Fingerprint | undefined,
  fallbackSeed: string,
): `0x${string}` {
  if (fingerprint?.behaviorHash) {
    return normalizeBytes32(fingerprint.behaviorHash);
  }
  if (fingerprint?.runtimeCodeHash) {
    return normalizeBytes32(fingerprint.runtimeCodeHash);
  }
  return keccakUtf8(JSON.stringify(fingerprint ?? { seed: fallbackSeed }));
}

/** Hash of evidence rawHashes (dossier commitment until IPFS lands). */
export function evidenceHashFrom(evidence: Evidence[]): `0x${string}` {
  const material = evidence
    .map((e) => e.rawHash)
    .sort()
    .join("|");
  // sha256 is fine for off-chain commitment; stored as bytes32 on-chain
  return `0x${createHash("sha256").update(material).digest("hex")}`;
}

/** confidence 0–1 → on-chain bucket 0–100. */
export function confidenceBucket(confidence: number): number {
  if (!Number.isFinite(confidence)) return 0;
  return Math.max(0, Math.min(100, Math.round(confidence * 100)));
}

export function primaryThreatIndex(assessment: ThreatAssessment): number {
  const order = [
    "DRAINER",
    "DANGEROUS_APPROVAL",
    "MALICIOUS_RECIPIENT",
    "EXPLOIT_CONTRACT",
    "MALICIOUS_UPGRADE",
    "SUSPICIOUS_BEHAVIOR",
  ] as const;
  const first = assessment.threatTypes[0];
  const idx = first ? order.indexOf(first) : -1;
  return idx >= 0 ? idx : order.indexOf("SUSPICIOUS_BEHAVIOR");
}

function normalizeBytes32(hex: string): `0x${string}` {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (/^[a-fA-F0-9]{64}$/.test(h)) {
    return `0x${h.toLowerCase()}`;
  }
  return keccakUtf8(hex);
}
