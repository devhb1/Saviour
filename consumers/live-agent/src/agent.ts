#!/usr/bin/env node
/**
 * Standalone agent loop — proves SAVIOURS memory without the web UI.
 *
 *   cd consumers/live-agent && pnpm i && pnpm start
 *
 * Requires SEPOLIA_RPC_URL. Optional: BAZANTIC_GATEWAY_URL, PUBLIC_APP_URL.
 */

import { checkENS } from "./ensShield.js";
import { investigateViaGateway } from "./pay.js";
import { log, logBlock, logHeader, logMiss, logOk, logWarn } from "./log.js";

const WORKLIST = (
  process.env.AGENT_WORKLIST ??
  [
    "0x935bfb495e33f74d2e9735df1da66ace442ede48", // ATTACK-1
    "0x352423e2fa5d5c99343d371c9e3bc56c87723cc7", // BOT-1
  ].join(",")
)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const AGENT_NAME = process.env.AGENT_NAME ?? "trader-07.live-agent";

function short(a: string) {
  return `${a.slice(0, 8)}…${a.slice(-4)}`;
}

async function main() {
  logHeader(`${AGENT_NAME} · worklist ${WORKLIST.length}`);
  log("ENS hot path imports nothing from @saviours/*");

  for (const target of WORKLIST) {
    logHeader(`${AGENT_NAME} → considering swap with ${short(target)}`);
    const t0 = Date.now();
    const memory = await checkENS(target);
    const ms = Date.now() - t0;

    if (memory.status === "TAINTED") {
      logBlock(
        `${memory.threat ?? "TAINTED"} · 0 Graph · 0 AI · ${ms}ms · $0.00 · ${memory.ensName}`,
      );
      if (memory.evidenceHash) log(`  evidence ${memory.evidenceHash.slice(0, 18)}…`);
      if (memory.atomicTx) log(`  atomicTx ${memory.atomicTx}`);
      log("  → cancel swap (agent decision)");
      continue;
    }

    if (memory.status === "WATCH") {
      logWarn(
        `${memory.threat ?? "WATCH"} · reduce size 90% · ${ms}ms · ${memory.ensName}`,
      );
      continue;
    }

    logMiss(`No ENS memory (${ms}ms) — investigate via gateway`);
    try {
      const result = await investigateViaGateway(target);
      if (result.verdict === "PAYMENT_REQUIRED") {
        logWarn(`${result.settlementNote} · cost ${result.cost}`);
        continue;
      }
      logOk(`verdict ${result.verdict} · ${result.ensName ?? "unnamed"} · ${result.cost}`);
      if (result.verdict === "TAINTED" || result.verdict === "WATCH") {
        log("  → next agent reads ENS for $0");
      }
    } catch (e) {
      logWarn(e instanceof Error ? e.message : String(e));
    }
  }

  logHeader("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
