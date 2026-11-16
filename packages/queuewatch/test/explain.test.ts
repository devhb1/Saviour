import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeTermLike, explainPrivilege } from "../src/index.js";

test("Term privilege path explains delay collapse + module enable in English", () => {
  const decoded = decodeTermLike({
    rolesInner: [
      { to: "0xdelay", data: "0x", selectorHint: "setTxCooldown" },
      { to: "0xdelay", data: "0x", selectorHint: "setTxExpiration" },
      { to: "0xdelay", data: "0x", selectorHint: "enableModule" },
    ],
  });
  const exp = explainPrivilege(decoded);
  assert.ok(exp.privilegeClasses.includes("delay_collapse"));
  assert.ok(exp.privilegeClasses.includes("module_surface"));
  assert.match(exp.summary, /delay|module|privilege/i);
  assert.ok(exp.bullets.length >= 3);
  assert.ok(exp.bullets.some((b) => /cooldown|delay/i.test(b)));
  assert.ok(exp.bullets.some((b) => /module/i.test(b)));
});
