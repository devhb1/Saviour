import type {
  AssessmentStatus,
  EntityType,
  Evidence,
  ThreatAssessment,
  ThreatType,
} from "../types";

/**
 * Deterministic policy floor over model output.
 * - Never let empty-evidence SAFE stand (→ UNKNOWN)
 * - TAINTED requires ≥2 evidence items (or fingerprint later)
 * - Threat types must be in the frozen taxonomy
 *
 * Synthetic Evidence objects appear only in `evals/run-rules.ts` to unit-test
 * these rules. They are not used in the product investigate path.
 */

const STATUSES = new Set<AssessmentStatus>(["SAFE", "WATCH", "TAINTED", "UNKNOWN"]);
const ENTITY_TYPES = new Set<EntityType>(["EOA", "CONTRACT", "PROXY"]);
const THREAT_TYPES = new Set<ThreatType>([
  "DRAINER",
  "DANGEROUS_APPROVAL",
  "MALICIOUS_RECIPIENT",
  "EXPLOIT_CONTRACT",
  "MALICIOUS_UPGRADE",
  "SUSPICIOUS_BEHAVIOR",
]);

export const RULES_VERSION = "0.1.0";

function asEvidenceList(value: unknown): Evidence[] {
  if (!Array.isArray(value)) return [];
  const out: Evidence[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (
      typeof r.id !== "string" ||
      typeof r.source !== "string" ||
      typeof r.reference !== "string" ||
      typeof r.claim !== "string" ||
      typeof r.timestamp !== "number" ||
      typeof r.rawHash !== "string"
    ) {
      continue;
    }
    out.push({
      id: r.id,
      source: r.source,
      reference: r.reference,
      claim: r.claim,
      timestamp: r.timestamp,
      rawHash: r.rawHash,
      blockRange:
        r.blockRange &&
        typeof r.blockRange === "object" &&
        typeof (r.blockRange as { from?: unknown }).from === "number" &&
        typeof (r.blockRange as { to?: unknown }).to === "number"
          ? {
              from: (r.blockRange as { from: number }).from,
              to: (r.blockRange as { to: number }).to,
            }
          : undefined,
    });
  }
  return out;
}

/**
 * Deterministic gate on model output.
 * AI proposes; this function decides what the system accepts.
 */
export function validateAssessment(
  raw: unknown,
  opts: { modelVersion: string; fallbackEntity?: ThreatAssessment["entity"] } = {
    modelVersion: "unknown",
  },
): ThreatAssessment {
  if (!raw || typeof raw !== "object") {
    throw new Error("Assessment must be an object");
  }
  const r = raw as Record<string, unknown>;

  let status = (typeof r.status === "string" ? r.status : "UNKNOWN") as AssessmentStatus;
  if (!STATUSES.has(status)) status = "UNKNOWN";

  const evidence = asEvidenceList(r.evidence);
  const counterEvidence = asEvidenceList(r.counterEvidence);

  const threatTypes = Array.isArray(r.threatTypes)
    ? (r.threatTypes.filter((t): t is ThreatType => typeof t === "string" && THREAT_TYPES.has(t as ThreatType)) as ThreatType[])
    : [];

  const entityRaw = (r.entity && typeof r.entity === "object" ? r.entity : {}) as Record<
    string,
    unknown
  >;
  const fallback = opts.fallbackEntity;
  const chainId =
    typeof entityRaw.chainId === "number" ? entityRaw.chainId : (fallback?.chainId ?? 1);
  const address =
    typeof entityRaw.address === "string" && /^0x[a-fA-F0-9]{40}$/.test(entityRaw.address)
      ? (entityRaw.address.toLowerCase() as `0x${string}`)
      : fallback?.address;
  if (!address) throw new Error("Assessment.entity.address is required");

  let entityType = (
    typeof entityRaw.entityType === "string" ? entityRaw.entityType : fallback?.entityType ?? "UNKNOWN"
  ) as EntityType | "UNKNOWN";
  if (!ENTITY_TYPES.has(entityType as EntityType)) {
    entityType = fallback?.entityType ?? "CONTRACT";
  }

  let confidence = typeof r.confidence === "number" && Number.isFinite(r.confidence) ? r.confidence : 0;
  confidence = Math.max(0, Math.min(1, confidence));

  // UNKNOWN must never silently become SAFE.
  // SAFE requires supporting evidence.
  if (status === "SAFE" && evidence.length === 0) {
    status = "UNKNOWN";
    confidence = Math.min(confidence, 0.3);
  }

  // TAINTED needs 2+ evidence items (fingerprint override later).
  const hasFingerprint =
    r.fingerprint && typeof r.fingerprint === "object" && Object.keys(r.fingerprint as object).length > 0;
  if (status === "TAINTED" && evidence.length < 2 && !hasFingerprint) {
    status = evidence.length === 1 ? "WATCH" : "UNKNOWN";
    confidence = Math.min(confidence, 0.5);
  }

  const now = Math.floor(Date.now() / 1000);

  return {
    status,
    confidence,
    entity: {
      chainId,
      address,
      entityType: entityType as EntityType,
    },
    fingerprint:
      hasFingerprint && r.fingerprint && typeof r.fingerprint === "object"
        ? (r.fingerprint as ThreatAssessment["fingerprint"])
        : undefined,
    threatTypes,
    evidence,
    counterEvidence,
    incidentId: typeof r.incidentId === "string" ? r.incidentId : undefined,
    modelVersion: opts.modelVersion,
    rulesVersion: RULES_VERSION,
    createdAt: typeof r.createdAt === "number" ? r.createdAt : now,
    expiresAt: typeof r.expiresAt === "number" ? r.expiresAt : undefined,
  };
}
