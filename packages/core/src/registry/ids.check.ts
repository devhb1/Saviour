/**
 * Unit gate for registry id helpers — no RPC required.
 * Run: pnpm check:registry-ids
 *
 * Proves hash helpers are stable and map into on-chain-sized bytes32 values
 * before we spend gas on Anvil/Sepolia.
 */

import {
  confidenceBucket,
  evidenceHashFrom,
  fingerprintBytes,
  incidentIdBytes,
} from "./ids";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const id1 = incidentIdBytes("SAV-ETH-0001");
const id2 = incidentIdBytes("SAV-ETH-0001");
assert(id1 === id2, "incidentId must be deterministic");
assert(/^0x[a-f0-9]{64}$/.test(id1), "incidentId must be bytes32 hex");

const fp = fingerprintBytes(
  { behaviorHash: "0x" + "ab".repeat(32) },
  "seed",
);
assert(/^0x[a-f0-9]{64}$/.test(fp), "fingerprint must be bytes32");

const ev = evidenceHashFrom([
  {
    id: "a",
    source: "unit",
    reference: "r",
    claim: "c",
    timestamp: 1,
    rawHash: "aa".repeat(32),
  },
  {
    id: "b",
    source: "unit",
    reference: "r2",
    claim: "c2",
    timestamp: 2,
    rawHash: "bb".repeat(32),
  },
]);
assert(/^0x[a-f0-9]{64}$/.test(ev), "evidenceHash must be bytes32");
assert(confidenceBucket(0.91) === 91, "confidence bucket mapping");
assert(confidenceBucket(1.5) === 100, "confidence clamp high");
assert(confidenceBucket(-1) === 0, "confidence clamp low");

console.log("ok: registry id helpers");
