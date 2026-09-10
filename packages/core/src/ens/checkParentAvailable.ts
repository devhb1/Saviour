/**
 * Check whether preferred parent labels are free on Sepolia ENSv2.
 *   pnpm --filter @saviours/core exec tsx src/ens/checkParentAvailable.ts
 */
import { createPublicClient, http, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import { loadRootEnv, requireEnv } from "../config/env";
import { ensSepolia } from "./addresses";

async function main() {
  loadRootEnv();
  const rpc = requireEnv("SEPOLIA_RPC_URL");
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpc),
  });
  const abi = parseAbi([
    "function isAvailable(string label) view returns (bool)",
  ]);
  for (const label of ["saviours", "saviour", "savioursqsy56o"]) {
    const avail = await publicClient.readContract({
      address: ensSepolia.ETHRegistrar,
      abi,
      functionName: "isAvailable",
      args: [label],
    });
    console.log(`${label}.eth available=${avail}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
