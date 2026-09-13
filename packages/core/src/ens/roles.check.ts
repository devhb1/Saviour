/**
 * S3.3 live gate — EAC roles + investigator-01 + unauthorized revert demo.
 *
 *   pnpm check:ens-roles
 *
 * ✅ investigator setText(saviours.dispute) reverts
 * ✅ disputer setText(saviours.status) succeeds
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { namehash } from "viem/ens";
import { loadRootEnv } from "../config/env";
import { registerIncidentName } from "./client";
import { loadEnsIdentity } from "./identity";
import {
  disputerAccount,
  investigatorAccount,
  registerInvestigatorNamespace,
  setupEacRoles,
  trySetTextAs,
} from "./roles";
import { evidenceHashFrom } from "../registry/ids";
import { randomBytes } from "node:crypto";

loadRootEnv();

function repoRoot(): string {
  return resolve(process.cwd(), "../..");
}

async function main() {
  console.log("check:ens-roles — Sepolia EAC\n");

  const inv = investigatorAccount();
  const dis = disputerAccount();
  console.log("investigator", inv.address);
  console.log("disputer    ", dis.address);

  console.log("\n1) setupEacRoles…");
  const roles = await setupEacRoles();
  console.log("  granted txs:", roles.txs.length);

  console.log("\n2) registerInvestigatorNamespace…");
  const ns = await registerInvestigatorNamespace();
  console.log("  ", ns.ensName, ns.reused ? "(reused)" : "(minted)", ns.txHash ?? "");

  // Fresh target so we have a node with texts to mutate
  console.log("\n3) mint address-label incident for EAC probe…");
  const target = `0x${randomBytes(20).toString("hex")}` as `0x${string}`;
  const incidentLabel = `SAV-EAC-${target.slice(2, 10)}`;
  const registered = await registerIncidentName({
    address: target,
    status: "TAINTED",
    incidentId: `0x${randomBytes(32).toString("hex")}`,
    incidentLabel,
    confidence: 0.88,
    evidenceHash: evidenceHashFrom([
      {
        id: "eac-1",
        source: "eac-gate",
        reference: "r1",
        claim: "eac",
        timestamp: 1,
        rawHash: "11".repeat(32),
      },
    ]),
    threat: "EAC_PROBE",
    investigatorName: ns.ensName,
  });
  console.log("  ", registered.ensName);

  const node = namehash(registered.ensName);

  console.log("\n4) investigator setText(saviours.dispute) — expect REVERT…");
  const bad = await trySetTextAs(
    "investigator",
    node,
    "saviours.dispute",
    `unauthorized probe @ ${Date.now()}`,
  );
  if (bad.ok) {
    throw new Error("investigator was allowed to write saviours.dispute — EAC broken");
  }
  const revertHit =
    /EACUnauthorizedAccountRoles|unauthorized|execution reverted/i.test(bad.error);
  if (!revertHit) {
    throw new Error(`unexpected failure (want EAC revert): ${bad.error.slice(0, 300)}`);
  }
  console.log("  REVERT OK:", bad.error.slice(0, 160).replace(/\n/g, " "));

  console.log("\n5) disputer setText(saviours.status)=WATCH — expect OK…");
  const good = await trySetTextAs("disputer", node, "saviours.status", "WATCH");
  if (!good.ok) {
    throw new Error(`disputer setText failed: ${good.error.slice(0, 300)}`);
  }
  console.log("  OK tx:", good.txHash);

  // Persist identity extras
  const identityPath = resolve(repoRoot(), "deployments/sepolia-ens-identity.json");
  const file = JSON.parse(readFileSync(identityPath, "utf8")) as {
    identity: Record<string, unknown>;
  };
  file.identity = {
    ...file.identity,
    investigatorAddress: inv.address,
    disputerAddress: dis.address,
    investigatorName: ns.ensName,
    eacConfiguredAt: new Date().toISOString(),
  };
  writeFileSync(identityPath, `${JSON.stringify(file, null, 2)}\n`);
  console.log("\nUpdated", identityPath);

  console.log("\nok: check:ens-roles");
}

/** Fail-fast so hung Sepolia RPC cannot block film prep forever. */
const GATE_MS = 45_000;
const gate = setTimeout(() => {
  console.error(
    `check:ens-roles timed out after ${GATE_MS / 1000}s — Sepolia RPC hung. Aborting.`,
  );
  process.exit(1);
}, GATE_MS);

main()
  .then(() => {
    clearTimeout(gate);
  })
  .catch((e) => {
    clearTimeout(gate);
    console.error(e);
    process.exit(1);
  });
