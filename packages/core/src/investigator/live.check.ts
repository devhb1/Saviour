/**
 * Live investigate gate — demo targets ATTACK-1 / BOT-1 / BENIGN-1.
 *
 *   pnpm check:investigate
 *
 * Requires GRAPH_API_KEY + OpenAI key. Uses forceFresh so Shield memory
 * does not short-circuit the Graph+AI path under test.
 * Never uses static chain rows.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadRootEnv } from "../config/env";
import { investigateDetailed } from "./investigate";

loadRootEnv();

type Target = { id: string; address: string; expected: string };

function loadTargets(): Target[] {
  const path = resolve(process.cwd(), "../../evals/demo-targets.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    targets?: Target[];
  };
  const want = new Set(["ATTACK-1", "BOT-1", "BENIGN-1"]);
  return (raw.targets ?? []).filter((t) => want.has(t.id));
}

function expectOk(id: string, status: string, expected: string): boolean {
  if (id === "BENIGN-1") {
    return status === "SAFE" || status === "UNKNOWN";
  }
  return status === expected;
}

async function main() {
  const targets = loadTargets();
  if (targets.length < 3) {
    throw new Error("demo-targets.json missing ATTACK-1 / BOT-1 / BENIGN-1");
  }

  console.log("check:investigate — live Graph + explain LLM + signal gate\n");
  let failed = 0;

  for (const t of targets) {
    console.log(`--- ${t.id} ${t.address} (expect ${t.expected}) ---`);
    const run = await investigateDetailed(1, t.address, {
      persist: false,
      forceFresh: true,
    });

    const { assessment, signals, cost, banner, explanation } = run;
    console.log("banner:", banner);
    console.log(
      "signals:",
      signals.map((s) => s.id).join(", ") || "(none)",
    );
    console.log(
      "status:",
      assessment.status,
      "evidence:",
      assessment.evidence.length,
      "rules:",
      assessment.rulesVersion,
    );
    console.log(
      "cost:",
      `graph=${cost.graphQueries} ai=${cost.aiCalls} shield=${cost.shieldChecks} ${cost.latencyMs}ms usedAi=${cost.usedAi}`,
    );
    console.log(
      "trace:",
      run.trace.map((s) => `${s.step}:${s.ms}ms`).join(" → "),
    );
    if (explanation) {
      console.log("explanation:", explanation.slice(0, 240));
    }

    const okStatus = expectOk(t.id, assessment.status, t.expected);
    if (!okStatus) {
      console.error(`FAIL status: got ${assessment.status} expected ${t.expected}`);
      failed += 1;
      continue;
    }

    if (t.id === "ATTACK-1") {
      if (assessment.status !== "TAINTED") {
        console.error("FAIL ATTACK-1 not TAINTED");
        failed += 1;
        continue;
      }
      if (assessment.evidence.length < 1) {
        console.error("FAIL ATTACK-1 expected cited/attached evidence ids");
        failed += 1;
        continue;
      }
      const ids = signals.map((s) => s.id);
      if (!ids.includes("FLASHLOAN_ONE_SHOT")) {
        console.error(`FAIL ATTACK-1 missing FLASHLOAN_ONE_SHOT got ${ids.join(",")}`);
        failed += 1;
        continue;
      }
    }

    if (t.id === "BOT-1") {
      if (assessment.status === "TAINTED") {
        console.error("FAIL BOT-1 must not be TAINTED");
        failed += 1;
        continue;
      }
      if (!signals.some((s) => s.id === "BOT_PROFILE")) {
        console.error("FAIL BOT-1 expected BOT_PROFILE signal");
        failed += 1;
        continue;
      }
    }

    if (t.id === "BENIGN-1") {
      if (signals.some((s) => s.class === "threat")) {
        console.error("FAIL BENIGN-1 unexpected threat signals");
        failed += 1;
        continue;
      }
    }

    console.log("PASS");
  }

  if (failed > 0) {
    console.error(`\n${failed} target(s) failed`);
    process.exit(1);
  }
  console.log("\nok: check:investigate");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
