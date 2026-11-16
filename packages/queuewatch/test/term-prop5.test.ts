import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { decodeTermLike } from "../src/index.js";
import { classifySelector } from "../src/severity.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

test("Term Prop 5 fixture expects CRITICAL cooldown/expiration/enableModule", () => {
  const fix = JSON.parse(
    readFileSync(join(root, "fixtures/queue/term-finance-prop5.json"), "utf8"),
  );
  assert.equal(fix.id, "term-finance-prop5");
  assert.equal(fix.references.createBlock, 25772694);
  assert.equal(fix.references.execBlock, 25816049);
  assert.equal(
    fix.subjects.vault.toLowerCase(),
    "0x26fcb50eec367ddab060ccf5e7394cecd95f7db2",
  );
  assert.equal(
    fix.subjects.zodiacDelay.toLowerCase(),
    "0x35c99cf4a5df2d9bcd822bee32676d9590229e33",
  );
  assert.ok(fix.raw.calldata?.includes("ebb2b4a2"));

  const decoded = decodeTermLike({
    rolesInner: [
      { to: "0xdelay", data: "0x", selectorHint: "setTxCooldown" },
      { to: "0xdelay", data: "0x", selectorHint: "setTxExpiration" },
      { to: "0xdelay", data: "0x", selectorHint: "enableModule" },
    ],
  });

  assert.equal(decoded.maxSeverity, "CRITICAL");
  assert.equal(decoded.vaultWrite, "WATCH");
  assert.ok(decoded.actions.every((a) => a.registryWrite !== "TAINTED_REQUIRES_ATTESTER"));
  const hints = decoded.actions.map((a) => a.selectorHint);
  assert.ok(hints.some((h) => h?.includes("setTxCooldown")));
  assert.ok(hints.some((h) => h?.includes("setTxExpiration")));
  assert.ok(hints.some((h) => h?.includes("enableModule")));
});

test("OZ-only path without Aragon/Roles is insufficient for Term acceptance text", () => {
  const fix = JSON.parse(
    readFileSync(join(root, "fixtures/queue/term-finance-prop5.json"), "utf8"),
  );
  const note = fix.decodeExpectations.find((x: unknown) =>
    String(x).includes("OZ-only"),
  );
  assert.ok(note);
});

test("DELEGATECALL alone is not auto-CRITICAL", () => {
  const { severity } = classifySelector("unknownFn", { operation: 1 });
  assert.notEqual(severity, "CRITICAL");
  assert.equal(severity, "HIGH");
});
