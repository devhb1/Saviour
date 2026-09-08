/**
 * Deterministic policy floor over model output (PIVOT §3.3).
 *
 * AI proposes status/threatTypes. This function decides what we accept.
 * TAINTED is signal-gated — never a row-count heuristic.
 *
 * Synthetic Evidence appears only in `evals/run-rules.ts` to unit-test
 * these rules. Product investigate always uses live Graph evidence.
 */

import {
  deriveSignals,
  statusFromSignals,
  type Signal,
} from "../evidence/signals";
import type {
  AssessmentStatus,
  EntityType,
  Evidence,
  ThreatAssessment,
  ThreatType,
} from "../types";

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

/** Bump when the TAINTED gate or signal wiring changes. */
export const RULES_VERSION = "0.2.0";

export type ValidateAssessmentOptions = {
  modelVersion: string;
  fallbackEntity?: ThreatAssessment["entity"];
  /**
   * Full live evidence used to derive signals (may be larger than cited
   * assessment.evidence). Defaults to the evidence array on `raw`.
   */
  signalEvidence?: Evidence[];
  /** Already-TAINTED counterparties for REGISTRY_COOCCURRENCE. */
  taintedCounterparties?: Iterable<string>;
  nowSec?: number;
};

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
    const evidence: Evidence = {
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
    };
    if (typeof r.subgraphId === "string") evidence.subgraphId = r.subgraphId;
    if (typeof r.protocol === "string") evidence.protocol = r.protocol;
    if (typeof r.schema === "string") evidence.schema = r.schema;
    if (typeof r.kind === "string") {
      evidence.kind = r.kind as Evidence["kind"];
    }
    if (typeof r.txHash === "string") evidence.txHash = r.txHash;
    if (typeof r.block === "number") evidence.block = r.block;
    if (typeof r.amountUSD === "number") evidence.amountUSD = r.amountUSD;
    if (typeof r.counterparty === "string") {
      evidence.counterparty = r.counterparty as Evidence["counterparty"];
    }
    out.push(evidence);
  }
  return out;
}

function activityCount(evidence: Evidence[]): number {
  return evidence.filter((e) => e.kind !== "protocol").length;
}

function pickEvidenceByIds(
  pool: Evidence[],
  ids: string[],
): Evidence[] {
  const byId = new Map(pool.map((e) => [e.id, e]));
  const out: Evidence[] = [];
  for (const id of ids) {
    const hit = byId.get(id);
    if (hit) out.push(hit);
  }
  return out;
}

/**
 * Apply PIVOT §3.3 ceiling/floor to the model-proposed status.
 */
export function applySignalGate(
  modelStatus: AssessmentStatus,
  signals: Signal[],
  opts: { hasActivity: boolean },
): { status: AssessmentStatus; rule: string; signals: Signal[] } {
  if (!opts.hasActivity) {
    return {
      status: "UNKNOWN",
      rule: "no-activity-rows",
      signals,
    };
  }

  const verdict = statusFromSignals(signals);
  const ids = new Set(signals.map((s) => s.id));

  // Deterministic TAINTED from threat signals — model cannot veto.
  if (verdict.status === "TAINTED") {
    return { status: "TAINTED", rule: verdict.rule, signals };
  }

  // BOT_PROFILE: never TAINTED
  if (ids.has("BOT_PROFILE")) {
    if (modelStatus === "TAINTED" || modelStatus === "SAFE" || modelStatus === "UNKNOWN") {
      return {
        status: "WATCH",
        rule: "BOT_PROFILE caps at WATCH",
        signals,
      };
    }
    return {
      status: "WATCH",
      rule: "BOT_PROFILE caps at WATCH",
      signals,
    };
  }

  // No threat rule → model may not assert TAINTED
  if (modelStatus === "TAINTED") {
    return {
      status: "WATCH",
      rule: "TAINTED requires threat-class signals",
      signals,
    };
  }

  // SAFE requires NORMAL_USAGE (or explicit non-threat activity with model SAFE)
  if (modelStatus === "SAFE") {
    if (ids.has("NORMAL_USAGE") || verdict.status === "SAFE") {
      return { status: "SAFE", rule: "NORMAL_USAGE|model-SAFE", signals };
    }
    // Activity but not clearly normal — don't silent-SAFE
    return {
      status: "WATCH",
      rule: "SAFE requires NORMAL_USAGE signal",
      signals,
    };
  }

  if (modelStatus === "UNKNOWN") {
    return { status: "UNKNOWN", rule: "model-UNKNOWN", signals };
  }

  return { status: "WATCH", rule: verdict.rule || "model-WATCH", signals };
}

/**
 * Deterministic gate on model output.
 * AI proposes; this function decides what the system accepts.
 */
export function validateAssessment(
  raw: unknown,
  opts: ValidateAssessmentOptions = { modelVersion: "unknown" },
): ThreatAssessment {
  if (!raw || typeof raw !== "object") {
    throw new Error("Assessment must be an object");
  }
  const r = raw as Record<string, unknown>;

  let modelStatus = (
    typeof r.status === "string" ? r.status : "UNKNOWN"
  ) as AssessmentStatus;
  if (!STATUSES.has(modelStatus)) modelStatus = "UNKNOWN";

  let evidence = asEvidenceList(r.evidence);
  const counterEvidence = asEvidenceList(r.counterEvidence);

  const signalPool =
    opts.signalEvidence && opts.signalEvidence.length > 0
      ? opts.signalEvidence
      : evidence;

  const signals = deriveSignals(signalPool, {
    taintedCounterparties: opts.taintedCounterparties,
    nowSec: opts.nowSec,
    address: opts.fallbackEntity?.address,
  });

  const hasActivity = activityCount(signalPool) > 0;
  const gated = applySignalGate(modelStatus, signals, { hasActivity });

  // If rule fired TAINTED but model cited nothing, attach signal-supporting rows
  if (gated.status === "TAINTED" && evidence.length === 0) {
    const supportIds = signals
      .filter((s) => s.class === "threat")
      .flatMap((s) => s.evidenceIds);
    evidence = pickEvidenceByIds(signalPool, [...new Set(supportIds)]);
  }

  const threatTypes = Array.isArray(r.threatTypes)
    ? (r.threatTypes.filter(
        (t): t is ThreatType =>
          typeof t === "string" && THREAT_TYPES.has(t as ThreatType),
      ) as ThreatType[])
    : [];

  const entityRaw = (
    r.entity && typeof r.entity === "object" ? r.entity : {}
  ) as Record<string, unknown>;
  const fallback = opts.fallbackEntity;
  const chainId =
    typeof entityRaw.chainId === "number"
      ? entityRaw.chainId
      : (fallback?.chainId ?? 1);
  const address =
    typeof entityRaw.address === "string" &&
    /^0x[a-fA-F0-9]{40}$/.test(entityRaw.address)
      ? (entityRaw.address.toLowerCase() as `0x${string}`)
      : fallback?.address;
  if (!address) throw new Error("Assessment.entity.address is required");

  let entityType = (
    typeof entityRaw.entityType === "string"
      ? entityRaw.entityType
      : (fallback?.entityType ?? "UNKNOWN")
  ) as EntityType | "UNKNOWN";
  if (!ENTITY_TYPES.has(entityType as EntityType)) {
    entityType = fallback?.entityType ?? "CONTRACT";
  }

  let confidence =
    typeof r.confidence === "number" && Number.isFinite(r.confidence)
      ? r.confidence
      : 0;
  confidence = Math.max(0, Math.min(1, confidence));

  if (gated.status === "UNKNOWN") {
    confidence = Math.min(confidence, 0.3);
  } else if (gated.status === "WATCH" && modelStatus === "TAINTED") {
    confidence = Math.min(confidence, 0.55);
  } else if (gated.status === "TAINTED") {
    confidence = Math.max(confidence, 0.7);
  }

  // Legacy empty-SAFE path (no signal pool activity)
  if (modelStatus === "SAFE" && !hasActivity) {
    gated.status = "UNKNOWN";
    gated.rule = "empty SAFE → UNKNOWN";
    confidence = Math.min(confidence, 0.3);
  }

  const hasFingerprint =
    r.fingerprint &&
    typeof r.fingerprint === "object" &&
    Object.keys(r.fingerprint as object).length > 0;

  const now = Math.floor(Date.now() / 1000);

  return {
    status: gated.status,
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

/** Expose last-gate signals for investigate/UI (re-derive; pure). */
export function signalsForEvidence(
  evidence: Evidence[],
  opts: {
    taintedCounterparties?: Iterable<string>;
    address?: string;
    nowSec?: number;
  } = {},
): Signal[] {
  return deriveSignals(evidence, opts);
}
