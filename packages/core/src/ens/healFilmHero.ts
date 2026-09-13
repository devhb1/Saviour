/**
 * Ensure ATTACK-1 address-label is registered + TAINTED on Sepolia.
 * Heals playground revoke/dispute pollution without a full Graph re-seed.
 */

import { namehash, type Hex } from "viem";
import { getEvidenceBundle } from "../evidence/getEvidence";
import { evidenceHashFrom } from "../registry/ids";
import { registerIncidentName, writeIncidentStoryTexts } from "./client";
import { ATTACK_1_ADDRESS } from "./filmLock";
import { ensNameForAddress } from "./label";
import { isEnsIdentityReady } from "./identity";
import { isIncidentNameRegistered, resolveIncident } from "./resolve";
import { trySetTextAs } from "./roles";
import { buildStoryTextRecords } from "./story";
import { checkTarget } from "../shield/check";

const DISPUTE_NOTE = "restored for ETHOnline · film-lock heal";

export type HealFilmHeroResult = {
  address: typeof ATTACK_1_ADDRESS;
  ensName: string;
  healed: boolean;
  alreadyOk: boolean;
  registeredBefore: boolean;
  statusBefore: string;
  statusAfter: string;
  shieldDecision: string;
  steps: string[];
};

/**
 * Idempotent: no-op when address-label already reads TAINTED.
 * Re-registers if unregistered; otherwise rewrites status/verdict/dispute.
 */
export async function ensureAttack1FilmReady(): Promise<HealFilmHeroResult> {
  if (!isEnsIdentityReady()) {
    throw new Error("ENS identity not ready — need deployments/sepolia-ens-identity.json");
  }

  const address = ATTACK_1_ADDRESS;
  const ensName = ensNameForAddress(address);
  const steps: string[] = [];

  const registeredBefore = await isIncidentNameRegistered(address);
  const before = await resolveIncident(address, {
    keys: ["saviours.status", "saviours.verdict", "saviours.dispute", "saviours.threat"],
  });
  const statusBefore = before.records["saviours.status"] ?? "";

  if (registeredBefore && statusBefore === "TAINTED" && before.hit) {
    const shield = await checkTarget({
      targetChainId: 1,
      address,
      registryNetwork: "sepolia",
    });
    return {
      address,
      ensName,
      healed: false,
      alreadyOk: true,
      registeredBefore,
      statusBefore,
      statusAfter: statusBefore,
      shieldDecision: shield.decision,
      steps: ["noop · address-label already TAINTED"],
    };
  }

  let statusAfter = statusBefore;

  if (!registeredBefore) {
    steps.push("unregistered → registerIncidentName + story texts");
    const bundle = await getEvidenceBundle(1, address);
    const status = bundle.signalStatus.status;
    if (status !== "TAINTED" && status !== "WATCH") {
      throw new Error(`live Graph returned ${status} — cannot heal film hero`);
    }
    const story = buildStoryTextRecords({
      signals: bundle.signals,
      status,
      evidence: bundle.evidence,
      rulesVersion: "pivot-3.3",
    });
    const registered = await registerIncidentName({
      address,
      status,
      incidentId: `0x${"51".repeat(32)}`,
      incidentLabel: "SAV-ATTACK-1-heal",
      confidence: 0.92,
      evidenceHash: evidenceHashFrom(
        bundle.evidence.slice(0, 8).map((e, i) => ({
          id: e.id || `e-${i}`,
          source: e.source || "graph",
          reference: e.txHash || e.id || `r-${i}`,
          claim: e.claim || e.id,
          timestamp: e.timestamp || 1,
          rawHash: ("11".repeat(32)) as `0x${string}`,
        })),
      ),
      threat: bundle.signals.map((s) => s.id).join(","),
      investigatorName: "investigator-01.saviours.eth",
    });
    steps.push(`registered ${registered.ensName}`);
    await writeIncidentStoryTexts(address, story);
    steps.push("story texts written");
    statusAfter = status;
  } else {
    steps.push(`registered but status=${statusBefore || "(empty)"} → setText TAINTED`);
    const node = namehash(ensName) as Hex;
    const statusTx = await trySetTextAs("investigator", node, "saviours.status", "TAINTED");
    if (!statusTx.ok) {
      throw new Error(`heal status failed: ${statusTx.error}`);
    }
    const verdictTx = await trySetTextAs("investigator", node, "saviours.verdict", "TAINTED");
    if (!verdictTx.ok) {
      await trySetTextAs("relayer", node, "saviours.verdict", "TAINTED");
    }
    await trySetTextAs("disputer", node, "saviours.dispute", DISPUTE_NOTE);
    statusAfter = "TAINTED";
  }

  const after = await resolveIncident(address, {
    keys: ["saviours.status"],
  });
  if (!after.hit || after.records["saviours.status"] !== "TAINTED") {
    throw new Error(
      `heal incomplete · hit=${after.hit} status=${after.records["saviours.status"] ?? ""}`,
    );
  }

  const shield = await checkTarget({
    targetChainId: 1,
    address,
    registryNetwork: "sepolia",
  });
  steps.push(`shield ${shield.decision} · source ${shield.source}`);

  return {
    address,
    ensName,
    healed: true,
    alreadyOk: false,
    registeredBefore,
    statusBefore,
    statusAfter,
    shieldDecision: shield.decision,
    steps,
  };
}
