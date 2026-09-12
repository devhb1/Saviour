/**
 * Public-RPC ENS verification — no Saviours server, no Graph.
 *
 *   pnpm check:ens-public
 *   node scripts/verify-ens-public.mjs
 */

import { createPublicClient, http, namehash, parseAbi } from "viem";
import { sepolia } from "viem/chains";

const RESOLVER = "0xF479306621F718F7d76875f67506ceD33717751c";
const RPC =
  process.env.SEPOLIA_PUBLIC_RPC?.trim() ||
  "https://ethereum-sepolia-rpc.publicnode.com";

const abi = parseAbi([
  "function text(bytes32 node, string key) view returns (string)",
]);

const CHECKS = [
  {
    ens: "investigator-01.saviours.eth",
    key: "name",
    want: "Saviours Investigator 01",
  },
  {
    ens: "investigator-01.saviours.eth",
    key: "saviours.cannotWrite",
    want: "saviours.dispute",
  },
  {
    ens: "investigator-01.saviours.eth",
    key: "saviours.canWrite",
    wantIncludes: "saviours.status",
  },
  {
    ens: "0x935bfb495e33f74d2e9735df1da66ace442ede48.saviours.eth",
    key: "saviours.status",
    want: "TAINTED",
  },
  {
    ens: "0x935bfb495e33f74d2e9735df1da66ace442ede48.saviours.eth",
    key: "saviours.verdict",
    want: "TAINTED",
  },
  {
    ens: "code-75029d9a35bdb3d17149.saviours.eth",
    key: "saviours.status",
    want: "TAINTED",
  },
  {
    ens: "0x1111111111111111111111111111111111111111.saviours.eth",
    key: "saviours.status",
    want: "",
  },
];

async function main() {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(RPC),
  });
  console.log("Public RPC:", RPC);
  let fail = 0;
  for (const c of CHECKS) {
    const value = await client.readContract({
      address: RESOLVER,
      abi,
      functionName: "text",
      args: [namehash(c.ens), c.key],
    });
    const v = typeof value === "string" ? value : "";
    let ok = false;
    if ("want" in c) ok = v === c.want;
    if ("wantIncludes" in c) ok = v.includes(c.wantIncludes);
    const mark = ok ? "PASS" : "FAIL";
    if (!ok) fail++;
    console.log(
      `${mark}  ${c.ens} ${c.key} = ${JSON.stringify(v)}${
        "want" in c ? ` (want ${JSON.stringify(c.want)})` : ""
      }${"wantIncludes" in c ? ` (want includes ${JSON.stringify(c.wantIncludes)})` : ""}`,
    );
  }
  if (fail) {
    console.error(`\n${fail} assertion(s) failed`);
    process.exit(1);
  }
  console.log("\nAll public ENS assertions PASS.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
