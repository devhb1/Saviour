/**
 * Spike: OpenAI structured ThreatAssessment over **live** Graph evidence.
 * No static/fixture chain rows — pulls Adapter A+B first, then classifies.
 */

import { validateAssessment } from "../classifier/validate";
import { getEvidenceForAddress } from "../evidence/getEvidence";
import { aiModel, chat } from "../llm/client";

async function main() {
  const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
  console.log("spike:ai — live Graph evidence → structured assessment");
  console.log("model:", aiModel());

  const evidence = await getEvidenceForAddress(1, address);
  console.log("live evidence count:", evidence.length);
  if (evidence.length === 0) {
    throw new Error("Expected live Graph evidence for spike address");
  }

  const result = await chat({
    jsonMode: true,
    messages: [
      {
        role: "system",
        content:
          "You are a classifier. Return ONLY JSON: status, confidence, entity, threatTypes, evidence, counterEvidence. Use only provided evidence ids. Do not invent facts.",
      },
      {
        role: "user",
        content: JSON.stringify({
          task: `Classify ${address} on chain 1`,
          evidence,
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
  console.log("evidence retained", assessment.evidence.length);
  console.log("rulesVersion", assessment.rulesVersion);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
