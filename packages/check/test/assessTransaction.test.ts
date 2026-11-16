import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { assessTransaction } from "../src/assessTransaction.js";
import {
  computeSafeTxHashWithDomainName,
  extractSelectorHints,
  selectorLabel,
} from "../src/safeTxHash.js";
import type { Hex } from "../src/assessTypes.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

test("extractSelectorHints finds Term privileged selectors", () => {
  const data =
    "0xebb2b4a200000000000000000000000000000000000000000000000000000000000000009b56d5be0000000000000000000000000000000000000000000000000000000000000000610b5925" as Hex;
  const hints = extractSelectorHints(data).map(selectorLabel);
  assert.ok(hints.includes("setTxCooldown"));
  assert.ok(hints.includes("setTxExpiration"));
  assert.ok(hints.includes("enableModule"));
});

test("assessTransaction Term Safe fixture → WARN", async () => {
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
  const hash = computeSafeTxHashWithDomainName({
    chainId: raw.chainId,
    safeAddress: raw.safeAddress,
    safeVersion: raw.safeVersion,
    safeTx,
  });

  const result = await assessTransaction({
    kind: "SAFE_TRANSACTION",
    chainId: raw.chainId,
    safeAddress: raw.safeAddress,
    safeVersion: raw.safeVersion,
    safeTx,
    expectedSafeTxHash: hash,
  });

  assert.equal(result.integrity, "MATCH");
  assert.equal(result.decision, "WARN");
  assert.notEqual(result.decision, "NO_VERDICT");
  const labels = result.actions.map((a) => a.selectorHint ?? "").join(" ");
  assert.match(labels, /setTxCooldown|0xebb2b4a2/i);
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
  assert.ok(result.coverage === "PARTIAL" || result.coverage === "COMPLETE");
});
