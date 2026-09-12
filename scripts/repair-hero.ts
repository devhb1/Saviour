/**
 * A1 — Re-register ATTACK-1 hero and restore full ENS verdict texts.
 *
 *   SAVIOURS_ALLOW_WRITES=1 pnpm exec tsx scripts/repair-hero.ts
 *   pnpm exec tsx scripts/repair-hero.ts --dry-run
 *
 * Acceptance: public-RPC cast returns TAINTED; shield cascadeLayer is not "code"/clone.
 */

import { loadRootEnv } from "../packages/core/src/config/env";
import { registerIncidentName } from "../packages/core/src/ens/client";
import {
  isIncidentNameRegistered,
  resolveIncident,
} from "../packages/core/src/ens/resolve";
import { isEnsIdentityReady } from "../packages/core/src/ens/identity";
import { registerCodeClassName } from "../packages/core/src/ens/client";
import { checkTarget } from "../packages/core/src/shield/check";
import { createPublicClient, http, type Hex, namehash } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { labelForRuntimeCode, ensNameForRuntimeCode } from "../packages/core/src/ens/label";
import { permissionedResolverAbi } from "../packages/core/src/ens/abi";
import { loadEnsIdentity } from "../packages/core/src/ens/identity";
import { getLatestIncidentByTarget } from "../packages/core/src/registry/client";

loadRootEnv();

const HERO = "0x935bfb495e33f74d2e9735df1da66ace442ede48";
const PUBLIC_RPC = "https://ethereum-sepolia-rpc.publicnode.com";

async function publicStatus(ensName: string): Promise<string> {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(PUBLIC_RPC),
  });
  const identity = loadEnsIdentity().identity;
  const value = await client.readContract({
    address: identity.permissionedResolver,
    abi: permissionedResolverAbi,
    functionName: "text",
    args: [namehash(ensName), "saviours.status"],
  });
  return typeof value === "string" ? value : "";
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  if (!isEnsIdentityReady()) throw new Error("ENS identity not ready");

  const ensName = `${HERO}.saviours.eth`;
  console.log("BEFORE registered", await isIncidentNameRegistered(HERO));
  console.log("BEFORE public status", await publicStatus(ensName));

  const row = await getLatestIncidentByTarget(1, HERO as `0x${string}`, "sepolia");
  console.log("registry", row?.status, row?.incidentId);

  // Pull live evidence for real signal ids / atomic tx when Graph key present
  let threat = "FLASHLOAN_ONE_SHOT,ATOMIC_MULTI_PROTOCOL";
  let plainVerdict = "Flashloan-funded same-tx multi-protocol drain";
  let atomicTx = "";
  let protocols = "aave-v3,curve";
  let evidenceHash =
    (row?.evidenceHash as Hex | undefined) ??
    (`0x${"a1".repeat(32)}` as Hex);
  let confidence = 0.92;
  let incidentId =
    (row?.incidentId as Hex | undefined) ??
    (`0x${"93".repeat(32)}` as Hex);

  try {
    const { getEvidenceBundle } = await import(
      "../packages/core/src/evidence/getEvidence"
    );
    const { deriveSignals } = await import(
      "../packages/core/src/evidence/signals"
    );
    const bundle = await getEvidenceBundle({
      chainId: 1,
      address: HERO,
    });
    const signals = deriveSignals(bundle.evidence);
    const threatIds = signals
      .filter((s) => s.class === "threat")
      .map((s) => s.id);
    if (threatIds.length) threat = threatIds.join(",");
    const atomic = signals.find((s) => s.id === "ATOMIC_MULTI_PROTOCOL");
    // Prefer a shared tx from evidence
    const byTx = new Map<string, Set<string>>();
    for (const e of bundle.evidence) {
      if (!e.txHash || !e.protocol) continue;
      const set = byTx.get(e.txHash) ?? new Set();
      set.add(e.protocol);
      byTx.set(e.txHash, set);
    }
    for (const [tx, protos] of byTx) {
      if (protos.size >= 2) {
        atomicTx = tx;
        protocols = [...protos].join(",");
        break;
      }
    }
    void atomic;
    console.log("live signals", threatIds, { atomicTx, protocols });
  } catch (e) {
    console.warn(
      "live evidence soft-fail — using known hero defaults:",
      e instanceof Error ? e.message : e,
    );
  }

  if (dry) {
    console.log("(dry-run) would register", {
      ensName,
      threat,
      plainVerdict,
      atomicTx,
      protocols,
    });
    return;
  }

  const named = await registerIncidentName({
    address: HERO,
    status: "TAINTED",
    incidentId,
    incidentLabel: "SEED-ATTACK-1",
    confidence,
    evidenceHash,
    threat,
    textRecords: {
      "saviours.plainVerdict": plainVerdict,
      "saviours.rulesVersion": "0.2.0",
      ...(atomicTx ? { "saviours.atomicTx": atomicTx } : {}),
      ...(protocols ? { "saviours.protocols": protocols } : {}),
      url: "https://www.saviours.xyz",
    },
  });
  console.log("registered address name", named.ensName, named.txHash);

  // Ensure class name carries classSeed so cascade never calls the seed a clone
  const mainnetRpc =
    process.env.MAINNET_RPC_URL?.trim() || process.env.ETH_RPC_URL?.trim();
  if (mainnetRpc) {
    const main = createPublicClient({
      chain: mainnet,
      transport: http(mainnetRpc),
    });
    const code =
      (await main.getBytecode({ address: HERO as `0x${string}` })) ?? "0x";
    if (code && code !== "0x") {
      const label = labelForRuntimeCode(code)!;
      const classEns = ensNameForRuntimeCode(code)!;
      console.log("patching class seed on", classEns);
      await registerCodeClassName({
        bytecode: code,
        status: "TAINTED",
        incidentLabel: `SAV-CODE-${label.slice(5, 13)}`,
        confidence: 0.92,
        threat,
        plainVerdict:
          "Bytecode class of a named threat — clones of this code are blocked on first sighting",
        evidenceHash,
        classSeed: HERO,
      });
    }
  }

  const after = await resolveIncident(HERO);
  console.log("AFTER product resolve", {
    hit: after.hit,
    status: after.records["saviours.status"],
    verdict: after.records["saviours.verdict"],
  });
  console.log("AFTER public status", await publicStatus(ensName));

  const shield = await checkTarget({
    targetChainId: 1,
    address: HERO,
    registryNetwork: "sepolia",
  });
  console.log("shield", {
    decision: shield.decision,
    source: shield.source,
    cascadeLayer: shield.cascadeLayer,
    ensName: shield.ensName,
    reason: shield.reason,
  });

  if (shield.decision !== "BLOCK") {
    throw new Error(`expected BLOCK, got ${shield.decision}`);
  }
  if (/clone|first sighting/i.test(shield.reason)) {
    throw new Error(`hero reason still looks like a clone: ${shield.reason}`);
  }
  const pub = await publicStatus(ensName);
  if (pub !== "TAINTED") {
    throw new Error(`public RPC status is ${JSON.stringify(pub)}, want TAINTED`);
  }
  console.log("OK — hero repaired");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
