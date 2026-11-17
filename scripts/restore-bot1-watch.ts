/**
 * Restore BOT-1 ENS to WATCH after playground revoke/clear pollution.
 *
 *   pnpm restore:bot1
 *   pnpm restore:bot1 --dry-run
 */

import { loadRootEnv } from "../packages/core/src/config/env";
import { ensureBot1WatchReady } from "../packages/core/src/ens/healFilmHero";
import { isEnsIdentityReady } from "../packages/core/src/ens/identity";
import {
  isIncidentNameRegistered,
  resolveIncident,
} from "../packages/core/src/ens/resolve";
import { BOT_1_ADDRESS } from "../packages/core/src/ens/filmLock";
import { checkTarget } from "../packages/core/src/shield/check";

loadRootEnv();

async function main() {
  const dry = process.argv.includes("--dry-run");
  if (!isEnsIdentityReady()) throw new Error("ENS identity not ready");

  const registered = await isIncidentNameRegistered(BOT_1_ADDRESS);
  const before = await resolveIncident(BOT_1_ADDRESS, {
    keys: ["saviours.status", "saviours.verdict", "saviours.threat"],
  });
  console.log("BEFORE", {
    registered,
    hit: before.hit,
    status: before.records["saviours.status"] || null,
    threat: before.records["saviours.threat"] || null,
  });

  if (dry) {
    console.log(
      registered
        ? "(dry-run) would setText WATCH if status ≠ WATCH"
        : "(dry-run) would re-register BOT-1 as WATCH",
    );
    return;
  }

  const result = await ensureBot1WatchReady();
  console.log("HEAL", result);

  const shield = await checkTarget({
    targetChainId: 1,
    address: BOT_1_ADDRESS,
    registryNetwork: "sepolia",
  });
  console.log("SHIELD BOT-1", {
    decision: shield.decision,
    source: shield.source,
    status: shield.records?.["saviours.status"],
  });
  if (shield.decision !== "WARN") {
    console.warn(
      `warn: expected WARN for WATCH, got ${shield.decision} (still filmable if status=WATCH)`,
    );
  }

  const after = await resolveIncident(BOT_1_ADDRESS, {
    keys: ["saviours.status"],
  });
  if (!after.hit || after.records["saviours.status"] !== "WATCH") {
    throw new Error("BOT-1 still not WATCH after heal");
  }

  console.log("OK — BOT-1 film-ready (WATCH contrast · EAC probe target)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
