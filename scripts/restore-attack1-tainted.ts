/**
 * Restore ATTACK-1 ENS texts after a playground dispute flipped status to WATCH.
 *
 *   pnpm restore:attack1
 *   pnpm restore:attack1 --dry-run
 *
 * Does NOT re-run Graph or re-register the name — only setText as investigator/disputer.
 * Acceptance: public-RPC cast → TAINTED; shield → BLOCK.
 */

import { namehash, type Hex } from "viem";
import { loadRootEnv } from "../packages/core/src/config/env";
import { ensNameForAddress } from "../packages/core/src/ens/label";
import { isEnsIdentityReady } from "../packages/core/src/ens/identity";
import { resolveIncident } from "../packages/core/src/ens/resolve";
import { trySetTextAs } from "../packages/core/src/ens/roles";
import { checkTarget } from "../packages/core/src/shield/check";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { loadEnsIdentity } from "../packages/core/src/ens/identity";
import { permissionedResolverAbi } from "../packages/core/src/ens/abi";

loadRootEnv();

const ATTACK_1 = "0x935bfb495e33f74d2e9735df1da66ace442ede48";
const BOT_1 = "0x352423e2fa5d5c99343d371c9e3bc56c87723cc7";
const PUBLIC_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const DISPUTE_NOTE = "restored for ETHOnline · operator";

async function publicText(ensName: string, key: string): Promise<string> {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(PUBLIC_RPC),
  });
  const identity = loadEnsIdentity().identity;
  const value = await client.readContract({
    address: identity.permissionedResolver,
    abi: permissionedResolverAbi,
    functionName: "text",
    args: [namehash(ensName), key],
  });
  return typeof value === "string" ? value : "";
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  if (!isEnsIdentityReady()) throw new Error("ENS identity not ready");

  const ensName = ensNameForAddress(ATTACK_1);
  const node = namehash(ensName) as Hex;

  const before = await resolveIncident(ATTACK_1, {
    keys: ["saviours.status", "saviours.dispute", "saviours.verdict", "saviours.threat"],
  });
  console.log("BEFORE product", {
    status: before.records["saviours.status"],
    verdict: before.records["saviours.verdict"],
    dispute: before.records["saviours.dispute"],
    threat: before.records["saviours.threat"],
  });
  console.log("BEFORE public status", await publicText(ensName, "saviours.status"));
  console.log("BEFORE public dispute", await publicText(ensName, "saviours.dispute"));

  if (dry) {
    console.log("(dry-run) would set investigator saviours.status=TAINTED, saviours.verdict=TAINTED");
    console.log(`(dry-run) would set disputer saviours.dispute=${JSON.stringify(DISPUTE_NOTE)}`);
    return;
  }

  const statusTx = await trySetTextAs("investigator", node, "saviours.status", "TAINTED");
  if (!statusTx.ok) {
    throw new Error(`investigator setText status failed: ${statusTx.error}`);
  }
  console.log("status tx", statusTx.txHash);

  const verdictTx = await trySetTextAs("investigator", node, "saviours.verdict", "TAINTED");
  if (!verdictTx.ok) {
    const asRelayer = await trySetTextAs("relayer", node, "saviours.verdict", "TAINTED");
    if (!asRelayer.ok) {
      console.warn("verdict setText soft-fail:", asRelayer.error.slice(0, 200));
    } else {
      console.log("verdict tx (relayer)", asRelayer.txHash);
    }
  } else {
    console.log("verdict tx", verdictTx.txHash);
  }

  const disputeTx = await trySetTextAs("disputer", node, "saviours.dispute", DISPUTE_NOTE);
  if (!disputeTx.ok) {
    throw new Error(`disputer setText dispute failed: ${disputeTx.error}`);
  }
  console.log("dispute tx", disputeTx.txHash);

  const after = await resolveIncident(ATTACK_1, {
    keys: ["saviours.status", "saviours.dispute", "saviours.verdict"],
  });
  console.log("AFTER product", {
    status: after.records["saviours.status"],
    verdict: after.records["saviours.verdict"],
    dispute: after.records["saviours.dispute"],
  });

  const pubStatus = await publicText(ensName, "saviours.status");
  const pubDispute = await publicText(ensName, "saviours.dispute");
  console.log("AFTER public", { status: pubStatus, dispute: pubDispute });

  if (pubStatus !== "TAINTED") {
    throw new Error(`public RPC status is ${JSON.stringify(pubStatus)}, want TAINTED`);
  }
  if (/playground dispute test/i.test(pubDispute)) {
    throw new Error(`dispute still has playground text: ${pubDispute}`);
  }

  const shield = await checkTarget({
    targetChainId: 1,
    address: ATTACK_1,
    registryNetwork: "sepolia",
  });
  console.log("SHIELD ATTACK-1", {
    decision: shield.decision,
    source: shield.source,
    reason: shield.reason,
  });
  if (shield.decision !== "BLOCK") {
    throw new Error(`expected BLOCK, got ${shield.decision}`);
  }

  const bot = await checkTarget({
    targetChainId: 1,
    address: BOT_1,
    registryNetwork: "sepolia",
  });
  console.log("SHIELD BOT-1", {
    decision: bot.decision,
    status: bot.records?.["saviours.status"],
  });
  if (bot.decision !== "WARN") {
    console.warn(`BOT-1 expected WARN, got ${bot.decision} — check manually`);
  }

  console.log("OK — ATTACK-1 restored to TAINTED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
