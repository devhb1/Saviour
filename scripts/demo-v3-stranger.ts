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
  assessTransaction,
  computeSafeTxHashWithDomainName,
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
  const hash = computeSafeTxHashWithDomainName({
    chainId: raw.chainId,
    safeAddress: raw.safeAddress,
    safeVersion: raw.safeVersion,
    safeTx,
  });

  const registry = (process.env.SAVIOURS_BASE_REGISTRY ?? "").trim() as Hex | "";
  console.log("=== Saviour V3 stranger demo ===");
  console.log("workflow: B · Transaction review");
  console.log("fixture: Term Prop 5 privileged prefix");
  console.log("safe:", raw.safeAddress);
  console.log("safeTxHash:", hash);
  console.log("registry:", registry || "(decode-only — fund Base Sepolia to enable resolve)");

  const result = await assessTransaction(
    {
      kind: "SAFE_TRANSACTION",
      chainId: raw.chainId,
      safeAddress: raw.safeAddress,
      safeVersion: raw.safeVersion,
      safeTx,
      expectedSafeTxHash: hash,
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
  console.log("errors:", result.errors.length ? result.errors : "none");
  console.log("\ngate:");
  console.log("  integrity MATCH:", result.integrity === "MATCH");
  console.log("  decision WARN:", result.decision === "WARN");
  console.log("  NO_VERDICT≠SAFE: always");
  console.log("\nNext: open /review → Load Term Prop 5 demo → Assess transaction");
  if (!registry) {
    console.log("Next: fund 0x6799… on Base Sepolia → DeployV2 → set SAVIOURS_BASE_REGISTRY");
  }

  if (result.integrity !== "MATCH" || result.decision !== "WARN") {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
