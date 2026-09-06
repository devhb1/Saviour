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
  raw: unknown;
};

function stableRawHash(raw: unknown): string {
  const payload = typeof raw === "string" ? raw : JSON.stringify(raw);
  return createHash("sha256").update(payload).digest("hex");
}

/** Map raw adapter payload into the shared Evidence contract. */
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
