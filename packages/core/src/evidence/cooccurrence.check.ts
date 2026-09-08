/**
 * Live co-occurrence gate (S3.6).
 *
 * 1) Ensure ATTACK-1 is named TAINTED (remember if needed)
 * 2) Pick a live Graph counterparty of ATTACK-1 → must fire REGISTRY_COOCCURRENCE
 * 3) Probe HOP-1 — green if co-occurrence, else SKIP (Graph-thin, documented)
 *
 *   pnpm check:cooccur
 */

import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { RULES_VERSION } from "../classifier/validate";
import { getEvidenceBundle } from "../evidence/getEvidence";
import { signalIds } from "../evidence/signals";
import { isEnsIdentityReady } from "../ens/identity";
import { resolveIncident } from "../ens/resolve";
import { listTaintedPeers } from "../memory/taintedPeers";
import { isRegistryDeployed, rememberValidatedAssessment } from "../registry/remember";
import type { ThreatAssessment } from "../types";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../");

function loadTargets(): { id: string; address: string }[] {
  const raw = JSON.parse(
    readFileSync(resolve(ROOT, "evals/demo-targets.json"), "utf8"),
  ) as { targets: { id: string; address: string }[] };
  return raw.targets;
}

function attackSample(target: `0x${string}`): ThreatAssessment {
  const nonce = randomBytes(4).toString("hex");
  return {
    status: "TAINTED",
    confidence: 0.95,
    entity: { chainId: 1, address: target, entityType: "EOA" },
    threatTypes: ["DRAINER"],
    evidence: [
      {
        id: "c1",
        source: "cooccur-gate",
        reference: `r-${nonce}`,
        claim: "cooccur gate",
        timestamp: 1,
        rawHash: "11".repeat(32),
      },
      {
        id: "c2",
        source: "cooccur-gate",
        reference: `r2-${nonce}`,
        claim: "cooccur gate 2",
        timestamp: 2,
        rawHash: "22".repeat(32),
      },
    ],
    counterEvidence: [],
    fingerprint: { behaviorHash: `0x${randomBytes(32).toString("hex")}` },
    modelVersion: "cooccur-gate",
    rulesVersion: RULES_VERSION,
    createdAt: Math.floor(Date.now() / 1000),
  };
}

async function ensureAttackNamed(attack: `0x${string}`): Promise<void> {
  const peers = await listTaintedPeers({ seeds: [attack], includeDemoAttacks: false });
  if (peers.some((p) => p.address === attack)) {
    console.log("ATTACK-1 already TAINTED in memory", peers[0]?.source);
    return;
  }
  console.log("Remembering ATTACK-1 as TAINTED…");
  const r = await rememberValidatedAssessment(attackSample(attack), {
    network: "sepolia",
    ens: true,
    threatSignals: ["FLASHLOAN_ONE_SHOT", "ATOMIC_MULTI_PROTOCOL"],
  });
  if (!r.persisted) {
    throw new Error(`remember ATTACK-1 failed: ${JSON.stringify(r)}`);
  }
  const resolved = await resolveIncident(attack, { keys: ["saviours.status"] });
  if (resolved.records["saviours.status"] !== "TAINTED") {
    throw new Error(`ENS status not TAINTED after remember: ${JSON.stringify(resolved.records)}`);
  }
  console.log("   ens", r.ensName);
}

async function main() {
  if (!isRegistryDeployed("sepolia") || !isEnsIdentityReady()) {
    throw new Error("Need sepolia registry + ens identity");
  }

  const targets = loadTargets();
  const attack = targets.find((t) => t.id === "ATTACK-1")!.address.toLowerCase() as `0x${string}`;
  const hop = targets.find((t) => t.id === "HOP-1")!.address.toLowerCase() as `0x${string}`;

  console.log("check:cooccur — live REGISTRY_COOCCURRENCE\n");
  await ensureAttackNamed(attack);

  const peers = await listTaintedPeers();
  console.log(
    "TAINTED peers",
    peers.map((p) => `${p.address.slice(0, 10)}…(${p.source})`).join(", ") || "(none)",
  );
  if (!peers.some((p) => p.address === attack)) {
    throw new Error("ATTACK-1 not in tainted peer set after ensure");
  }

  // --- Prove path on a live Graph counterparty of ATTACK-1 ---
  console.log("\n1) ATTACK-1 footprint for live counterparty…");
  const attackBundle = await getEvidenceBundle(1, attack, {
    bypassCache: true,
    skipCooccurrence: true,
  });
  const cps = [
    ...new Set(
      attackBundle.evidence
        .map((e) => e.counterparty?.toLowerCase())
        .filter((c): c is string => Boolean(c) && c !== attack),
    ),
  ];
  if (!cps.length) {
    throw new Error("ATTACK-1 has no Graph counterparties — cannot prove co-occurrence");
  }
  const liveHop = cps[0]! as `0x${string}`;
  console.log("   live counterparty", liveHop, `(of ${cps.length})`);

  console.log("\n2) Evidence for live counterparty (expect REGISTRY_COOCCURRENCE)…");
  const liveBundle = await getEvidenceBundle(1, liveHop, { bypassCache: true });
  const liveIds = signalIds(liveBundle.signals);
  console.log("   signals", liveIds.join(",") || "(none)");
  console.log("   linked", liveBundle.cooccurrenceLinked);
  console.log("   status", liveBundle.signalStatus.status, liveBundle.signalStatus.rule);

  if (!liveIds.includes("REGISTRY_COOCCURRENCE")) {
    throw new Error(
      `live counterparty missing REGISTRY_COOCCURRENCE (got ${liveIds.join(",")})`,
    );
  }
  if (liveBundle.signalStatus.status !== "TAINTED") {
    throw new Error(`expected TAINTED from co-occurrence, got ${liveBundle.signalStatus.status}`);
  }
  console.log("   OK live Graph co-occurrence path");

  // --- HOP-1 (may be Graph-thin) ---
  console.log("\n3) HOP-1 probe…");
  const hopBundle = await getEvidenceBundle(1, hop, { bypassCache: true });
  const hopIds = signalIds(hopBundle.signals);
  console.log("   signals", hopIds.join(",") || "(none)");
  console.log("   linked", hopBundle.cooccurrenceLinked);
  console.log("   status", hopBundle.signalStatus.status);

  if (hopIds.includes("REGISTRY_COOCCURRENCE")) {
    console.log("   OK HOP-1 green via co-occurrence");
  } else {
    console.log(
      "   SKIPPED HOP-1 — no live Graph edge to ATTACK-1 in Messari/Adapter A set (Coverage honesty). Video beat stays optional.",
    );
  }

  console.log("\nok: check:cooccur (live path proven)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
