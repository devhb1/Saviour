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
  const cooldown = diff.claims.find((c) =>
    /cooldown/i.test(c.control),
  );
  assert.ok(cooldown);
  assert.equal(cooldown!.before, "0");
  assert.equal(cooldown!.source, "rpc-read");
  assert.ok(!diff.unknowns.some((u) => u.includes("cooldown unread")));
});

test("enableModule before-state uses the receiving contract module list", () => {
  const delay = "0x35c99cf4a5df2d9bcd822bee32676d9590229e33";
  const newMod = "0xd9dde54d99a27f0f0e2b282369bfaa95528e9b75";
  // enableModule(newMod) calldata
  const data =
    "0x610b5925000000000000000000000000d9dde54d99a27f0f0e2b282369bfaa95528e9b75";
  const decoded = decodeExecutionTree({ to: delay, data });
  const diff = buildPrivilegeDiff(decoded, {
    delay,
    safeModules: [],
    delayModules: [],
    safeModuleReadStatus: "ok",
    delayModuleReadStatus: "ok",
  });
  const claim = diff.claims.find((c) => /module/i.test(c.control));
  assert.ok(claim);
  assert.equal(claim!.before, "not enabled");
  assert.match(claim!.evidence, /on 0x35c99c/i);

  const already = buildPrivilegeDiff(decoded, {
    delay,
    safeModules: [],
    delayModules: [newMod],
    safeModuleReadStatus: "ok",
    delayModuleReadStatus: "ok",
  });
  assert.equal(
    already.claims.find((c) => /module/i.test(c.control))!.before,
    "already enabled",
  );
});
