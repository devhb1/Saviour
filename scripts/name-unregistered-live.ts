/**
 * C2 — Name LIVE incident rows that sit in the registry but not on ENS.
 *
 *   pnpm exec tsx scripts/name-unregistered-live.ts
 *   pnpm exec tsx scripts/name-unregistered-live.ts --dry-run
 */

import type { Hex } from "viem";
import { loadRootEnv } from "../packages/core/src/config/env";
import { isEnsIdentityReady } from "../packages/core/src/ens/identity";
import {
  isIncidentNameRegistered,
  resolveIncident,
  resolveStatus,
} from "../packages/core/src/ens/resolve";
import { registerIncidentName } from "../packages/core/src/ens/client";
import {
  getLatestIncidentByTarget,
} from "../packages/core/src/registry/client";
import { loadLiveIncidentIndex } from "../packages/core/src/incidents/index";
import { createHash } from "node:crypto";

loadRootEnv();

const DENY = new Set([
  "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  "0xc74b72bbf904bac9fac880303922fc76a69f0bb4",
]);

function fp(id: string): Hex {
  return `0x${createHash("sha256").update(`saviours-live-name:${id}`).digest("hex")}` as Hex;
}

async function needsName(address: string): Promise<{
  need: boolean;
  reason: string;
  status?: string;
}> {
  const registered = await isIncidentNameRegistered(address);
  if (!registered) return { need: true, reason: "unregistered" };
  const { status } = await resolveStatus(address);
  if (!status || status === "") {
    return { need: true, reason: "empty-status", status: "" };
  }
  return { need: false, reason: "ok", status };
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  if (!isEnsIdentityReady()) throw new Error("ENS identity not ready");

  const live = loadLiveIncidentIndex();
  let named = 0;
  let skipped = 0;

  for (const row of live.incidents) {
    const address = row.address.toLowerCase();
    if (DENY.has(address)) {
      console.log("DENY", row.id);
      skipped++;
      continue;
    }

    const check = await needsName(address);
    if (!check.need) {
      console.log("ALREADY", row.id, address, check.status);
      skipped++;
      continue;
    }

    const reg = await getLatestIncidentByTarget(1, address as `0x${string}`, "sepolia");
    const status = row.status;
    const incidentId = (reg?.incidentId as Hex | undefined) ?? fp(row.id);
    const evidenceHash =
      (reg?.evidenceHash as Hex | undefined) ?? fp(`${row.id}:ev`);

    console.log("NAME", row.id, address, status, `(${check.reason})`);
    if (dry) continue;

    try {
      const r = await registerIncidentName({
        address,
        status,
        incidentId,
        incidentLabel: row.label.slice(0, 80),
        confidence: status === "TAINTED" ? 0.88 : 0.65,
        evidenceHash,
        threat: status === "TAINTED" ? "LIVE_REMEMBER" : "LIVE_WATCH",
        textRecords: {
          "saviours.plainVerdict": row.label.slice(0, 120),
          "saviours.rulesVersion": "0.2.0",
          url: row.source_url ?? "https://www.saviours.xyz",
        },
      });
      const after = await resolveIncident(address, { keys: ["saviours.status"] });
      console.log("  →", r.ensName, after.records["saviours.status"], r.txHash);
      named++;
    } catch (e) {
      console.error("  FAIL", e instanceof Error ? e.message.slice(0, 200) : e);
    }
  }

  console.log(`done named=${named} skipped=${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
