/**
 * Investigate an address end-to-end.
 *
 * Pipeline:
 * 1. Pull live Graph evidence (Messari fan-out + Adapter A) — never mocked
 * 2. Ask the LLM to classify using ONLY that evidence
 * 3. Re-attach live evidence by cited id only (NO attach-all fallback)
 * 4. `validateAssessment` applies PIVOT §3.3 threat-class signal rules
 * 5. Optional Remember: persist WATCH/TAINTED when registry is deployed
 *
 * AI never writes registry / never executes transactions.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateAssessment } from "../classifier/validate";
import { getEvidenceBundle } from "../evidence/getEvidence";
import { aiModel, chat } from "../llm/client";
import { getLatestIncidentByTarget } from "../registry/client";
import {
  isRegistryDeployed,
  rememberValidatedAssessment,
  type RegistryNetwork,
  type RememberResult,
} from "../registry/remember";
import type { Evidence, ThreatAssessment } from "../types";

export type { RememberResult };

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

export type InvestigateOptions = {
  /**
   * Persist WATCH/TAINTED to SavioursRegistry after validation.
   * Default true — no-ops cleanly when deployments/<network>.json is missing.
   */
  persist?: boolean;
  /** Registry network for remember + known-incident lookup. Default sepolia. */
  registryNetwork?: RegistryNetwork;
};

export type InvestigateResult = {
  assessment: ThreatAssessment;
  remember: RememberResult;
};

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

/**
 * Investigate and optionally Remember.
 * Prefer this over bare `investigate()` when wiring APIs.
 */
export async function investigateAndRemember(
  chainId: number,
  address: string,
  options: InvestigateOptions = {},
): Promise<InvestigateResult> {
  const assessment = await investigate(chainId, address, options);
  const network = options.registryNetwork ?? "sepolia";
  const remember = await rememberValidatedAssessment(assessment, {
    enabled: options.persist ?? true,
    network,
  });

  if (remember.persisted) {
    assessment.incidentId = remember.incidentLabel;
  }

  return { assessment, remember };
}

/**
 * Investigate an address (validate only — use investigateAndRemember to persist).
 */
export async function investigate(
  chainId: number,
  address: string,
  options: InvestigateOptions = {},
): Promise<ThreatAssessment> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid address: ${address}`);
  }
  const normalized = address.toLowerCase() as `0x${string}`;
  const network = options.registryNetwork ?? "sepolia";

  // --- 1) Live Graph fan-out + Adapter A + optional registry memory ---
  const [bundle, knownIncidents] = await Promise.all([
    getEvidenceBundle(chainId, normalized, { bypassCache: true }),
    loadKnownIncidentEvidence(chainId, normalized, network),
  ]);

  const gathered: Evidence[] = [...bundle.evidence, ...knownIncidents];

  // --- 2) Model classifies; does not fetch chain data itself ---
  const result = await chat({
    jsonMode: true,
    messages: [
      { role: "system", content: loadSystemPrompt() },
      {
        role: "user",
        content: [
          `Investigate chainId=${chainId} address=${normalized}.`,
          knownIncidents.length > 0
            ? `Registry known incidents: ${knownIncidents.length} (see evidence source saviours:registry).`
            : "Registry known incidents: none for this target (or registry not deployed).",
          `Live evidence count: ${gathered.length}. Banner: ${bundle.banner}`,
          `Deterministic signals already computed: ${bundle.signals.map((s) => s.id).join(", ") || "(none)"}.`,
          "Use ONLY the evidence JSON below. Do not invent transactions or claims.",
          "TAINTED requires threat-class Graph signals (validator enforces).",
          "Return ONLY a JSON object with:",
          "status, confidence, entity, threatTypes, evidence, counterEvidence.",
          "Put supporting items in evidence (copy ids from the list).",
          "Put mitigating items in counterEvidence.",
          "If evidence is thin or ambiguous, prefer UNKNOWN or WATCH over SAFE/TAINTED.",
          "",
          "EVIDENCE_JSON:",
          JSON.stringify(gathered),
        ].join("\n"),
      },
    ],
  });

  const content = result.message.content;
  if (!content) throw new Error("Model returned empty assessment content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Model returned non-JSON assessment: ${content.slice(0, 200)}`);
  }

  // --- 3) Keep ONLY evidence the model cited — never attach-all ---
  const obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const modelEvidence = Array.isArray(obj.evidence) ? obj.evidence : [];
  const byId = new Map(gathered.map((e) => [e.id, e]));
  const merged: Evidence[] = [];
  for (const row of modelEvidence) {
    if (row && typeof row === "object" && typeof (row as { id?: unknown }).id === "string") {
      const hit = byId.get((row as { id: string }).id);
      if (hit) merged.push(hit);
    }
  }
  // Intentionally NO fallback that pushes all gathered rows.

  // --- 4) Deterministic threat-class gate (signals over full live set) ---
  return validateAssessment(
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
}
