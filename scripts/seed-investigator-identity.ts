/**
 * B5a — Write identity + permission-ceiling texts on investigator-01.saviours.eth
 *
 *   pnpm exec tsx scripts/seed-investigator-identity.ts
 *   pnpm exec tsx scripts/seed-investigator-identity.ts --dry-run
 */

import { createPublicClient, namehash, type Hex } from "viem";
import { sepolia } from "viem/chains";
import { loadRootEnv } from "../packages/core/src/config/env";
import { permissionedResolverAbi } from "../packages/core/src/ens/abi";
import { isEnsIdentityReady, loadEnsIdentity } from "../packages/core/src/ens/identity";
import { registerInvestigatorNamespace } from "../packages/core/src/ens/roles";
import { INVESTIGATOR_TEXT_KEYS } from "../packages/core/src/ens/roles";
import { sepoliaWriteTransport } from "../packages/core/src/ens/transport";
import { createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { requireEnv } from "../packages/core/src/config/env";
import { loadLiveIncidentIndex } from "../packages/core/src/incidents/index";
import { loadSeedIncidents } from "../packages/core/src/incidents/seed";

loadRootEnv();

const ENS_NAME = "investigator-01.saviours.eth";

async function setText(
  wallet: ReturnType<typeof createWalletClient>,
  publicClient: ReturnType<typeof createPublicClient>,
  resolver: `0x${string}`,
  node: Hex,
  key: string,
  value: string,
) {
  const current = await publicClient.readContract({
    address: resolver,
    abi: permissionedResolverAbi,
    functionName: "text",
    args: [node, key],
  });
  if (current === value) return null;
  const h = await wallet.writeContract({
    address: resolver,
    abi: permissionedResolverAbi,
    functionName: "setText",
    args: [node, key, value],
    account: wallet.account!,
    chain: sepolia,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: h });
  if (receipt.status !== "success") throw new Error(`setText(${key}) failed ${h}`);
  return h;
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  if (!isEnsIdentityReady()) throw new Error("ENS identity not ready");

  const identity = loadEnsIdentity().identity;
  const ns = await registerInvestigatorNamespace();
  console.log("namespace", ns);

  const seed = loadSeedIncidents();
  const live = loadLiveIncidentIndex();
  const namesWritten = seed.incidents.length + live.incidents.length;

  const texts: Record<string, string> = {
    name: "Saviours Investigator 01",
    description:
      "Autonomous threat investigator. Writes verdicts; cannot write disputes.",
    url: "https://www.saviours.xyz",
    "saviours.role": "ROLE_REGISTRAR,ROLE_SET_TEXT",
    "saviours.canWrite": INVESTIGATOR_TEXT_KEYS.join(","),
    "saviours.cannotWrite": "saviours.dispute",
    "saviours.rulesVersion": "0.2.0",
    "saviours.namesWritten": String(namesWritten),
    "saviours.model": "gpt-4o-mini (explains only; cannot decide)",
    "saviours.investigator": ENS_NAME,
  };

  console.log("texts", texts);
  if (dry) {
    console.log("(dry-run) stop");
    return;
  }

  const key = requireEnv("RELAYER_PRIVATE_KEY");
  const pk = (key.startsWith("0x") ? key : `0x${key}`) as Hex;
  const account = privateKeyToAccount(pk);
  const transport = sepoliaWriteTransport();
  const publicClient = createPublicClient({ chain: sepolia, transport });
  const wallet = createWalletClient({ account, chain: sepolia, transport });
  const node = namehash(ENS_NAME);

  let last: Hex | null = null;
  for (const [k, v] of Object.entries(texts)) {
    const h = await setText(
      wallet,
      publicClient,
      identity.permissionedResolver,
      node,
      k,
      v,
    );
    if (h) {
      last = h;
      console.log("wrote", k, h);
    } else {
      console.log("skip", k, "(unchanged)");
    }
  }

  // Verify on public RPC
  const pub = createPublicClient({
    chain: sepolia,
    transport: sepoliaWriteTransport(),
  });
  for (const key of ["name", "saviours.cannotWrite", "saviours.canWrite"] as const) {
    const v = await pub.readContract({
      address: identity.permissionedResolver,
      abi: permissionedResolverAbi,
      functionName: "text",
      args: [node, key],
    });
    console.log("verify", key, "=", JSON.stringify(v));
    if (!v) throw new Error(`missing ${key}`);
  }
  console.log("OK investigator identity seeded", last);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
