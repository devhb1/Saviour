/**
 * Live gate for S3.1 ENS label + resolve helpers.
 *
 *   pnpm check:ens-resolve
 *
 * 1) labelForAddress shape
 * 2) resolve known spike name (incident-0001) → saviours.registry present
 * 3) resolve address-label that is not registered → empty / hit=false cleanly
 */

import { loadRootEnv } from "../config/env";
import { loadEnsIdentity } from "./identity";
import { ensNameForAddress, isAddressLabel, labelForAddress } from "./label";
import { resolveIncident, resolveIncidentName } from "./resolve";

loadRootEnv();

async function main() {
  console.log("check:ens-resolve — Sepolia ENSv2\n");

  const identity = loadEnsIdentity().identity;
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

  // Known existing name from spike (not address-label yet — S3.2 migrates)
  console.log("\nresolve incident-0001…");
  const known = await resolveIncidentName(identity.incidentName);
  console.log("  ensName:", known.ensName);
  console.log("  source:", known.source, "hit:", known.hit);
  console.log("  records:", JSON.stringify(known.records, null, 2));

  if (!known.hit) {
    throw new Error("expected hit on incident-0001 text records");
  }
  const reg = known.records["saviours.registry"];
  if (!reg || !/^0x[a-fA-F0-9]{40}$/.test(reg)) {
    throw new Error(`expected saviours.registry address, got ${reg}`);
  }
  console.log("  saviours.registry OK:", reg);

  // Address-label name — not registered yet → must return empty cleanly
  console.log("\nresolve unregistered address-label…");
  const missing = await resolveIncident(sample);
  console.log("  ensName:", missing.ensName);
  console.log("  source:", missing.source, "hit:", missing.hit);
  console.log("  records keys:", Object.keys(missing.records));
  if (missing.hit) {
    console.warn("  note: unexpected hit (name may already be registered)");
  } else if (missing.source !== "none") {
    throw new Error(`empty resolve should report source=none, got ${missing.source}`);
  }
  console.log("  empty resolve OK");

  console.log("\nok: check:ens-resolve");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
