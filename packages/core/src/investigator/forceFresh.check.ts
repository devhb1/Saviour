/**
 * Gate: forceFresh must skip MEMORY HIT and run live Graph.
 *
 *   pnpm check:force-fresh
 *
 * Uses ATTACK-1 (named on Sepolia). Without forceFresh → memoryHit.
 * With forceFresh → graphQueries > 0, banner, signals.
 */

import { loadRootEnv } from "../config/env";
import { investigateDetailed } from "./investigate";

loadRootEnv();

const ATTACK_1 = "0x935bfb495e33f74d2e9735df1da66ace442ede48";

async function main() {
  console.log("check:force-fresh — ATTACK-1 memory vs forceFresh\n");

  const mem = await investigateDetailed(1, ATTACK_1, {
    forceFresh: false,
    registryNetwork: "sepolia",
  });
  console.log("memory path:", {
    memoryHit: mem.memoryHit,
    graphQueries: mem.cost.graphQueries,
    aiCalls: mem.cost.aiCalls,
    status: mem.assessment.status,
    decision: mem.shield.decision,
  });

  if (!mem.memoryHit) {
    throw new Error(
      "Expected MEMORY HIT without forceFresh (ATTACK-1 should be named). Seed/remember first.",
    );
  }
  if (mem.cost.graphQueries !== 0 || mem.cost.aiCalls !== 0) {
    throw new Error("MEMORY HIT must be 0 Graph · 0 AI");
  }

  const fresh = await investigateDetailed(1, ATTACK_1, {
    forceFresh: true,
    registryNetwork: "sepolia",
  });
  console.log("forceFresh path:", {
    memoryHit: fresh.memoryHit,
    graphQueries: fresh.cost.graphQueries,
    aiCalls: fresh.cost.aiCalls,
    banner: fresh.banner,
    signalIds: fresh.signals.map((s) => s.id),
    status: fresh.assessment.status,
  });

  if (fresh.memoryHit) {
    throw new Error("forceFresh still returned memoryHit=true — short-circuit bug");
  }
  if (fresh.cost.graphQueries < 1) {
    throw new Error(`forceFresh graphQueries=${fresh.cost.graphQueries}, want ≥1`);
  }
  if (!fresh.banner) {
    throw new Error("forceFresh missing fan-out banner");
  }
  if (fresh.signals.length < 1) {
    throw new Error("forceFresh expected signals on ATTACK-1");
  }

  console.log("\nok: check:force-fresh (MEMORY HIT vs Graph path)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
