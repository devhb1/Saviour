/**
 * C1 — Audit live Remember rows; promote to proof:graph only when live fan-out
 * fires threat-class signals. Never launder provenance or co-occurrence-only.
 *
 *   pnpm exec tsx scripts/audit-live-proof.ts
 *   pnpm exec tsx scripts/audit-live-proof.ts --write
 */

import { loadRootEnv } from "../packages/core/src/config/env";
import { getEvidenceBundle } from "../packages/core/src/evidence/getEvidence";
import { deriveSignals } from "../packages/core/src/evidence/signals";
import {
  loadLiveIncidentIndex,
  liveIncidentsPath,
  type LiveIncidentRecord,
} from "../packages/core/src/incidents/index";
import { writeFileSync } from "node:fs";

loadRootEnv();

async function main() {
  const doWrite = process.argv.includes("--write");
  const index = loadLiveIncidentIndex();
  const out: LiveIncidentRecord[] = [];

  for (const row of index.incidents) {
    // Skip denylist / already graph
    if (row.proof === "graph" && row.proofAudit) {
      out.push(row);
      console.log("KEEP graph", row.id, row.proofAudit);
      continue;
    }

    try {
      const bundle = await getEvidenceBundle(1, row.address, {
        skipCooccurrence: true,
      });
      const signals = deriveSignals(bundle.evidence);
      const threat = signals.filter((s) => s.class === "threat").map((s) => s.id);
      const both =
        threat.includes("FLASHLOAN_ONE_SHOT") &&
        threat.includes("ATOMIC_MULTI_PROTOCOL");

      if (row.status === "TAINTED" && both) {
        const audit = `signals ${threat.join("+")} fired on live fan-out ${new Date().toISOString()}`;
        out.push({ ...row, proof: "graph", proofAudit: audit });
        console.log("PROMOTE", row.id, audit);
      } else {
        out.push({ ...row, proof: row.proof ?? "live" });
        console.log(
          "KEEP live",
          row.id,
          row.status,
          threat.length ? threat.join(",") : "no-threat-signals",
        );
      }
    } catch (e) {
      out.push({ ...row, proof: row.proof ?? "live" });
      console.warn(
        "SKIP",
        row.id,
        e instanceof Error ? e.message : e,
      );
    }
  }

  const graph = out.filter((r) => r.proof === "graph").length;
  console.log(`\nResult: ${graph} graph · ${out.length - graph} other of ${out.length}`);

  if (doWrite) {
    const next = {
      ...index,
      updatedAt: new Date().toISOString(),
      incidents: out,
    };
    writeFileSync(liveIncidentsPath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
    console.log("Wrote", liveIncidentsPath());
  } else {
    console.log("(dry) pass --write to persist");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
