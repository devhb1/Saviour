import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateTopologyPatterns } from "../src/authority/patterns.js";
import { checkIntent, parseIntentJson } from "../src/intent/checkIntent.js";
import type { ReachReport } from "../src/authority/verdict.js";
import type { Hex } from "../src/assessTypes.js";

test("free recipient pattern forces UNBOUNDED", () => {
  const hits = evaluateTopologyPatterns({
    safeAddress: "0x595362a906a0b4e90aee1430b1f80fdde2be80de" as Hex,
    hasRolesModule: true,
    hasDelay: false,
    directModulesBypassDelay: false,
    freeRecipientTransferSuspected: true,
  });
  assert.ok(hits.some((h) => h.id === "pattern:free-recipient"));
  assert.equal(
    hits.find((h) => h.id === "pattern:free-recipient")?.forcesVerdict,
    "UNBOUNDED",
  );
});

test("intent rejects USD fields", () => {
  assert.throws(() =>
    parseIntentJson({
      safe: "0x46DA347d1Db6EdCA62BF6Cd5892Dc284fC938613",
      chain: 1,
      role: "keeper",
      may_call: [],
      must_not: [],
      max_value_usd_per_day: 1,
    }),
  );
});

test("intent fails closed on UNBOUNDED role member", () => {
  const intent = parseIntentJson({
    safe: "0x595362A906a0B4e90AEe1430b1f80FDDe2bE80de",
    chain: 1,
    role: "keeper-bot",
    may_call: [
      {
        target: "AaveV3Pool",
        functions: ["supply", "withdraw"],
        recipient: "must_equal_safe",
        max_amount: { token: "USDC", per_day: "1000000000" },
      },
    ],
    must_not: ["delegatecall", "call_to_self"],
  });
  const reach: ReachReport = {
    engineVersion: "test",
    rolesModelVersion: "test",
    principals: [
      {
        principalId: "role-member:0x065f",
        principal: "0x065f395147fc72747c7f48f67f039d4235884148" as Hex,
        kind: "role_member",
        verdict: "UNBOUNDED",
        bounds: [],
        reasons: ["test"],
        patterns: ["pattern:free-recipient"],
      },
    ],
  };
  const result = checkIntent(intent, reach);
  assert.equal(result.ok, false);
  assert.equal(result.status, "FAIL");
  assert.ok(result.breaks.length >= 1);
});

test("intent INCONCLUSIVE on UNKNOWN when requireKnown", () => {
  const intent = parseIntentJson({
    safe: "0x595362A906a0B4e90AEe1430b1f80FDDe2bE80de",
    chain: 1,
    role: "keeper-bot",
    may_call: [
      {
        target: "AaveV3Pool",
        functions: ["supply"],
        recipient: "must_equal_safe",
      },
    ],
    must_not: ["delegatecall"],
  });
  const reach: ReachReport = {
    engineVersion: "test",
    rolesModelVersion: "test",
    principals: [
      {
        principalId: "role-member:0x065f",
        principal: "0x065f395147fc72747c7f48f67f039d4235884148" as Hex,
        kind: "role_member",
        verdict: "UNKNOWN",
        bounds: [],
        reasons: ["trees unread"],
        patterns: [],
      },
    ],
  };
  const result = checkIntent(intent, reach, { requireKnown: true });
  assert.equal(result.ok, false);
  assert.equal(result.status, "INCONCLUSIVE");
  assert.ok(result.breaks.some((b) => b.rule === "INCONCLUSIVE_UNKNOWN"));
});
