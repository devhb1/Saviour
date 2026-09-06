/**
 * Turn a live Graph adapter row into the shared `Evidence` shape.
 * Hashes the raw payload for stable ids — does not invent chain facts.
 */

import { createHash } from "node:crypto";
import type { Evidence } from "../types";

export type NormalizeEvidenceInput = {
  id?: string;
  source: string;
  reference: string;
  claim: string;
  blockRange?: {
    from: number;
    to: number;
  };
  timestamp: number;
  /** Original Graph (or RPC) payload — hashed, never treated as the verdict */
  raw: unknown;
};

/** Stable content hash so the same raw payload maps to the same Evidence id. */
function stableRawHash(raw: unknown): string {
  const payload = typeof raw === "string" ? raw : JSON.stringify(raw);
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Map a live adapter row into the shared Evidence contract.
 * Adapters fetch; this function only shapes. No AI, no mocks.
 */
export function normalizeEvidence(input: NormalizeEvidenceInput): Evidence {
  if (!input.source.trim()) throw new Error("evidence.source is required");
  if (!input.reference.trim()) throw new Error("evidence.reference is required");
  if (!input.claim.trim()) throw new Error("evidence.claim is required");
  if (!Number.isFinite(input.timestamp)) {
    throw new Error("evidence.timestamp must be a finite number");
  }

  const rawHash = stableRawHash(input.raw);
  const id = input.id?.trim() || `ev-${rawHash.slice(0, 16)}`;

  return {
    id,
    source: input.source.trim(),
    reference: input.reference.trim(),
    claim: input.claim.trim(),
    blockRange: input.blockRange,
    timestamp: input.timestamp,
    rawHash,
  };
}
