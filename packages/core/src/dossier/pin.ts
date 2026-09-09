/**
 * Investigation dossier pin (PIVOT §2.4 `saviours.dossier`).
 *
 * 1) Prefer Pinata pinJSONToIPFS → `ipfs://<CID>` (never invent a CID)
 * 2) Fallback: write `apps/web/public/dossiers/<sha256>.json` → public URL
 *
 * Missing Pinata JWT is OK — fallback path. Fake CIDs are forbidden.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  hasIpfsPinningToken,
  loadRootEnv,
  requireIpfsPinningToken,
} from "../config/env";
import { evidenceHashFrom } from "../registry/ids";
import { repoRoot } from "../paths";
import type { Evidence, ThreatAssessment } from "../types";
import type { Signal } from "../evidence/signals";

export type DossierPayload = {
  version: 1;
  kind: "saviours.investigation";
  createdAt: string;
  entity: {
    chainId: number;
    address: string;
    entityType: string;
  };
  status: string;
  confidence: number;
  threatTypes: string[];
  signals: Signal[];
  evidence: Array<{
    id: string;
    source: string;
    protocol?: string;
    kind?: string;
    txHash?: string;
    claim: string;
    timestamp: number;
    amountUSD?: number;
    counterparty?: string;
  }>;
  counterEvidence: Array<{ id: string; claim: string }>;
  explanation: string | null;
  banner: string | null;
  modelVersion: string;
  rulesVersion: string;
  evidenceHash: string;
  incidentLabel: string | null;
};

export type PinDossierResult = {
  url: string;
  /** Present only when Pinata succeeded — never invented */
  cid: string | null;
  method: "pinata" | "public-json" | "skipped";
  contentHash: string;
  bytes: number;
};

export function dossiersDir(): string {
  return resolve(repoRoot(), "apps/web/public/dossiers");
}

/** Deterministic JSON for hashing (sorted keys, stable). */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) {
      out[k] = sortKeys(obj[k]);
    }
    return out;
  }
  return value;
}

export function contentHashOf(payload: unknown): string {
  return createHash("sha256").update(canonicalize(payload)).digest("hex");
}

export function buildDossier(input: {
  assessment: ThreatAssessment;
  signals?: Signal[];
  explanation?: string | null;
  banner?: string | null;
  incidentLabel?: string | null;
}): DossierPayload {
  const { assessment } = input;
  return {
    version: 1,
    kind: "saviours.investigation",
    createdAt: new Date().toISOString(),
    entity: {
      chainId: assessment.entity.chainId,
      address: assessment.entity.address.toLowerCase(),
      entityType: assessment.entity.entityType,
    },
    status: assessment.status,
    confidence: assessment.confidence,
    threatTypes: assessment.threatTypes,
    signals: input.signals ?? [],
    evidence: assessment.evidence.map((e: Evidence) => ({
      id: e.id,
      source: e.source,
      protocol: e.protocol,
      kind: e.kind,
      txHash: e.txHash,
      claim: e.claim,
      timestamp: e.timestamp,
      amountUSD: e.amountUSD,
      counterparty: e.counterparty,
    })),
    counterEvidence: assessment.counterEvidence.map((e) => ({
      id: e.id,
      claim: e.claim,
    })),
    explanation: input.explanation ?? null,
    banner: input.banner ?? null,
    modelVersion: assessment.modelVersion,
    rulesVersion: assessment.rulesVersion,
    evidenceHash: evidenceHashFrom(assessment.evidence),
    incidentLabel: input.incidentLabel ?? assessment.incidentId ?? null,
  };
}

async function pinJsonToPinata(
  payload: DossierPayload,
  name: string,
): Promise<{ cid: string; url: string }> {
  const jwt = requireIpfsPinningToken();
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: payload,
      pinataMetadata: { name },
      pinataOptions: { cidVersion: 1 },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata pinJSONToIPFS failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const body = (await res.json()) as { IpfsHash?: string };
  const cid = body.IpfsHash?.trim();
  if (!cid || cid.length < 10) {
    throw new Error("Pinata returned empty IpfsHash — refusing fake CID");
  }
  // Only return a CID we actually received from Pinata
  return { cid, url: `ipfs://${cid}` };
}

function publicBaseUrl(): string {
  loadRootEnv();
  return (
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function pinToPublicJson(payload: DossierPayload, hash: string): PinDossierResult {
  const body = `${canonicalize(payload)}\n`;
  const bytes = Buffer.byteLength(body);
  try {
    const dir = dossiersDir();
    mkdirSync(dir, { recursive: true });
    const file = resolve(dir, `${hash}.json`);
    writeFileSync(file, body, "utf8");
    const url = `${publicBaseUrl()}/dossiers/${hash}.json`;
    return {
      url,
      cid: null,
      method: "public-json",
      contentHash: hash,
      bytes,
    };
  } catch (e) {
    console.warn(
      "[dossier] public-json write skipped (read-only FS?):",
      e instanceof Error ? e.message : e,
    );
    return {
      url: "",
      cid: null,
      method: "skipped",
      contentHash: hash,
      bytes,
    };
  }
}

/**
 * Pin an investigation dossier. Pinata first; public JSON fallback.
 * Never invents an ipfs:// CID.
 */
export async function pinDossier(
  payload: DossierPayload,
  opts: { preferPinata?: boolean; name?: string } = {},
): Promise<PinDossierResult> {
  const hash = contentHashOf(payload);
  const name =
    opts.name ??
    `saviours-${payload.entity.address.slice(2, 10)}-${payload.status}`;

  const preferPinata = opts.preferPinata !== false;
  if (preferPinata && hasIpfsPinningToken()) {
    try {
      const pinned = await pinJsonToPinata(payload, name);
      return {
        url: pinned.url,
        cid: pinned.cid,
        method: "pinata",
        contentHash: hash,
        bytes: Buffer.byteLength(canonicalize(payload)),
      };
    } catch (e) {
      // Soft-fail to public JSON — never invent CID
      void e;
    }
  }

  return pinToPublicJson(payload, hash);
}

/** Convenience: build + pin from an assessment. */
export async function pinAssessmentDossier(input: {
  assessment: ThreatAssessment;
  signals?: Signal[];
  explanation?: string | null;
  banner?: string | null;
  incidentLabel?: string | null;
}): Promise<PinDossierResult & { dossier: DossierPayload }> {
  const dossier = buildDossier(input);
  const pinned = await pinDossier(dossier);
  return { ...pinned, dossier };
}

const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
];

/**
 * Fetch a dossier from ipfs://, https://, or local /dossiers/<hash>.json.
 */
export async function fetchDossier(url: string): Promise<DossierPayload> {
  const trimmed = url.trim();
  if (!trimmed) throw new Error("empty dossier url");

  if (trimmed.startsWith("ipfs://")) {
    const cid = trimmed.slice("ipfs://".length).replace(/^ipfs\//, "");
    let lastErr: Error | null = null;
    for (const gw of IPFS_GATEWAYS) {
      try {
        const res = await fetch(`${gw}${cid}`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          lastErr = new Error(`${gw} → ${res.status}`);
          continue;
        }
        return (await res.json()) as DossierPayload;
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
      }
    }
    throw lastErr ?? new Error(`Failed to fetch ipfs://${cid}`);
  }

  // Local public fallback path
  const localMatch = trimmed.match(/\/dossiers\/([a-f0-9]{64})\.json(?:\?.*)?$/i);
  if (localMatch) {
    const file = resolve(dossiersDir(), `${localMatch[1]!.toLowerCase()}.json`);
    if (existsSync(file)) {
      const { readFileSync } = await import("node:fs");
      return JSON.parse(readFileSync(file, "utf8")) as DossierPayload;
    }
  }

  const res = await fetch(trimmed, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`fetchDossier ${trimmed} → ${res.status}`);
  }
  return (await res.json()) as DossierPayload;
}
