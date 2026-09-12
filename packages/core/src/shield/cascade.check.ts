/**
 * Unit-style checks for cascade class-seed vs clone wording.
 * Run: pnpm exec tsx packages/core/src/shield/cascade.check.ts
 */

import { classSeedFromRecords } from "./cascade";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function main() {
  const seed = "0x935bfb495e33f74d2e9735df1da66ace442ede48";
  assert(
    classSeedFromRecords({
      "saviours.classSeed": seed,
    }) === seed,
    "explicit classSeed",
  );
  assert(
    classSeedFromRecords({
      "saviours.threat": `CLONE_CLASS · seed ${seed}`,
    }) === seed,
    "legacy threat parse",
  );
  assert(
    classSeedFromRecords({
      "saviours.threat": "FLASHLOAN_ONE_SHOT",
    }) === null,
    "no seed",
  );
  console.log("cascade.check OK");
}

main();
