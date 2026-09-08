/**
 * Gate: MCP check_target returns BLOCK for ATTACK-1 (no Cursor UI required).
 * Also smokes list_standard_protocols (+ light fanout_target).
 *
 *   pnpm check:mcp
 */

import { loadRootEnv } from "@saviours/core";
import {
  check_target,
  fanout_target,
  get_incident,
  list_standard_protocols,
} from "./tools";

loadRootEnv();

const ATTACK_1 = "0x935bfb495e33f74d2e9735df1da66ace442ede48";
const VITALIK = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";

async function main() {
  console.log("check:mcp — check_target / get_incident / list / fanout\n");

  const hit = await check_target({ address: ATTACK_1 });
  console.log("ATTACK-1", hit.summary);
  console.log(" ", {
    decision: hit.decision,
    source: hit.source,
    usedAi: hit.usedAi,
    latencyMs: hit.latencyMs,
  });

  if (hit.decision !== "BLOCK") {
    throw new Error(`expected BLOCK, got ${hit.decision}`);
  }
  if (hit.source !== "ens") {
    throw new Error(`expected source=ens, got ${hit.source}`);
  }
  if (hit.usedAi !== false || hit.freshInvestigation !== false) {
    throw new Error("fresh investigation must be NO / usedAi false");
  }

  const miss = await check_target({ address: VITALIK });
  console.log("Vitalik ", miss.summary);
  if (miss.decision !== "ESCALATE") {
    throw new Error(`Vitalik expected ESCALATE, got ${miss.decision}`);
  }

  const incident = await get_incident({ address: ATTACK_1 });
  console.log("get_incident status", incident.records["saviours.status"]);
  if (incident.records["saviours.status"] !== "TAINTED") {
    throw new Error("get_incident expected TAINTED");
  }

  const registry = list_standard_protocols();
  console.log(
    "list_standard_protocols",
    registry.protocols.length,
    "pinned · excluded",
    registry.excluded.length,
  );
  if (registry.protocols.length !== 8) {
    throw new Error(`expected 8 standard protocols, got ${registry.protocols.length}`);
  }
  if (!registry.protocols.every((p) => p.subgraphId?.length)) {
    throw new Error("every protocol must have subgraphId");
  }

  // Light fanout smoke — Graph live; soft-assert structure only
  const fan = await fanout_target({ address: ATTACK_1 });
  console.log(
    "fanout_target",
    fan.protocolsQueried,
    "queried · signals",
    fan.signals.map((s) => s.id).join(",") || "(none)",
  );
  if (!Array.isArray(fan.protocols) || fan.protocols.length === 0) {
    throw new Error("fanout_target expected protocol results");
  }
  if (!fan.protocols.some((p) => p.subgraphId)) {
    throw new Error("fanout_target expected subgraphId on results");
  }

  console.log(
    "\nok: check:mcp (BLOCK · list×8 · fanout subgraphId · fresh investigation: NO)",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
