#!/usr/bin/env node
/**
 * Gate: homepage claims must match public-RPC ENS truth.
 *
 *   pnpm check:demo-ready
 *
 * Exit 1 ⇒ do not film, do not send cast to judges.
 */

import {
  createPublicClient,
  http,
  namehash,
  parseAbi,
} from "viem";
import { sepolia } from "viem/chains";

const RPC =
  process.env.PUBLIC_SEPOLIA_RPC?.trim() ||
  "https://ethereum-sepolia-rpc.publicnode.com";
const RESOLVER = "0xF479306621F718F7d76875f67506ceD33717751c";
const APP = process.env.PUBLIC_APP_URL?.trim() || "https://www.saviours.xyz";

const HERO = "0x935bfb495e33f74d2e9735df1da66ace442ede48";
const BOT = "0x352423e2fa5d5c99343d371c9e3bc56c87723cc7";
const CODE_CLASS = "code-75029d9a35bdb3d17149.saviours.eth";

const abi = parseAbi([
  "function text(bytes32 node, string key) view returns (string)",
]);

const client = createPublicClient({
  chain: sepolia,
  transport: http(RPC),
});

async function readText(name, key) {
  return client.readContract({
    address: RESOLVER,
    abi,
    functionName: "text",
    args: [namehash(name), key],
  });
}

async function main() {
  let fail = 0;
  console.log(`Public RPC: ${RPC}`);

  const expect = [
    [`${HERO}.saviours.eth`, "saviours.status", "TAINTED"],
    [`${HERO}.saviours.eth`, "saviours.verdict", "TAINTED"],
    [CODE_CLASS, "saviours.status", "TAINTED"],
    [CODE_CLASS, "saviours.classSeed", HERO],
    [`${BOT}.saviours.eth`, "saviours.status", "WATCH"],
  ];

  for (const [name, key, want] of expect) {
    let got = "";
    try {
      got = await readText(name, key);
    } catch (e) {
      console.log(
        `FAIL  ${name} ${key}  error=${e instanceof Error ? e.message : e}`,
      );
      fail++;
      continue;
    }
    const ok = String(got) === want;
    if (!ok) fail++;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${name} ${key} = ${JSON.stringify(got)} (want ${want})`,
    );
  }

  try {
    const res = await fetch(`${APP.replace(/\/$/, "")}/api/shield/check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chainId: 1,
        address: HERO,
        registryNetwork: "sepolia",
      }),
    });
    const json = await res.json();
    const check = json.check ?? json;
    const reason = String(check.reason ?? "");
    const cloneBad = /clone|first sighting/i.test(reason);
    const ok = check.decision === "BLOCK" && !cloneBad;
    if (!ok) fail++;
    console.log(
      `${ok ? "PASS" : "FAIL"}  shield hero decision=${check.decision} cascadeLayer=${check.cascadeLayer ?? "none"} reason=${JSON.stringify(reason).slice(0, 140)}`,
    );
  } catch (e) {
    fail++;
    console.log(
      `FAIL  shield check unreachable: ${e instanceof Error ? e.message : e}`,
    );
  }

  try {
    const res = await fetch(`${APP.replace(/\/$/, "")}/api/incidents`);
    const json = await res.json();
    const incidents = json.incidents ?? [];
    const graph = incidents.filter((i) => i.proof === "graph");
    const hero = incidents.find(
      (i) => (i.address || "").toLowerCase() === HERO,
    );
    const graphOk = graph.length >= 2;
    const heroNamed =
      hero &&
      (hero.ensStatus === "TAINTED" || hero.registered === true);
    if (!graphOk) fail++;
    if (!heroNamed) fail++;
    console.log(
      `${graphOk ? "PASS" : "FAIL"}  Graph-verified count = ${graph.length} (want ≥2)`,
    );
    console.log(
      `${heroNamed ? "PASS" : "FAIL"}  hero ensStatus=${JSON.stringify(hero?.ensStatus)} registered=${hero?.registered}`,
    );
  } catch (e) {
    fail++;
    console.log(
      `FAIL  /api/incidents: ${e instanceof Error ? e.message : e}`,
    );
  }

  // False-positive guard — Vitalik must never resolve as threat memory
  const VITALIK = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";
  try {
    const res = await fetch(`${APP.replace(/\/$/, "")}/api/shield/check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chainId: 1,
        address: VITALIK,
        registryNetwork: "sepolia",
      }),
    });
    const json = await res.json();
    const check = json.check ?? json;
    const ok =
      check.decision === "ESCALATE" || check.decision === "ALLOW";
    const notBlock = check.decision !== "BLOCK" && check.decision !== "WARN";
    if (!ok || !notBlock) fail++;
    console.log(
      `${ok && notBlock ? "PASS" : "FAIL"}  Vitalik denylist decision=${check.decision} (want ESCALATE, never BLOCK/WARN)`,
    );
  } catch (e) {
    fail++;
    console.log(
      `FAIL  Vitalik shield: ${e instanceof Error ? e.message : e}`,
    );
  }

  if (fail) {
    console.log(`\n${fail} FAILURE(S) — do not record the demo.`);
    console.log("If hero is WATCH: pnpm restore:attack1  (never dispute ATTACK-1 again)");
    process.exit(1);
  }
  console.log("\nAll demo-ready assertions PASS.");
  console.log("Film next: DEMO_CUE · Hook BLOCK → cast → Loop → Registry (N·2 Graph) → Build → MEMORY HIT $0");
  console.log("Form next: Finalist + Graph/ENS/Bazantic · paste SUBMISSION-PASTE · Bazantic username · ≥2h early");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
