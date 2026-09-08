/**
 * One-shot: generate INVESTIGATOR + DISPUTER EOAs into repo-root .env.
 * Prints addresses only (never commit .env).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const envPath = resolve(process.cwd(), ".env");
if (!existsSync(envPath)) throw new Error("missing .env at repo root");

let env = readFileSync(envPath, "utf8");

function upsert(key: string, value: string) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(env)) env = env.replace(re, line);
  else {
    if (!env.endsWith("\n")) env += "\n";
    env += `${line}\n`;
  }
}

const invPk = generatePrivateKey();
const disPk = generatePrivateKey();
const inv = privateKeyToAccount(invPk);
const dis = privateKeyToAccount(disPk);

upsert("INVESTIGATOR_PRIVATE_KEY", invPk);
upsert("DISPUTER_PRIVATE_KEY", disPk);
writeFileSync(envPath, env);

const exPath = resolve(process.cwd(), ".env.example");
if (existsSync(exPath)) {
  let ex = readFileSync(exPath, "utf8");
  for (const k of ["INVESTIGATOR_PRIVATE_KEY", "DISPUTER_PRIVATE_KEY"]) {
    if (!new RegExp(`^${k}=`, "m").test(ex)) {
      if (!ex.endsWith("\n")) ex += "\n";
      ex += `${k}=\n`;
    }
  }
  writeFileSync(exPath, ex);
}

console.log("Wrote keys to .env (do not commit)\n");
console.log("INVESTIGATOR address (fund ~0.05 Sepolia ETH):");
console.log(inv.address);
console.log("\nDISPUTER address (fund ~0.05 Sepolia ETH):");
console.log(dis.address);
