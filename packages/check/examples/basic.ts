import { check, castCommand, guard } from "@saviours/check";

const ATTACK_1 = "0x935bfb495e33f74d2e9735df1da66ace442ede48";

const r = await check(ATTACK_1);
console.log(r);
// { decision: "BLOCK", status: "TAINTED", source: "ens", cost: { graph: 0, ai: 0, usd: 0 }, … }

console.log(castCommand(ATTACK_1));

try {
  await guard(ATTACK_1);
} catch (e) {
  console.error(String(e));
}
