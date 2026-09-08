/**
 * Investigate an address end-to-end.
 *
 * Pipeline (PIVOT §3.1):
 * 1. Shield pre-check (registry memory) → MEMORY HIT short-circuit (0 Graph, 0 AI)
 * 2. Live Messari fan-out + Adapter A → deterministic signals
 * 3. LLM *explains* over evidence+signals (does not own the verdict)
 * 4. Re-attach cited evidence ids only (NO attach-all)
 * 5. validateAssessment applies PIVOT §3.3 threat-class rules
 *
 * ENS text resolve lands in S3.x; today memory hit = Shield Tier-1 registry.
 * AI never writes registry / never executes transactions.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { confidenceToUnit } from "../confidence";
import { validateAssessment } from "../classifier/validate";
import { getEvidenceBundle } from "../evidence/getEvidence";
import type { Signal } from "../evidence/signals";
import { aiModel, chat } from "../llm/client";
import { getLatestIncidentByTarget } from "../registry/client";
import {
  isRegistryDeployed,
  rememberValidatedAssessment,
  type RegistryNetwork,
  type RememberResult,
} from "../registry/remember";
import { checkTarget, type ShieldCheckResult } from "../shield/check";
import type { AssessmentStatus, Evidence, ThreatAssessment } from "../types";

export type { RememberResult };

export type TraceStep = {
  step: string;
  ms: number;
  detail?: string;
};

export type InvestigateCost = {
  /** Messari protocols queried (+ Adapter A counts as +1 Graph product) */
  graphQueries: number;
  aiCalls: number;
  shieldChecks: number;
  ensResolutions: number;
  latencyMs: number;
  usedAi: boolean;
  memoryHit: boolean;
};

export type InvestigateOptions = {
  /**
   * Persist WATCH/TAINTED to SavioursRegistry after validation.
   * Default true — no-ops cleanly when deployments/<network>.json is missing.
   */
  persist?: boolean;
  /** Registry network for remember + shield. Default sepolia. */
  registryNetwork?: RegistryNetwork;
  /**
   * Force a fresh Graph+AI run even when Shield has memory.
   * Default false (MEMORY HIT short-circuits).
   */
  forceFresh?: boolean;
};

export type InvestigateRun = {
  assessment: ThreatAssessment;
  signals: Signal[];
  banner: string | null;
  /** Per-protocol fan-out chips for Investigate UI */
  protocols: Array<{
    protocol: string;
    status: string;
    ms: number;
    rowCount: number;
    error?: string;
  }>;
  excluded: Array<{ protocol: string; reason: string }>;
  explanation: string | null;
  trace: TraceStep[];
  cost: InvestigateCost;
  memoryHit: boolean;
  shield: ShieldCheckResult;
};

export type InvestigateResult = {
  assessment: ThreatAssessment;
  remember: RememberResult;
  run: InvestigateRun;
};

function loadSystemPrompt(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "../../../../prompts/investigator.system.md"),
    resolve(process.cwd(), "prompts/investigator.system.md"),
    resolve(process.cwd(), "../../prompts/investigator.system.md"),
  ];
  for (const p of candidates) {
    try {
      return readFileSync(/* turbopackIgnore: true */ p, "utf8");
    } catch {
      // try next
    }
  }
  throw new Error("Could not load prompts/investigator.system.md");
}

function pushTrace(trace: TraceStep[], step: string, started: number, detail?: string) {
  trace.push({ step, ms: Date.now() - started, detail });
}

function statusFromShield(decision: ShieldCheckResult["decision"]): AssessmentStatus {
  if (decision === "BLOCK") return "TAINTED";
  if (decision === "WARN") return "WATCH";
  if (decision === "ALLOW") return "SAFE";
  return "UNKNOWN";
}

async function loadKnownIncidentEvidence(
  chainId: number,
  address: `0x${string}`,
  network: RegistryNetwork,
): Promise<Evidence[]> {
  if (!isRegistryDeployed(network)) return [];
  try {
    const row = await getLatestIncidentByTarget(chainId, address, network);
    if (!row) return [];
    return [
      {
        id: `registry:${row.incidentId}`,
        source: "saviours:registry",
        reference: row.incidentId,
        claim: `Known registry incident status=${row.status} confidenceBucket=${row.confidenceBucket}`,
        timestamp: row.createdAt,
        rawHash: row.evidenceHash.replace(/^0x/, "").padStart(64, "0").slice(0, 64),
        kind: "account",
      },
    ];
  } catch {
    return [];
  }
}

function assessmentFromMemoryHit(
  chainId: number,
  address: `0x${string}`,
  shield: ShieldCheckResult,
): ThreatAssessment {
  const incident = shield.incident;
  const now = Math.floor(Date.now() / 1000);
  const ensStatus = shield.records?.["saviours.status"];
  const ensEvidenceHash = shield.records?.["saviours.evidenceHash"];
  const ensIncident = shield.records?.["saviours.incident"];
  const ensThreat = shield.records?.["saviours.threat"];

  let evidence: Evidence[] = [];
  if (shield.source === "ens" && shield.ensName) {
    evidence = [
      {
        id: `ens:${shield.ensName}`,
        source: "saviours:ens",
        reference: ensIncident || shield.ensName,
        claim: `MEMORY HIT — Shield ${shield.decision} from ENS status=${ensStatus ?? "?"}${ensThreat ? ` threat=${ensThreat}` : ""}`,
        timestamp: now,
        rawHash: (ensEvidenceHash ?? "").replace(/^0x/, "").padStart(64, "0").slice(0, 64) ||
          "00".repeat(32),
        kind: "account",
      },
    ];
  } else if (incident) {
    evidence = [
      {
        id: `registry:${incident.incidentId}`,
        source: "saviours:registry",
        reference: incident.incidentId,
        claim: `MEMORY HIT — Shield ${shield.decision} from registry status=${incident.status}`,
        timestamp: incident.createdAt,
        rawHash: incident.evidenceHash.replace(/^0x/, "").padStart(64, "0").slice(0, 64),
        kind: "account",
      },
    ];
  }

  const confRaw = shield.records?.["saviours.confidence"];
  const confFromEns = confRaw ? Number(confRaw) : NaN;

  return {
    status: statusFromShield(shield.decision),
    // ENS stores 0–100; Assessment uses 0–1. Normalize so UI never double-scales.
    confidence: Number.isFinite(confFromEns)
      ? confidenceToUnit(confFromEns)
      : incident
        ? 0.95
        : shield.source === "ens"
          ? 0.9
          : 0.5,
    entity: { chainId, address, entityType: "EOA" },
    threatTypes: [],
    evidence,
    counterEvidence: [],
    incidentId: incident?.incidentId ?? ensIncident,
    modelVersion: "memory-hit",
    rulesVersion: "0.2.0",
    createdAt: now,
  };
}

/**
 * Full investigate run with Shield pre-check, signals, trace, and cost.
 */
export async function investigateDetailed(
  chainId: number,
  address: string,
  options: InvestigateOptions = {},
): Promise<InvestigateRun> {
  const t0 = Date.now();
  const trace: TraceStep[] = [];
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid address: ${address}`);
  }
  const normalized = address.toLowerCase() as `0x${string}`;
  const network = options.registryNetwork ?? "sepolia";

  // --- 0) Shield pre-check (MEMORY HIT?) ---
  const tShield = Date.now();
  const shield = await checkTarget({
    targetChainId: chainId,
    address: normalized,
    registryNetwork: network,
  });
  pushTrace(trace, "shield.precheck", tShield, `${shield.decision} source=${shield.source}`);

  const memoryHit =
    !options.forceFresh &&
    (shield.source === "ens" || shield.source === "registry") &&
    (shield.decision === "BLOCK" ||
      shield.decision === "WARN" ||
      shield.decision === "ALLOW");

  if (memoryHit) {
    const assessment = assessmentFromMemoryHit(chainId, normalized, shield);
    const via =
      shield.source === "ens"
        ? `ENS ${shield.ensName ?? "name"}`
        : "SavioursRegistry";
    return {
      assessment,
      signals: [],
      banner: null,
      protocols: [],
      excluded: [],
      explanation: `MEMORY HIT — verdict from ${via} via Shield Tier-1. 0 Graph queries · 0 AI calls.`,
      trace,
      cost: {
        graphQueries: 0,
        aiCalls: 0,
        shieldChecks: 1,
        ensResolutions: shield.cost.ensResolutions,
        latencyMs: Date.now() - t0,
        usedAi: false,
        memoryHit: true,
      },
      memoryHit: true,
      shield,
    };
  }

  // --- 1) Live Graph fan-out + signals ---
  const tGraph = Date.now();
  const [bundle, knownIncidents] = await Promise.all([
    getEvidenceBundle(chainId, normalized, { bypassCache: true }),
    loadKnownIncidentEvidence(chainId, normalized, network),
  ]);
  pushTrace(
    trace,
    "graph.fanOut",
    tGraph,
    bundle.banner,
  );

  const gathered: Evidence[] = [...bundle.evidence, ...knownIncidents];
  const signals = bundle.signals;
  pushTrace(
    trace,
    "signals.derive",
    tGraph,
    signals.map((s) => s.id).join(",") || "(none)",
  );

  // --- 2) LLM explains (does not own verdict) ---
  const tAi = Date.now();
  const result = await chat({
    jsonMode: true,
    messages: [
      { role: "system", content: loadSystemPrompt() },
      {
        role: "user",
        content: [
          `Explain investigation for chainId=${chainId} address=${normalized}.`,
          "Role: EXPLAIN ONLY. Deterministic code already computed SIGNALS_JSON.",
          "The validator will decide the final status from signals — your status is a proposal.",
          knownIncidents.length > 0
            ? `Registry known incidents: ${knownIncidents.length}.`
            : "Registry known incidents: none (or not deployed).",
          `Banner: ${bundle.banner}`,
          `SIGNALS_JSON: ${JSON.stringify(signals)}`,
          "Use ONLY EVIDENCE_JSON. Do not invent transactions or claims.",
          "Return ONLY JSON with keys:",
          "status, confidence, entity, threatTypes, evidence, counterEvidence, explanation.",
          "evidence/counterEvidence: arrays of { id } copied from EVIDENCE_JSON (ids only is OK).",
          "explanation: 2–4 sentences tying signals to cited evidence ids.",
          "If signals are empty / thin, prefer UNKNOWN. BOT_PROFILE ⇒ propose WATCH max.",
          "",
          "EVIDENCE_JSON:",
          JSON.stringify(
            gathered.map((e) => ({
              id: e.id,
              source: e.source,
              protocol: e.protocol,
              kind: e.kind,
              txHash: e.txHash,
              amountUSD: e.amountUSD,
              claim: e.claim,
              timestamp: e.timestamp,
            })),
          ),
        ].join("\n"),
      },
    ],
  });
  pushTrace(trace, "llm.explain", tAi, result.model || aiModel());

  const content = result.message.content;
  if (!content) throw new Error("Model returned empty assessment content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Model returned non-JSON assessment: ${content.slice(0, 200)}`);
  }

  const obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const explanation =
    typeof obj.explanation === "string" ? obj.explanation : null;

  // --- 3) Cited ids only ---
  const modelEvidence = Array.isArray(obj.evidence) ? obj.evidence : [];
  const byId = new Map(gathered.map((e) => [e.id, e]));
  const merged: Evidence[] = [];
  for (const row of modelEvidence) {
    if (row && typeof row === "object" && typeof (row as { id?: unknown }).id === "string") {
      const hit = byId.get((row as { id: string }).id);
      if (hit) merged.push(hit);
    }
  }

  // --- 4) Validator decides ---
  const tVal = Date.now();
  const assessment = validateAssessment(
    {
      ...obj,
      evidence: merged,
      entity: {
        chainId,
        address: normalized,
        entityType:
          obj.entity &&
          typeof obj.entity === "object" &&
          typeof (obj.entity as { entityType?: unknown }).entityType === "string"
            ? (obj.entity as { entityType: string }).entityType
            : "EOA",
      },
    },
    {
      modelVersion: result.model || aiModel(),
      fallbackEntity: {
        chainId,
        address: normalized,
        entityType: "EOA",
      },
      signalEvidence: gathered,
    },
  );
  pushTrace(trace, "validate.signalGate", tVal, `${assessment.status} rules=${assessment.rulesVersion}`);

  return {
    assessment,
    signals,
    banner: bundle.banner,
    protocols: bundle.fanOut.results.map((r) => ({
      protocol: r.protocol,
      status: r.status,
      ms: r.ms,
      rowCount: r.rowCount,
      error: r.error,
    })),
    excluded: bundle.fanOut.excluded.map((e) => ({
      protocol: e.slug,
      reason: e.reason,
    })),
    explanation,
    trace,
    cost: {
      graphQueries: bundle.fanOut.protocolsQueried + (bundle.adapterACount > 0 ? 1 : 0),
      aiCalls: 1,
      shieldChecks: 1,
      ensResolutions: 0,
      latencyMs: Date.now() - t0,
      usedAi: true,
      memoryHit: false,
    },
    memoryHit: false,
    shield,
  };
}

/**
 * Investigate and optionally Remember.
 * Prefer this over bare `investigate()` when wiring APIs.
 */
export async function investigateAndRemember(
  chainId: number,
  address: string,
  options: InvestigateOptions = {},
): Promise<InvestigateResult> {
  const run = await investigateDetailed(chainId, address, options);
  const network = options.registryNetwork ?? "sepolia";

  // Do not re-write on MEMORY HIT (already on-chain)
  let dossierUrl: string | undefined;
  if ((options.persist ?? true) && !run.memoryHit) {
    const tPin = Date.now();
    try {
      const { pinAssessmentDossier } = await import("../dossier/pin");
      const pinned = await pinAssessmentDossier({
        assessment: run.assessment,
        signals: run.signals,
        explanation: run.explanation,
        banner: run.banner,
      });
      dossierUrl = pinned.url;
      pushTrace(
        run.trace,
        "dossier.pin",
        tPin,
        `${pinned.method} ${pinned.cid ?? pinned.contentHash.slice(0, 12)}`,
      );
    } catch (e) {
      pushTrace(
        run.trace,
        "dossier.pin",
        tPin,
        `skipped: ${e instanceof Error ? e.message.slice(0, 80) : "error"}`,
      );
    }
  }

  const remember = await rememberValidatedAssessment(run.assessment, {
    enabled: (options.persist ?? true) && !run.memoryHit,
    network,
    dossierUrl,
    threatSignals: run.signals.map((s) => s.id),
  });

  if (remember.persisted) {
    run.assessment.incidentId = remember.incidentLabel;
  }

  return { assessment: run.assessment, remember, run };
}

/**
 * Investigate an address (assessment only — use investigateDetailed for trace/cost).
 */
export async function investigate(
  chainId: number,
  address: string,
  options: InvestigateOptions = {},
): Promise<ThreatAssessment> {
  const run = await investigateDetailed(chainId, address, options);
  return run.assessment;
}
