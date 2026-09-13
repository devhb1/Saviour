/**
 * Phase E — one-at-a-time Graph-honest growth helper.
 *
 * Dry-run by default: forceFresh investigate, print signals, never Remember
 * unless --remember and SAVIOURS_ALLOW_WRITES=1.
 *
 *   pnpm grow:one -- --address=0x… --dry-run
 *   pnpm grow:one -- --address=0x… --remember
 *
 * Never launders provenance into proof:graph. DRAIN_FANIN only when it fires live.
 */

import { investigateAndRemember } from "../packages/core/src/investigator/investigate";
import { loadRootEnv } from "../packages/core/src/config/env";

loadRootEnv();

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

async function main() {
  const address = (arg("address") ?? "").trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    throw new Error("Usage: pnpm grow:one -- --address=0x… [--dry-run|--remember]");
  }
  const remember = process.argv.includes("--remember");
  const dry = !remember || process.argv.includes("--dry-run");
  const persist = remember && !dry && process.env.SAVIOURS_ALLOW_WRITES === "1";

  console.log("grow:one", { address, persist, dry: !persist });

  const { assessment, remember: rem, run } = await investigateAndRemember(
    1,
    address,
    {
      persist,
      forceFresh: true,
      registryNetwork: "sepolia",
    },
  );

  const threat = (run.signals ?? [])
    .filter((s) => s.class === "threat")
    .map((s) => s.id);
  console.log("status", assessment.status);
  console.log("threat signals", threat.length ? threat.join(", ") : "(none)");
  console.log("drain_fanin", threat.includes("DRAIN_FANIN") ? "FIRED" : "no");
  console.log("memoryHit", run.memoryHit);
  console.log("shield", run.shield.decision, run.shield.reason);
  if (persist) {
    console.log("remember", rem);
    console.log(
      "If threat-class fired and you named: set proof:graph only after audit:live-proof confirms.",
    );
  } else {
    console.log(
      "Dry — no ENS write. Re-run with --remember and SAVIOURS_ALLOW_WRITES=1 only when ready.",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
