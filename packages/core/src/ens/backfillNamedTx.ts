/**
 * Re-name ATTACK-1 + BOT-1 under saviours.eth and write saviours.namedTx
 * so Verify ↗ opens the Sepolia setText tx (not the resolver contract).
 *
 *   pnpm --filter @saviours/core exec tsx src/ens/backfillNamedTx.ts
 */
import type { Hex } from "viem";
import { loadRootEnv } from "../config/env";
import { getEvidenceBundle } from "../evidence/getEvidence";
import { evidenceHashFrom } from "../registry/ids";
import { registerIncidentName, writeIncidentStoryTexts } from "./client";
import { loadEnsIdentity } from "./identity";
import { resolveIncident } from "./resolve";
import { buildStoryTextRecords } from "./story";

loadRootEnv();

const HEROES = [
  {
    id: "ATTACK-1",
    address: "0x935bfb495e33f74d2e9735df1da66ace442ede48",
    incidentIdSuffix: "51",
    incidentLabel: "SAV-ATTACK-1",
  },
  {
    id: "BOT-1",
    address: "0x352423e2fa5d5c99343d371c9e3bc56c87723cc7",
    incidentIdSuffix: "52",
    incidentLabel: "SAV-BOT-1",
  },
] as const;

async function rename(h: (typeof HEROES)[number]) {
  console.log(`\n— ${h.id} —`);
  const before = await resolveIncident(h.address, {
    keys: ["saviours.status", "saviours.namedTx"],
  });
  console.log("BEFORE", {
    status: before.records["saviours.status"],
    namedTx: before.namedTx ?? before.records["saviours.namedTx"],
  });

  const bundle = await getEvidenceBundle(1, h.address);
  const status = bundle.signalStatus.status;
  console.log("live Graph", status, bundle.signalStatus.rule);
  if (status !== "TAINTED" && status !== "WATCH") {
    throw new Error(`${h.id}: unexpected ${status}`);
  }

  const story = buildStoryTextRecords({
    signals: bundle.signals,
    status,
    evidence: bundle.evidence,
    rulesVersion: "pivot-3.3",
  });

  const { identity } = loadEnsIdentity();
  const registered = await registerIncidentName({
    address: h.address,
    status,
    incidentId: `0x${h.incidentIdSuffix.repeat(32).slice(0, 64)}`,
    incidentLabel: h.incidentLabel,
    confidence: status === "TAINTED" ? 0.92 : 0.88,
    evidenceHash: evidenceHashFrom(
      bundle.evidence.slice(0, 8).map((e, i) => ({
        id: e.id || `e-${i}`,
        source: e.source || "graph",
        reference: e.txHash || e.id || `r-${i}`,
        claim: e.claim || e.id,
        timestamp: e.timestamp || 1,
        rawHash: ("11".repeat(32)) as Hex,
      })),
    ),
    threat: bundle.signals.map((s) => s.id).join(","),
    investigatorName: `investigator-01.${identity.parentName}`,
  });
  console.log("registered", registered.ensName, "tx", registered.txHash);

  const written = await writeIncidentStoryTexts(h.address, story);
  console.log("story", written.txHash ?? "(unchanged)");

  const after = await resolveIncident(h.address);
  console.log("AFTER", {
    status: after.records["saviours.status"],
    namedTx: after.namedTx ?? after.records["saviours.namedTx"],
    ensName: after.ensName,
  });

  const named = after.namedTx ?? after.records["saviours.namedTx"];
  if (!named) {
    throw new Error(`${h.id}: saviours.namedTx missing after write`);
  }
  if (after.records["saviours.status"] !== status) {
    throw new Error(`${h.id}: status mismatch`);
  }
  console.log(`Verify → https://sepolia.etherscan.io/tx/${named}`);
}

async function main() {
  for (const h of HEROES) await rename(h);
  console.log("\nok: namedTx backfilled");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
