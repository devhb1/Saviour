/**
 * Live Graph (and optional investigate) checks.
 * Always pulls on-chain indexed data via The Graph — no static tx tables.
 *
 *   pnpm eval:live              # evidence-only (Graph)
 *   pnpm eval:live --investigate  # also runs OpenAI classify (costs credits)
 */

import { getEvidenceForAddress } from "../packages/core/src/evidence/getEvidence";
import { investigate } from "../packages/core/src/investigator/investigate";
import { liveTargets } from "./fixtures";

const withInvestigate = process.argv.includes("--investigate");

async function main() {
  console.log("\n=== Live Graph eval ===\n");
  let failed = 0;

  for (const t of liveTargets) {
    process.stdout.write(`${t.id} evidence... `);
    try {
      const evidence = await getEvidenceForAddress(t.chainId, t.address);
      const nonempty = evidence.length > 0;
      const ok =
        t.expectedEvidence === "nonempty" ? nonempty : true; // thin may be empty
      if (!ok) {
        failed += 1;
        console.log(`FAIL count=${evidence.length} (wanted nonempty)`);
        continue;
      }
      console.log(`OK count=${evidence.length}`);

      if (withInvestigate) {
        process.stdout.write(`  investigate... `);
        const a = await investigate(t.chainId, t.address);
        console.log(
          `${a.status} conf=${a.confidence} evidence=${a.evidence.length} (live only)`,
        );
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
  console.log("\nok: live Graph eval");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
