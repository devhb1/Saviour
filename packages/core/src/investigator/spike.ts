/**
 * Day 0 / Phase 2 spike — prove OpenAI returns valid ThreatAssessment JSON.
 * Uses a tiny fake evidence set (no live Graph) to isolate the LLM path.
 */

import { validateAssessment } from "../classifier/validate";
import { aiModel, chat } from "../llm/client";

async function main() {
  const model = aiModel();
  console.log("spike: structured investigator output");
  console.log("model:", model);

  const fakeEvidence = [
    {
      id: "ev-demo-1",
      source: "fixture",
      reference: "tx:0xabc",
      claim: "Large outflow to unrelated recipient",
      timestamp: 1_700_000_000,
      rawHash: "a".repeat(64),
    },
    {
      id: "ev-demo-2",
      source: "fixture",
      reference: "tx:0xdef",
      claim: "Repeated drains to same counterparty",
      timestamp: 1_700_000_100,
      rawHash: "b".repeat(64),
    },
  ];

  const result = await chat({
    jsonMode: true,
    messages: [
      {
        role: "system",
        content:
          "You are a classifier. Return ONLY JSON with fields: status, confidence, entity, threatTypes, evidence, counterEvidence. Use only the provided evidence. Do not invent facts.",
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Classify target 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on chain 1",
          evidence: fakeEvidence,
          allowedStatuses: ["SAFE", "WATCH", "TAINTED", "UNKNOWN"],
        }),
      },
    ],
  });

  const raw = result.message.content;
  if (!raw) throw new Error("empty model content");
  const parsed = JSON.parse(raw) as unknown;
  const assessment = validateAssessment(parsed, {
    modelVersion: result.model,
    fallbackEntity: {
      chainId: 1,
      address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
      entityType: "EOA",
    },
  });

  console.log("ok: status", assessment.status, "confidence", assessment.confidence);
  console.log("threatTypes", assessment.threatTypes);
  console.log("rulesVersion", assessment.rulesVersion);
  console.log(JSON.stringify(assessment, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
