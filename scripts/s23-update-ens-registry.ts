/**
 * S2.3 — point ENS incident text `saviours.registry` at the new SavioursRegistry.
 *
 *   pnpm exec tsx scripts/s23-update-ens-registry.ts
 *
 * Reads deployments/sepolia.json + sepolia-ens-identity.json; writes setText on-chain
 * and updates the local identity record.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { loadRootEnv, requireEnv } from "../packages/core/src/config/env";
import { permissionedResolverAbi } from "../packages/core/src/ens/abi";

loadRootEnv();

const ROOT = resolve(import.meta.dirname, "..");

async function main() {
  const sepoliaDep = JSON.parse(
    readFileSync(resolve(ROOT, "deployments/sepolia.json"), "utf8"),
  ) as {
    contracts: { SavioursRegistry: { address: string } };
  };
  const identityPath = resolve(ROOT, "deployments/sepolia-ens-identity.json");
  const identityFile = JSON.parse(readFileSync(identityPath, "utf8")) as {
    identity: {
      permissionedResolver: `0x${string}`;
      incidentNode: Hex;
      incidentName: string;
      textRecords: Record<string, string>;
    };
  };

  const registryAddr = sepoliaDep.contracts.SavioursRegistry.address.toLowerCase();
  const { permissionedResolver, incidentNode, incidentName, textRecords } =
    identityFile.identity;

  const pk = requireEnv("RELAYER_PRIVATE_KEY");
  const rpc = requireEnv("SEPOLIA_RPC_URL");
  const key = (pk.startsWith("0x") ? pk : `0x${pk}`) as Hex;
  const account = privateKeyToAccount(key);
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpc),
  });
  const wallet = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpc),
  });

  const current = await publicClient.readContract({
    address: permissionedResolver,
    abi: permissionedResolverAbi,
    functionName: "text",
    args: [incidentNode, "saviours.registry"],
  });

  console.log("incident:", incidentName);
  console.log("node:", incidentNode);
  console.log("current saviours.registry:", current);
  console.log("new     saviours.registry:", registryAddr);

  if (current.toLowerCase() === registryAddr) {
    console.log("Already up to date on-chain.");
  } else {
    const hash = await wallet.writeContract({
      address: permissionedResolver,
      abi: permissionedResolverAbi,
      functionName: "setText",
      args: [incidentNode, "saviours.registry", registryAddr],
      account,
      chain: sepolia,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new Error(`setText failed: ${hash}`);
    }
    console.log("setText tx:", hash);

    const urlHash = await wallet.writeContract({
      address: permissionedResolver,
      abi: permissionedResolverAbi,
      functionName: "setText",
      args: [
        incidentNode,
        "url",
        `https://sepolia.etherscan.io/address/${registryAddr}`,
      ],
      account,
      chain: sepolia,
    });
    await publicClient.waitForTransactionReceipt({ hash: urlHash });
    console.log("url setText tx:", urlHash);
  }

  identityFile.identity.textRecords = {
    ...textRecords,
    "saviours.registry": registryAddr,
    "saviours.network": "sepolia",
  };
  writeFileSync(identityPath, `${JSON.stringify(identityFile, null, 2)}\n`);
  console.log("Updated", identityPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
