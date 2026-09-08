import { normalizeEvidence } from "./normalize";

const sample = normalizeEvidence({
  source: "thegraph:uniswap-v3",
  reference: "spike-fixture",
  claim: "Fixture swap observed",
  timestamp: 1_700_000_000,
  blockRange: { from: 1, to: 2 },
  raw: { id: "0xabc", amountUSD: "1.0" },
  subgraphId: "4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6",
  protocol: "uniswap-v3",
  schema: "dex-amm-ext 4.0.0",
  kind: "swap",
  txHash: "0xabc",
  block: 18_000_000,
  amountUSD: 1.0,
  counterparty: "0x0000000000000000000000000000000000000001",
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

const structured = [
  "subgraphId",
  "protocol",
  "schema",
  "kind",
  "txHash",
  "block",
  "amountUSD",
  "counterparty",
] as const;
for (const key of structured) {
  if (sample[key] === undefined || sample[key] === "") {
    throw new Error(`normalizeEvidence missing structured field ${key}`);
  }
}

const minimal = normalizeEvidence({
  source: "thegraph:aave-v3",
  reference: "minimal",
  claim: "legacy shape still works",
  timestamp: 1,
  raw: { ok: true },
});
if (minimal.protocol !== undefined) {
  throw new Error("optional structured fields must stay undefined when omitted");
}

console.log("ok: normalizeEvidence", sample.id);
