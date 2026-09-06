import { normalizeEvidence } from "./normalize";

const sample = normalizeEvidence({
  source: "thegraph:uniswap-v3",
  reference: "spike-fixture",
  claim: "Fixture swap observed",
  timestamp: 1_700_000_000,
  blockRange: { from: 1, to: 2 },
  raw: { id: "0xabc", amountUSD: "1.0" },
});

const required = ["id", "source", "reference", "claim", "timestamp", "rawHash"] as const;
for (const key of required) {
  if (sample[key] === undefined || sample[key] === "") {
    throw new Error(`normalizeEvidence missing ${key}`);
  }
}
if (sample.rawHash.length !== 64) {
  throw new Error("rawHash must be sha256 hex");
}

console.log("ok: normalizeEvidence", sample.id);
