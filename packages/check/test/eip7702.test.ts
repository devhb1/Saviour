import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseEofDelegationCode,
  simulateAuthorizationList,
} from "../src/eip7702.js";
import { toDecision } from "../src/baseResolve.js";

test("auth-list: last valid wins; zero clears; wrong chain skipped", () => {
  const implA = "0x1111111111111111111111111111111111111111" as const;
  const implB = "0x2222222222222222222222222222222222222222" as const;
  const zero = "0x0000000000000000000000000000000000000000" as const;

  let r = simulateAuthorizationList(
    [
      { chainId: 1, address: implA, nonce: 0 },
      { chainId: 8453, address: implB, nonce: 1 },
    ],
    1,
  );
  assert.equal(r.impl, implA);

  r = simulateAuthorizationList(
    [
      { chainId: 0, address: implA, nonce: 0 },
      { chainId: 0, address: zero, nonce: 1 },
    ],
    1,
  );
  assert.equal(r.impl, null);
  assert.equal(r.cleared, true);
});

test("parse 0xef0100 delegation code", () => {
  const impl = "454d03b2a1d52f5f7aaba8e352225335a1b724e8";
  const code = `0xef0100${impl}`;
  assert.equal(parseEofDelegationCode(code), `0x${impl}`);
});

test("NO_VERDICT never maps to ALLOW", () => {
  assert.equal(toDecision("NO_VERDICT"), "ESCALATE");
  assert.equal(toDecision("RPC_ERROR"), "ESCALATE");
  assert.equal(toDecision("WARN"), "WARN");
  assert.equal(toDecision("BLOCK"), "BLOCK");
});
