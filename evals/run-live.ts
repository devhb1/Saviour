/**
 * Live eval against locked `evals/demo-targets.json`.
 *
 * Always pulls The Graph via Messari fan-out + Adapter A — no static tx tables.
 * Verdict = deterministic `statusFromSignals` (AI optional via --investigate).
 *
 *   pnpm eval:live                 # signals over live Graph (default gate)
 *   pnpm eval:live --investigate   # also run explain-LLM path (costs credits)
 *
 * Graph-thin targets (ATTACK-2, HOP-1) were locked as provenance-first:
 * live Graph may be UNKNOWN — we assert no false TAINTED + Coverage note.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadRootEnv } from "../packages/core/src/config/env";
import { getEvidenceBundle } from "../packages/core/src/evidence/getEvidence";
import { signalIds } from "../packages/core/src/evidence/signals";
import { investigateDetailed } from "../packages/core/src/investigator/investigate";
import { checkTarget } from "../packages/core/src/shield/check";
import type { AssessmentStatus } from "../packages/core/src/types";

loadRootEnv();

const withInvestigate = process.argv.includes("--investigate");
const ROOT = resolve(import.meta.dirname ?? ".", "..");

type DemoTarget = {
  id: string;
  address: string;
  expected: AssessmentStatus;
  notes?: string;
  graph?: { protocolsHit?: string[]; flashloanCount?: number | null };
};

type DemoFile = {
  lockedAt: string | null;
  status: string;
  targets: DemoTarget[];
};

/** What live Graph+signals must accept (Coverage honesty for thin Graph). */
const LIVE_ACCEPT: Record<string, AssessmentStatus[]> = {
  "ATTACK-1": ["TAINTED"],
  "ATTACK-2": ["UNKNOWN", "WATCH"], // provenance-first; Graph empty at lock
  "BOT-1": ["WATCH"],
  "BENIGN-1": ["SAFE", "UNKNOWN"],
  "HOP-1": ["UNKNOWN", "WATCH", "TAINTED"], // TAINTED only with live REGISTRY_COOCCURRENCE
};

function loadDemoTargets(): DemoTarget[] {
  const path = resolve(ROOT, "evals/demo-targets.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as DemoFile;
  if (raw.status !== "LOCKED" || !raw.lockedAt) {
    throw new Error(`demo-targets.json not LOCKED (status=${raw.status})`);
  }
  if (!raw.targets?.length) {
    throw new Error("demo-targets.json has no targets");
  }
  return raw.targets;
}

function acceptFor(id: string, expected: AssessmentStatus): AssessmentStatus[] {
  return LIVE_ACCEPT[id] ?? [expected];
}

async function main() {
  const targets = loadDemoTargets();
  console.log("\n=== Live demo-targets eval (Graph + signals) ===\n");
  console.log(`targets: ${targets.length}  investigate=${withInvestigate}\n`);

  let failed = 0;

  // Sanity: false Vitalik TAINTED must stay purged (S2.3)
  {
    process.stdout.write("SANITY Vitalik Shield... ");
    const shield = await checkTarget({
      targetChainId: 1,
      address: "0xd8da6BF26964aF9D7eEd9e03E53415D37aA96045",
      registryNetwork: "sepolia",
    });
    if (shield.decision !== "ESCALATE") {
      failed += 1;
      console.log(`FAIL got ${shield.decision} (want ESCALATE)`);
    } else {
      console.log(`OK ${shield.decision}`);
    }
  }

  for (const t of targets) {
    const accept = acceptFor(t.id, t.expected);
    process.stdout.write(`${t.id} ${t.address.slice(0, 10)}… `);

    try {
      const bundle = await getEvidenceBundle(1, t.address, { bypassCache: true });
      const status = bundle.signalStatus.status;
      const ids = signalIds(bundle.signals);
      const ok = accept.includes(status);

      // Extra: never false-TAINTED Graph-thin ATTACK-2 / HOP without threat signals
      const threat = bundle.signals.some((s) => s.class === "threat");
      if (
        (t.id === "ATTACK-2" || t.id === "HOP-1" || t.id === "BENIGN-1") &&
        status === "TAINTED" &&
        !threat
      ) {
        failed += 1;
        console.log(`FAIL false TAINTED signals=[${ids.join(",")}]`);
        continue;
      }

      if (!ok) {
        failed += 1;
        console.log(
          `FAIL status=${status} accept=[${accept.join("|")}] signals=[${ids.join(",")}] rows=${bundle.evidence.length}`,
        );
        continue;
      }

      const coverage =
        t.expected !== status && accept.includes(status)
          ? ` (Coverage: product expects ${t.expected}; live Graph→${status})`
          : "";

      console.log(
        `OK ${status} signals=[${ids.join(",") || "none"}] rows=${bundle.evidence.length} ${bundle.banner}${coverage}`,
      );
      if (t.id === "HOP-1" && !ids.includes("REGISTRY_COOCCURRENCE")) {
        console.log(
          "  note: HOP-1 SKIPPED for video co-occurrence beat (no live Graph edge to ATTACK-* in indexed protocols)",
        );
      }

      if (withInvestigate && (t.id === "ATTACK-1" || t.id === "BOT-1" || t.id === "BENIGN-1")) {
        process.stdout.write(`  investigate... `);
        const run = await investigateDetailed(1, t.address, {
          persist: false,
          forceFresh: true,
        });
        const invOk = accept.includes(run.assessment.status);
        if (!invOk) {
          failed += 1;
          console.log(
            `FAIL ${run.assessment.status} (accept ${accept.join("|")})`,
          );
        } else {
          console.log(
            `OK ${run.assessment.status} evidence=${run.assessment.evidence.length} ai=${run.cost.aiCalls}`,
          );
        }
      }
    } catch (err) {
      failed += 1;
      console.log("ERROR", err instanceof Error ? err.message : err);
    }
  }

  if (failed > 0) {
    console.log(`\n${failed} failure(s)`);
    process.exit(1);
  }
  console.log("\nok: live demo-targets eval");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
