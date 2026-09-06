/**
 * UNIT TESTS for `validateAssessment` only.
 *
 * Synthetic Evidence objects here are NOT on-chain data and MUST NOT be used
 * as product evidence. Product paths always pull live The Graph data.
 *
 * Run: pnpm eval:rules
 */

import { validateAssessment } from "../packages/core/src/classifier/validate";
import type { Evidence } from "../packages/core/src/types";

/** Synthetic row solely for classifier unit tests — never returned by adapters. */
function syntheticEvidence(id: string): Evidence {
  return {
    id,
    source: "unit-test-only",
    reference: `ref:${id}`,
    claim: `Synthetic claim ${id}`,
    timestamp: 1_700_000_000,
    rawHash: id.padEnd(64, "0").slice(0, 64),
  };
}

type Row = { name: string; pass: boolean; detail: string };

function run(): Row[] {
  const rows: Row[] = [];

  {
    const out = validateAssessment(
      {
        status: "SAFE",
        confidence: 0.9,
        entity: {
          chainId: 1,
          address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
          entityType: "EOA",
        },
        threatTypes: [],
        evidence: [],
        counterEvidence: [],
      },
      { modelVersion: "eval" },
    );
    rows.push({
      name: "empty SAFE → UNKNOWN (no silent SAFE)",
      pass: out.status === "UNKNOWN",
      detail: `got ${out.status}`,
    });
  }

  {
    const out = validateAssessment(
      {
        status: "TAINTED",
        confidence: 0.9,
        entity: {
          chainId: 1,
          address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
          entityType: "CONTRACT",
        },
        threatTypes: ["DRAINER"],
        evidence: [syntheticEvidence("only-one")],
        counterEvidence: [],
      },
      { modelVersion: "eval" },
    );
    rows.push({
      name: "TAINTED with 1 evidence → WATCH",
      pass: out.status === "WATCH",
      detail: `got ${out.status}`,
    });
  }

  {
    const out = validateAssessment(
      {
        status: "TAINTED",
        confidence: 0.9,
        entity: {
          chainId: 1,
          address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
          entityType: "CONTRACT",
        },
        threatTypes: ["DRAINER"],
        evidence: [syntheticEvidence("a"), syntheticEvidence("b")],
        counterEvidence: [],
      },
      { modelVersion: "eval" },
    );
    rows.push({
      name: "TAINTED with 2 evidence retained",
      pass: out.status === "TAINTED",
      detail: `got ${out.status}`,
    });
  }

  {
    const out = validateAssessment(
      {
        status: "WATCH",
        confidence: 0.5,
        entity: {
          chainId: 1,
          address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
          entityType: "EOA",
        },
        threatTypes: ["DRAINER", "NOT_A_REAL_TYPE"],
        evidence: [syntheticEvidence("x")],
        counterEvidence: [],
      },
      { modelVersion: "eval" },
    );
    rows.push({
      name: "threat taxonomy enforced",
      pass: out.threatTypes.length === 1 && out.threatTypes[0] === "DRAINER",
      detail: `got ${JSON.stringify(out.threatTypes)}`,
    });
  }

  {
    const out = validateAssessment(
      {
        status: "UNKNOWN",
        confidence: 0.2,
        entity: {
          chainId: 1,
          address: "0x0000000000000000000000000000000000000001",
          entityType: "EOA",
        },
        threatTypes: [],
        evidence: [],
        counterEvidence: [],
      },
      { modelVersion: "eval" },
    );
    rows.push({
      name: "UNKNOWN preserved",
      pass: out.status === "UNKNOWN",
      detail: `got ${out.status}`,
    });
  }

  return rows;
}

const rows = run();
let failed = 0;
console.log("\n=== Classifier rule eval (unit — not on-chain) ===\n");
for (const r of rows) {
  const mark = r.pass ? "PASS" : "FAIL";
  if (!r.pass) failed += 1;
  console.log(`${mark}  ${r.name}  (${r.detail})`);
}
console.log(`\n${rows.length - failed}/${rows.length} passed`);
if (failed > 0) process.exit(1);
console.log("ok: classifier rules gate");
