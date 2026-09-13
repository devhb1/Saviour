/**
 * Restore ATTACK-1 ENS after playground dispute/revoke pollution.
 *
 *   pnpm restore:attack1
 *   pnpm restore:attack1 --dry-run
 *
 * Uses ensureAttack1FilmReady — re-registers if unregistered, else setText TAINTED.
 */

import { loadRootEnv } from "../packages/core/src/config/env";
import { ensureAttack1FilmReady } from "../packages/core/src/ens/healFilmHero";
import { isEnsIdentityReady } from "../packages/core/src/ens/identity";
import { isIncidentNameRegistered, resolveIncident } from "../packages/core/src/ens/resolve";
import { ATTACK_1_ADDRESS, BOT_1_ADDRESS } from "../packages/core/src/ens/filmLock";
import { checkTarget } from "../packages/core/src/shield/check";

loadRootEnv();

async function main() {
  const dry = process.argv.includes("--dry-run");
  if (!isEnsIdentityReady()) throw new Error("ENS identity not ready");

  const registered = await isIncidentNameRegistered(ATTACK_1_ADDRESS);
  const before = await resolveIncident(ATTACK_1_ADDRESS, {
    keys: ["saviours.status", "saviours.dispute", "saviours.verdict"],
  });
  console.log("BEFORE", {
    registered,
    hit: before.hit,
    status: before.records["saviours.status"] || null,
    dispute: before.records["saviours.dispute"] || null,
  });

  if (dry) {
    console.log(
      registered
        ? "(dry-run) would setText TAINTED if status ≠ TAINTED"
        : "(dry-run) would re-register address-label + story texts",
    );
    return;
  }

  const result = await ensureAttack1FilmReady();
  console.log("HEAL", result);

  const shield = await checkTarget({
    targetChainId: 1,
    address: ATTACK_1_ADDRESS,
    registryNetwork: "sepolia",
  });
  console.log("SHIELD ATTACK-1", {
    decision: shield.decision,
    source: shield.source,
    status: shield.records?.["saviours.status"],
  });
  if (shield.decision !== "BLOCK") {
    throw new Error(`expected BLOCK, got ${shield.decision}`);
  }

  const after = await resolveIncident(ATTACK_1_ADDRESS, {
    keys: ["saviours.status"],
  });
  if (!after.hit || after.records["saviours.status"] !== "TAINTED") {
    throw new Error("address-label still not TAINTED after heal");
  }

  const bot = await checkTarget({
    targetChainId: 1,
    address: BOT_1_ADDRESS,
    registryNetwork: "sepolia",
  });
  console.log("SHIELD BOT-1", {
    decision: bot.decision,
    status: bot.records?.["saviours.status"],
  });

  console.log("OK — ATTACK-1 film-ready (address-label TAINTED · passport will paint)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
