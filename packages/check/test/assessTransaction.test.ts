import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  assessAndExplain,
  assessTransaction,
} from "../src/assessTransaction.js";
import {
  computeSafeTxHash,
  computeSafeTxHashWithDomainName,
} from "../src/safeTxHash.js";
import type { Hex } from "../src/assessTypes.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

test("Safe 1.3+ hash differs from deprecated domain-name variant", () => {
  const raw = JSON.parse(
    readFileSync(join(root, "fixtures/safe/term-prop5-review.json"), "utf8"),
  );
  const safeTx = {
    to: raw.safeTx.to as Hex,
    value: BigInt(raw.safeTx.value),
    data: raw.safeTx.data as Hex,
    operation: raw.safeTx.operation as 0 | 1,
    safeTxGas: BigInt(raw.safeTx.safeTxGas),
    baseGas: BigInt(raw.safeTx.baseGas),
    gasPrice: BigInt(raw.safeTx.gasPrice),
    gasToken: raw.safeTx.gasToken as Hex,
    refundReceiver: raw.safeTx.refundReceiver as Hex,
    nonce: BigInt(raw.safeTx.nonce),
  };
  const correct = computeSafeTxHash({
    chainId: raw.chainId,
    safeAddress: raw.safeAddress,
    safeVersion: raw.safeVersion,
    safeTx,
  });
  const legacy = computeSafeTxHashWithDomainName({
    chainId: raw.chainId,
    safeAddress: raw.safeAddress,
    safeVersion: raw.safeVersion,
    safeTx,
  });
  assert.notEqual(correct, legacy);
  assert.equal(correct.toLowerCase(), raw.expectedSafeTxHash.toLowerCase());
});

test("assessTransaction Term Safe fixture → WARN + MATCH via fixture hash", async () => {
  const raw = JSON.parse(
    readFileSync(join(root, "fixtures/safe/term-prop5-review.json"), "utf8"),
  );
  const safeTx = {
    to: raw.safeTx.to as Hex,
    value: BigInt(raw.safeTx.value),
    data: raw.safeTx.data as Hex,
    operation: raw.safeTx.operation as 0 | 1,
    safeTxGas: BigInt(raw.safeTx.safeTxGas),
    baseGas: BigInt(raw.safeTx.baseGas),
    gasPrice: BigInt(raw.safeTx.gasPrice),
    gasToken: raw.safeTx.gasToken as Hex,
    refundReceiver: raw.safeTx.refundReceiver as Hex,
    nonce: BigInt(raw.safeTx.nonce),
  };

  const result = await assessAndExplain({
    kind: "SAFE_TRANSACTION",
    chainId: raw.chainId,
    safeAddress: raw.safeAddress,
    safeVersion: raw.safeVersion,
    safeTx,
    expectedSafeTxHash: raw.expectedSafeTxHash as Hex,
  });

  assert.equal(result.integrity, "MATCH");
  assert.equal(result.decision, "WARN");
  const labels = result.actions.map((a) => a.selectorHint ?? "").join(" ");
  assert.match(labels, /setTxCooldown/i);
  assert.match(labels, /setTxExpiration/i);
  assert.match(labels, /enableModule/i);
  assert.ok(result.privilegeDiff.claims.length >= 2);
  assert.match(result.privilegeDiff.claims[0].after, /0/);
});

test("benign ERC20 transfer does not WARN", async () => {
  // transfer(address,uint256) selector 0xa9059cbb
  const data =
    "0xa9059cbb00000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000000000000000001" as Hex;
  const result = await assessTransaction({
    kind: "RAW_CALL",
    chainId: 1,
    to: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    value: 0n,
    data,
  });
  assert.equal(result.decision, "NO_VERDICT");
  assert.ok(
    result.actions.every(
      (a) => a.severity === "UNSUPPORTED" || a.severity === "INFO",
    ),
  );
});

test("unrelated selector bytes inside params do not invent CRITICAL", async () => {
  // transfer with ebb2b4a2 appearing inside address padding noise is still transfer
  const data =
    "0xa9059cbb000000000000000000000000ebb2b4a20000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001" as Hex;
  const result = await assessTransaction({
    kind: "RAW_CALL",
    chainId: 1,
    to: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    value: 0n,
    data,
  });
  assert.equal(result.decision, "NO_VERDICT");
  assert.ok(!result.actions.some((a) => a.severity === "CRITICAL"));
});

test("hash mismatch invalidates assessment", async () => {
  const result = await assessTransaction({
    kind: "SAFE_TRANSACTION",
    chainId: 1,
    safeAddress: "0x46DA347d1Db6EdCA62BF6Cd5892Dc284fC938613",
    safeTx: {
      to: "0x35C99CF4a5DF2D9bCd822BeE32676D9590229e33",
      value: 0n,
      data: "0xebb2b4a2",
      operation: 0,
      safeTxGas: 0n,
      baseGas: 0n,
      gasPrice: 0n,
      gasToken: "0x0000000000000000000000000000000000000000",
      refundReceiver: "0x0000000000000000000000000000000000000000",
      nonce: 0n,
    },
    expectedSafeTxHash:
      "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
  });
  assert.equal(result.integrity, "MISMATCH");
  assert.equal(result.coverage, "ERROR");
  assert.equal(result.decision, "NO_VERDICT");
});

test("NO_VERDICT never means SAFE — empty path stays unknown", async () => {
  const result = await assessTransaction({
    kind: "RAW_CALL",
    chainId: 1,
    to: "0x0000000000000000000000000000000000000001",
    value: 0n,
    data: "0x",
  });
  assert.equal(result.decision, "NO_VERDICT");
});
