/**
 * Live gate for S1.2 standardized fan-out.
 *
 *   pnpm check:standard [address]
 *
 * Default address = ATTACK-1 from evals/demo-targets.json (MakinaFi).
 * Always hits The Graph Network — no fixtures.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadRootEnv } from "../config/env";
import { fanOut, formatFanOutBanner } from "./standard";

loadRootEnv();

function loadAttack1(): string {
  const path = resolve(process.cwd(), "../../evals/demo-targets.json");
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as {
      targets?: Array<{ id: string; address: string }>;
    };
    const a1 = raw.targets?.find((t) => t.id === "ATTACK-1");
    if (a1?.address) return a1.address;
  } catch {
    /* fall through */
  }
  // Locked ATTACK-1 — never invent; matches evals/demo-targets.json
  return "0x935bfb495e33f74d2e9735df1da66ace442ede48";
}

async function main() {
  const address = (process.argv[2] ?? loadAttack1()).toLowerCase();
  console.log("check:standard — live Messari fan-out");
  console.log(`address: ${address}\n`);

  const result = await fanOut(address, { first: 15 });
  console.log(formatFanOutBanner(result));
  console.log("");
  console.log(
    [
      "protocol".padEnd(14),
      "status".padEnd(7),
      "ms".padStart(6),
      "rows".padStart(5),
      "kinds",
    ].join("  "),
  );
  console.log("-".repeat(72));

  for (const r of result.results) {
    const kinds = [...new Set(r.evidence.map((e) => e.kind ?? "?"))].join(",");
    console.log(
      [
        r.protocol.padEnd(14),
        r.status.padEnd(7),
        String(r.ms).padStart(6),
        String(r.rowCount).padStart(5),
        kinds || (r.error ? `ERR ${r.error.slice(0, 40)}` : "—"),
      ].join("  "),
    );
  }

  if (result.excluded.length) {
    console.log("\nExcluded (not queried):");
    for (const e of result.excluded) {
      console.log(`  - ${e.slug}: ${e.reason}`);
    }
  }

  // Structured sample for ATTACK-1 flashloan provenance
  const fl = result.evidence.find((e) => e.kind === "flashloan");
  if (fl) {
    console.log("\nSample flashloan evidence:");
    console.log(
      JSON.stringify(
        {
          id: fl.id,
          protocol: fl.protocol,
          subgraphId: fl.subgraphId,
          txHash: fl.txHash,
          amountUSD: fl.amountUSD,
          claim: fl.claim,
        },
        null,
        2,
      ),
    );
  }

  const activityOk = result.protocolsOk >= 1 || result.rowCount >= 1;
  if (!activityOk && result.protocolsError === result.protocolsQueried) {
    console.error("\nFAIL: all protocols errored — check GRAPH_API_KEY / gateway");
    process.exit(1);
  }

  console.log("\nok: check:standard");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
