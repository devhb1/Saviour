/**
 * One-shot: revoke Vitalik + HopeLend victim ENS names so clean-pin / film stay honest.
 *   pnpm --filter @saviours/core exec tsx src/ens/purgePollution.ts
 */
import { loadRootEnv } from "../config/env";
import { revokeIncidentName } from "./dispute";
import { resolveIncident } from "./resolve";
import { checkTarget } from "../shield/check";

loadRootEnv();

const TARGETS = [
  {
    address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
    label: "vitalik.eth",
  },
  {
    address: "0xc74b72bbf904bac9fac880303922fc76a69f0bb4",
    label: "HopeLend victim pool",
  },
] as const;

async function main() {
  console.log("purgePollution — revoke false memory names\n");
  for (const t of TARGETS) {
    const before = await resolveIncident(t.address, {
      keys: ["saviours.status"],
    });
    console.log("BEFORE", t.label, {
      hit: before.hit,
      status: before.records["saviours.status"],
      source: before.source,
    });
    if (before.hit) {
      try {
        const r = await revokeIncidentName({
          address: t.address,
          note: "purge pollution for clean-pin / film",
        });
        console.log("REVOKED", t.label, r.unregisterTxHash);
      } catch (e) {
        console.error(
          "REVOKE FAIL",
          t.label,
          e instanceof Error ? e.message : e,
        );
      }
    } else {
      console.log("skip — already no ENS hit");
    }
    const after = await checkTarget({
      targetChainId: 1,
      address: t.address,
      registryNetwork: "sepolia",
    });
    console.log("SHIELD", t.label, {
      decision: after.decision,
      source: after.source,
    });
    console.log("");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
