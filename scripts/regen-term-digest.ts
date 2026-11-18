/**
 * One-shot: re-audit the Term Safe pin and print the golden digest.
 * Does not print RPC URLs or keys.
 */
import { auditSafe, toGoldenReport } from "../packages/check/src/index.js";
import type { Hex } from "../packages/check/src/assessTypes.js";

const TERM_SAFE = "0x46DA347d1Db6EdCA62BF6Cd5892Dc284fC938613" as Hex;
const TERM_BLOCK = 26435999n;

async function main() {
  const report = await auditSafe({
    safeAddress: TERM_SAFE,
    chainId: 1,
    blockNumber: TERM_BLOCK,
  });
  const golden = toGoldenReport(report);
  console.log(
    JSON.stringify(
      {
        status: report.status,
        digest: golden.reportDigest,
        schema: golden.schemaVersion,
        findings: report.findings.length,
        principals: report.reach?.principals.length ?? 0,
        gaps: report.coverage.gaps.length,
        consistency: report.freshness?.consistency ?? null,
        errorCount: report.errors.length,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
