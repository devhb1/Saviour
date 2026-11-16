/**
 * Base Sepolia / Anvil V2 demo script.
 *
 *   SAVIOURS_BASE_REGISTRY=0x… pnpm exec tsx scripts/demo-v2-sepolia.ts
 *
 * Without registry: prints expected action matrix (offline).
 */
import { toDecision } from "@saviours/check";

const cases = [
  { name: "unset", action: "NO_VERDICT" as const },
  { name: "watch", action: "WARN" as const },
  { name: "quarantine", action: "WARN" as const },
  { name: "tainted", action: "BLOCK" as const },
  { name: "rpc", action: "RPC_ERROR" as const },
];

async function main() {
  const reg = (process.env.SAVIOURS_BASE_REGISTRY ?? "").trim();
  console.log("demo-v2-sepolia");
  console.log("registry", reg || "(not set — offline matrix only)");
  for (const c of cases) {
    console.log(c.name, "→", c.action, "decision", toDecision(c.action));
  }
  console.log("gate: verifiedSafe must always be false; NO_VERDICT never ALLOW");
  if (!reg) {
    console.log("Fund Base Sepolia + deploy (docs/DEPLOY_BASE_SEPOLIA.md) to live-smoke.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
