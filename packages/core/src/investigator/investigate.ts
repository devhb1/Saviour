import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateAssessment } from "../classifier/validate";
import { getTransferFlows } from "../graph/adapterA";
import { getProtocolContext, getProtocolInteractions } from "../graph/adapterB";
import { aiModel, chat } from "../llm/client";
import type { Evidence, ThreatAssessment } from "../types";

function loadSystemPrompt(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "../../../../prompts/investigator.system.md"),
    resolve(process.cwd(), "prompts/investigator.system.md"),
    resolve(process.cwd(), "../../prompts/investigator.system.md"),
  ];
  for (const p of candidates) {
    try {
      return readFileSync(p, "utf8");
    } catch {
      // try next
    }
  }
  throw new Error("Could not load prompts/investigator.system.md");
}

/**
 * Investigate an address.
 * Evidence is always fetched live (deterministic). The model only synthesizes
 * status / threatTypes / counterEvidence from that evidence — it cannot invent
 * blockchain facts. Deterministic validateAssessment is the final gate.
 */
export async function investigate(
  chainId: number,
  address: string,
): Promise<ThreatAssessment> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error(`Invalid address: ${address}`);
  }
  const normalized = address.toLowerCase() as `0x${string}`;

  const [transfers, protocol, interactions] = await Promise.all([
    getTransferFlows(chainId, normalized, { first: 20 }),
    getProtocolContext(chainId),
    getProtocolInteractions(chainId, normalized, { first: 15 }),
  ]);
  const knownIncidents: Evidence[] = []; // registry stub

  const gathered: Evidence[] = [
    ...transfers,
    ...protocol,
    ...interactions,
    ...knownIncidents,
  ];

  const result = await chat({
    jsonMode: true,
    messages: [
      { role: "system", content: loadSystemPrompt() },
      {
        role: "user",
        content: [
          `Investigate chainId=${chainId} address=${normalized}.`,
          "Registry known incidents: none (not deployed yet).",
          `Live evidence count: ${gathered.length}.`,
          "Use ONLY the evidence JSON below. Do not invent transactions or claims.",
          "Return ONLY a JSON object with:",
          'status, confidence, entity, threatTypes, evidence, counterEvidence.',
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

  // Ensure tool evidence cannot be dropped by the model.
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
  if (merged.length === 0) {
    merged.push(...gathered);
  }

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
    },
  );

  return assessment;
}
