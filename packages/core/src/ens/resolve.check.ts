/**
 * Live gate for ENS label + resolve helpers.
 *
 *   pnpm check:ens-resolve
 *
 * 1) labelForAddress shape
 * 2) resolve ATTACK-1 address-label → saviours.status present
 * 3) resolve a never-registered address-label → empty / hit=false cleanly
 */

import { loadRootEnv } from "../config/env";
import { ensNameForAddress, isAddressLabel, labelForAddress } from "./label";
import { resolveIncident, resolveIncidentName } from "./resolve";

loadRootEnv();

const ATTACK_1 = "0x935bfb495e33f74d2e9735df1da66ace442ede48";

async function main() {
  console.log("check:ens-resolve — Sepolia ENSv2\n");

  const sample = "0x935bfB495E33f74d2E9735DF1DA66acE442ede48";

  const label = labelForAddress(sample);
  if (label !== sample.toLowerCase()) {
    throw new Error(`labelForAddress mismatch: ${label}`);
  }
  if (!isAddressLabel(label)) {
    throw new Error("isAddressLabel failed");
  }
  const full = ensNameForAddress(sample);
  console.log("label OK:", full);

  // Canonical product name — address-label, not legacy incident-0001
  console.log("\nresolve ATTACK-1 address-label…");
  const known = await resolveIncident(ATTACK_1);
  console.log("  ensName:", known.ensName);
  console.log("  source:", known.source, "hit:", known.hit);
  console.log("  status:", known.records["saviours.status"] ?? "(empty)");

  if (!known.hit) {
    throw new Error("expected hit on ATTACK-1 saviours.status");
  }
  const status = known.records["saviours.status"]?.toUpperCase();
  if (status !== "TAINTED") {
    throw new Error(`expected TAINTED on ATTACK-1, got ${status}`);
  }
  console.log("  saviours.status OK:", status);

  // Never-registered address-label → must return empty cleanly
  const ghost = "0x00000000000000000000000000000000000000aa";
  console.log("\nresolve never-registered…");
  const empty = await resolveIncidentName(ensNameForAddress(ghost));
  if (empty.hit) {
    throw new Error("ghost address should not hit");
  }
  console.log("  hit:false OK");

  console.log("\nok: check:ens-resolve");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
