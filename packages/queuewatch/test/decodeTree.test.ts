import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  decodeExecutionTree,
  buildPrivilegeDiff,
  parsePackedTransactions,
} from "../src/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function packTx(op: 0 | 1, to: string, value: bigint, data: string): string {
  const opH = op.toString(16).padStart(2, "0");
  const toH = to.replace(/^0x/i, "").toLowerCase().padStart(40, "0");
  const valH = value.toString(16).padStart(64, "0");
  const body = data.replace(/^0x/i, "").toLowerCase();
  const lenH = (body.length / 2).toString(16).padStart(64, "0");
  return opH + toH + valH + lenH + body;
}

test("walk Term privileged prefix from bytes alone", () => {
  const data =
    "0xebb2b4a200000000000000000000000000000000000000000000000000000000000000009b56d5be0000000000000000000000000000000000000000000000000000000000000000610b59250000000000000000000000000ae12af3878a2d896f5c4dce3be7250fb187c0a6";
  const decoded = decodeExecutionTree({
    to: "0x35C99CF4a5DF2D9bCd822BeE32676D9590229e33",
    data,
  });
  assert.equal(decoded.maxSeverity, "CRITICAL");
  assert.equal(decoded.vaultWrite, "WATCH");
  const hints = decoded.actions.map((a) => a.selectorHint);
  assert.ok(hints.includes("setTxCooldown"));
  assert.ok(hints.includes("setTxExpiration"));
  assert.ok(hints.includes("enableModule"));
  assert.equal(decoded.actions[0].args?.[0], "0");
  const diff = buildPrivilegeDiff(decoded);
  assert.ok(diff.claims.length >= 3);
  assert.match(String(diff.claims[0].after), /^0/);
  assert.ok(diff.unknowns.length > 0);
});

test("MultiSend packed parser extracts inner privilege call", () => {
  const inner =
    "ebb2b4a20000000000000000000000000000000000000000000000000000000000000000";
  const packed =
    "0x" +
    packTx(
      0,
      "0x35C99CF4a5DF2D9bCd822BeE32676D9590229e33",
      0n,
      `0x${inner}`,
    );
  const parsed = parsePackedTransactions(packed);
  assert.equal(parsed.complete, true);
  assert.equal(parsed.txs.length, 1);
  assert.equal(parsed.txs[0].to.toLowerCase(), "0x35c99cf4a5df2d9bcd822bee32676d9590229e33");

  // multiSend(bytes) ABI: selector + offset 0x20 + length + packed
  const packedBody = packed.slice(2);
  const len = (packedBody.length / 2).toString(16).padStart(64, "0");
  const multi =
    "0x8d80ff0a" +
    "0000000000000000000000000000000000000000000000000000000000000020" +
    len +
    packedBody;

  const decoded = decodeExecutionTree({
    to: "0xSafeMultiSend",
    data: multi,
  });
  assert.ok(decoded.actions.some((a) => a.selectorHint === "setTxCooldown"));
  assert.equal(decoded.vaultWrite, "WATCH");
});

test("term-prop5-bytes-decode fixture discovers CRITICAL from bytes", () => {
  const fix = JSON.parse(
    readFileSync(join(root, "fixtures/queue/term-prop5-bytes-decode.json"), "utf8"),
  );
  const decoded = decodeExecutionTree({ to: fix.to, data: fix.data });
  const hints = decoded.actions.map((a) => a.selectorHint);
  for (const name of fix.mustDetect) {
    assert.ok(hints.includes(name), `missing ${name}`);
  }
  assert.equal(decoded.actions.find((a) => a.selectorHint === "setTxCooldown")?.args?.[0], "0");
  assert.ok(fix.honesty.length > 0);
});

test("truncated MultiSend packed bytes mark incomplete coverage", () => {
  const inner =
    "ebb2b4a20000000000000000000000000000000000000000000000000000000000000000";
  const good =
    packTx(0, "0x35C99CF4a5DF2D9bCd822BeE32676D9590229e33", 0n, `0x${inner}`);
  // Append garbage so not all bytes are consumed as a valid packed tx
  const truncated = "0x" + good + "dead";
  const parsed = parsePackedTransactions(truncated);
  assert.equal(parsed.complete, false);
  assert.ok(parsed.remainingHex.length > 0);
  assert.equal(parsed.txs.length, 1);
});

test("ERC20 transfer is UNSUPPORTED not privilege WATCH", () => {
  const data =
    "0xa9059cbb00000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000000000000000001";
  const decoded = decodeExecutionTree({
    to: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    data,
  });
  assert.equal(decoded.vaultWrite, "NONE");
  assert.ok(decoded.actions.every((a) => a.severity === "UNSUPPORTED"));
});
