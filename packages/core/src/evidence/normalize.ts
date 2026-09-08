/**
 * Turn a live Graph adapter row into the shared `Evidence` shape.
 * Hashes the raw payload for stable ids — does not invent chain facts.
 */

import { createHash } from "node:crypto";
import type { Evidence, EvidenceKind, HexAddress } from "../types";

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
  subgraphId?: string;
  protocol?: string;
  schema?: string;
  kind?: EvidenceKind;
  txHash?: string;
  block?: number;
  amountUSD?: number;
  counterparty?: HexAddress;
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

  const evidence: Evidence = {
    id,
    source: input.source.trim(),
    reference: input.reference.trim(),
    claim: input.claim.trim(),
    blockRange: input.blockRange,
    timestamp: input.timestamp,
    rawHash,
  };

  if (input.subgraphId?.trim()) evidence.subgraphId = input.subgraphId.trim();
  if (input.protocol?.trim()) evidence.protocol = input.protocol.trim();
  if (input.schema?.trim()) evidence.schema = input.schema.trim();
  if (input.kind) evidence.kind = input.kind;
  if (input.txHash?.trim()) evidence.txHash = input.txHash.trim();
  if (input.block !== undefined && Number.isFinite(input.block)) {
    evidence.block = input.block;
  }
  if (input.amountUSD !== undefined && Number.isFinite(input.amountUSD)) {
    evidence.amountUSD = input.amountUSD;
  }
  if (input.counterparty) evidence.counterparty = input.counterparty;

  return evidence;
}
