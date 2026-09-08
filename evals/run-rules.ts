/**
 * UNIT TESTS for `validateAssessment` + `deriveSignals`.
 *
 * Synthetic Evidence here is NOT on-chain data and MUST NOT be used
 * as product evidence. Product paths always pull live The Graph data.
 *
 * Run: pnpm eval:rules
 */

import { validateAssessment } from "../packages/core/src/classifier/validate";
import {
  deriveSignals,
  signalIds,
  statusFromSignals,
} from "../packages/core/src/evidence/signals";
import type { Evidence } from "../packages/core/src/types";
import {
  SIGNAL_FIXTURE_NOW,
  attackerFixture,
  benignFixture,
  botFixture,
  drainFixture,
  registryHopFixture,
} from "./signal-fixtures";

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

function runClassifier(): Row[] {
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
      name: "TAINTED without threat signals → WATCH",
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
      name: "TAINTED with 2 rows but no signals → WATCH (not row-count)",
      pass: out.status === "WATCH",
      detail: `got ${out.status}`,
    });
  }

  {
    const pool = attackerFixture();
    const out = validateAssessment(
      {
        status: "SAFE",
        confidence: 0.2,
        entity: {
          chainId: 1,
          address: "0x935bfb495e33f74d2e9735df1da66ace442ede48",
          entityType: "EOA",
        },
        threatTypes: [],
        evidence: [],
        counterEvidence: [],
      },
      { modelVersion: "eval", signalEvidence: pool },
    );
    rows.push({
      name: "attacker signals force TAINTED even if model SAFE + empty cites",
      pass: out.status === "TAINTED" && out.evidence.length >= 1,
      detail: `got ${out.status} evidence=${out.evidence.length}`,
    });
  }

  {
    const pool = botFixture();
    const out = validateAssessment(
      {
        status: "TAINTED",
        confidence: 0.99,
        entity: {
          chainId: 1,
          address: "0x352423e2fa5d5c99343d371c9e3bc56c87723cc7",
          entityType: "EOA",
        },
        threatTypes: ["SUSPICIOUS_BEHAVIOR"],
        evidence: pool.slice(0, 1),
        counterEvidence: [],
      },
      { modelVersion: "eval", signalEvidence: pool },
    );
    rows.push({
      name: "BOT_PROFILE caps model TAINTED → WATCH",
      pass: out.status === "WATCH",
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

function runSignals(): Row[] {
  const rows: Row[] = [];

  {
    const signals = deriveSignals(attackerFixture());
    const ids = signalIds(signals);
    const verdict = statusFromSignals(signals);
    const hasOneShot = ids.includes("FLASHLOAN_ONE_SHOT");
    const hasAtomic = ids.includes("ATOMIC_MULTI_PROTOCOL");
    rows.push({
      name: "attacker → FLASHLOAN_ONE_SHOT + ATOMIC_MULTI_PROTOCOL",
      pass: hasOneShot && hasAtomic && verdict.status === "TAINTED",
      detail: `ids=${ids.join(",")} status=${verdict.status} rule=${verdict.rule}`,
    });
  }

  {
    const signals = deriveSignals(botFixture());
    const ids = signalIds(signals);
    const threat = signals.filter((s) => s.class === "threat");
    rows.push({
      name: "bot → BOT_PROFILE only (no threat class)",
      pass:
        ids.includes("BOT_PROFILE") &&
        threat.length === 0 &&
        !ids.includes("FLASHLOAN_ONE_SHOT"),
      detail: `ids=${ids.join(",")}`,
    });
  }

  {
    const signals = deriveSignals(benignFixture());
    const ids = signalIds(signals);
    const verdict = statusFromSignals(signals);
    rows.push({
      name: "benign → NORMAL_USAGE → SAFE",
      pass: ids.includes("NORMAL_USAGE") && verdict.status === "SAFE",
      detail: `ids=${ids.join(",")} status=${verdict.status}`,
    });
  }

  {
    const signals = deriveSignals(drainFixture(SIGNAL_FIXTURE_NOW), {
      nowSec: SIGNAL_FIXTURE_NOW,
    });
    const ids = signalIds(signals);
    const verdict = statusFromSignals(signals);
    rows.push({
      name: "drain → DRAIN_FANIN → TAINTED",
      pass: ids.includes("DRAIN_FANIN") && verdict.status === "TAINTED",
      detail: `ids=${ids.join(",")} status=${verdict.status}`,
    });
  }

  {
    const { evidence, tainted } = registryHopFixture();
    const signals = deriveSignals(evidence, { taintedCounterparties: tainted });
    const ids = signalIds(signals);
    const verdict = statusFromSignals(signals);
    rows.push({
      name: "hop → REGISTRY_COOCCURRENCE → TAINTED",
      pass: ids.includes("REGISTRY_COOCCURRENCE") && verdict.status === "TAINTED",
      detail: `ids=${ids.join(",")} status=${verdict.status}`,
    });
  }

  {
    const signals = deriveSignals([]);
    rows.push({
      name: "empty evidence → no signals",
      pass: signals.length === 0,
      detail: `count=${signals.length}`,
    });
  }

  return rows;
}

const classifierRows = runClassifier();
const signalRows = runSignals();
const rows = [...classifierRows, ...signalRows];
let failed = 0;

console.log("\n=== Classifier rule eval (threat-class · unit) ===\n");
for (const r of classifierRows) {
  const mark = r.pass ? "PASS" : "FAIL";
  if (!r.pass) failed += 1;
  console.log(`${mark}  ${r.name}  (${r.detail})`);
}

console.log("\n=== Threat signal eval (unit fixtures — not on-chain) ===\n");
for (const r of signalRows) {
  const mark = r.pass ? "PASS" : "FAIL";
  if (!r.pass) failed += 1;
  console.log(`${mark}  ${r.name}  (${r.detail})`);
}

console.log(`\n${rows.length - failed}/${rows.length} passed`);
if (failed > 0) process.exit(1);
console.log("ok: classifier + signals rules gate");
