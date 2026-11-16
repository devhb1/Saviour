/**
 * Stranger-ready V3 demo (offline + optional live registry).
 *
 *   pnpm exec tsx scripts/demo-v3-stranger.ts
 *   SAVIOURS_BASE_REGISTRY=0x… pnpm exec tsx scripts/demo-v3-stranger.ts
 *
 * Proves Workflow B: Term Safe JSON → hash MATCH → WARN assessment.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assessAndExplain,
  computeSafeTxHash,
  type Hex,
} from "@saviours/check";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const raw = JSON.parse(
    readFileSync(join(root, "fixtures/safe/term-prop5-review.json"), "utf8"),
  );
  const safeTx = {
    to: raw.safeTx.to as Hex,
    value: BigInt(raw.safeTx.value),
    data: raw.safeTx.data as Hex,
    operation: raw.safeTx.operation as 0 | 1,
    safeTxGas: BigInt(raw.safeTx.safeTxGas),
    baseGas: BigInt(raw.safeTx.baseGas),
    gasPrice: BigInt(raw.safeTx.gasPrice),
    gasToken: raw.safeTx.gasToken as Hex,
    refundReceiver: raw.safeTx.refundReceiver as Hex,
    nonce: BigInt(raw.safeTx.nonce),
  };
  const hash = computeSafeTxHash({
    chainId: raw.chainId,
    safeAddress: raw.safeAddress,
    safeVersion: raw.safeVersion,
    safeTx,
  });

  const registry = (process.env.SAVIOURS_BASE_REGISTRY ?? "").trim() as Hex | "";
  console.log("=== Saviour Transaction Review demo ===");
  console.log("product: Treasury Control Intelligence");
  console.log("fixture: Term Prop 5 privileged prefix (bytes decode)");
  console.log("safe:", raw.safeAddress);
  console.log("safeTxHash (1.3+ domain):", hash);
  console.log("fixture expected:", raw.expectedSafeTxHash);
  console.log("registry:", registry || "(decode-only — not required for Review)");

  const result = await assessAndExplain(
    {
      kind: "SAFE_TRANSACTION",
      chainId: raw.chainId,
      safeAddress: raw.safeAddress,
      safeVersion: raw.safeVersion,
      safeTx,
      expectedSafeTxHash: (raw.expectedSafeTxHash ?? hash) as Hex,
    },
    {
      extraSubjects: raw.extraSubjects as Hex[],
      resolve: registry
        ? {
            registryAddress: registry,
            subjectChainId: raw.chainId,
            registryNetwork: "base-sepolia",
          }
        : undefined,
    },
  );

  console.log("\n--- assessment ---");
  console.log("decision:", result.decision);
  console.log("coverage:", result.coverage);
  console.log("integrity:", result.integrity);
  console.log(
    "actions:",
    result.actions.map((a) => `${a.selectorHint}:${a.severity}`).join(", "),
  );
  console.log("privilegeDiff:", result.privilegeDiff.summary);
  for (const c of result.privilegeDiff.claims) {
    console.log(`  · ${c.control}: ${c.before} → ${c.after} (${c.source})`);
  }
  console.log("errors:", result.errors.length ? result.errors : "none");
  console.log("\ngate:");
  console.log("  integrity MATCH:", result.integrity === "MATCH");
  console.log("  decision WARN:", result.decision === "WARN");
  console.log("  NO_VERDICT≠SAFE: always");
  console.log("\nNext: open /review → Load Term Prop 5 demo → Assess transaction");
  console.log("See docs/SAVIOUR_PRODUCT_RESET.md — Review is the product; Watch is prototype.");

  if (result.integrity !== "MATCH" || result.decision !== "WARN") {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
