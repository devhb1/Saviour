import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPrivilegeDiff, decodeExecutionTree } from "../src/index.js";

test("on-chain cooldown 0 is not treated as unread UNKNOWN", () => {
  const decoded = decodeExecutionTree({
    to: "0x35C99CF4a5DF2D9bCd822BeE32676D9590229e33",
    data: "0xebb2b4a20000000000000000000000000000000000000000000000000000000000000000",
  });
  const diff = buildPrivilegeDiff(decoded, {
    txCooldown: "0",
    txExpiration: "0",
    modules: ["0xabc"],
  });
  const cooldown = diff.claims.find((c) => c.control.includes("cooldown"));
  assert.ok(cooldown);
  assert.equal(cooldown!.before, "0");
  assert.equal(cooldown!.source, "rpc-read");
  assert.ok(!diff.unknowns.some((u) => u.includes("cooldown unread")));
});
