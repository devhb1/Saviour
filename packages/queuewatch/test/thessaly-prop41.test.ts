import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { decodeTermLike } from "../src/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

test("Thessaly Prop 41 fixture: updateDelay(0) is CRITICAL → vault WATCH", () => {
  const fix = JSON.parse(
    readFileSync(join(root, "fixtures/queue/thessaly-prop41.json"), "utf8"),
  );
  assert.equal(fix.id, "thessaly-prop41");
  assert.equal(fix.references.fundsMoved, false);

  const decoded = decodeTermLike({
    aragonActions: [{ to: "0xqueue", data: "0x", selectorHint: "updateDelay" }],
  });
  assert.equal(decoded.maxSeverity, "CRITICAL");
  assert.equal(decoded.vaultWrite, "WATCH");
});
