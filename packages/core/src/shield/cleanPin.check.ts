/**
 * Gate: known-clean addresses must NEVER be Shield BLOCK / TAINTED memory.
 *
 *   pnpm check:clean-pin
 *
 * Pins:
 *   - Vitalik 0xd8da…6045 → ESCALATE (purged false positive)
 *   - Circle USDC Treasury BENIGN-1 → ESCALATE (no named incident)
 *   - Random unnamed → ESCALATE
 */

import { randomBytes } from "node:crypto";
import { loadRootEnv } from "../config/env";
import { checkTarget } from "../shield/check";

loadRootEnv();

const VITALIK = "0xd8da6BF26964aF9D7eEd9e03E53415D37aA96045";
const CIRCLE = "0x55fe002aeff02f77364de339a1292923a15844b8"; // BENIGN-1

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function expectEscalate(
  label: string,
  address: string,
): Promise<void> {
  const r = await checkTarget({
    targetChainId: 1,
    address,
    registryNetwork: "sepolia",
  });
  console.log(label, {
    decision: r.decision,
    source: r.source,
    usedAi: r.usedAi,
  });
  assert(r.decision === "ESCALATE", `${label}: want ESCALATE got ${r.decision}`);
  assert(r.source === "none", `${label}: want source=none got ${r.source}`);
  assert(r.usedAi === false, `${label}: Shield must not use AI`);
}

async function main() {
  console.log("check:clean-pin — known-clean must ESCALATE\n");

  await expectEscalate("Vitalik", VITALIK);
  await expectEscalate("Circle BENIGN-1", CIRCLE);

  const random = `0x${randomBytes(20).toString("hex")}`;
  await expectEscalate("random unnamed", random);

  console.log("\nok: check:clean-pin (Vitalik · Circle · random)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
