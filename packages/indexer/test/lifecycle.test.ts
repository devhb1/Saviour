import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hasRelevantCriticalOperation,
  onCancel,
  onExecute,
  onExpire,
  QUARANTINE_SECONDS,
  type Op,
} from "../src/lifecycle.js";
import { loadInitialQueues } from "../src/allowlist.js";
import { computeHealth } from "../src/health.js";

test("cancel B does not clear A", () => {
  const now = 1_700_000_000;
  let a: Op = {
    opKey: "a",
    state: "QUEUED",
    opExpiresAt: now + 1000,
    quarantineUntil: 0,
  };
  let b: Op = {
    opKey: "b",
    state: "QUEUED",
    opExpiresAt: now + 1000,
    quarantineUntil: 0,
  };
  b = onCancel(b);
  assert.equal(b.state, "CANCELLED");
  assert.equal(a.state, "QUEUED");
  assert.equal(hasRelevantCriticalOperation([a, b], now), true);
});

test("execute keeps quarantine relevance for 72h", () => {
  const now = 1_700_000_000;
  let op: Op = {
    opKey: "a",
    state: "QUEUED",
    opExpiresAt: now + 1000,
    quarantineUntil: 0,
  };
  op = onExecute(op, now);
  assert.equal(op.state, "EXECUTED_QUARANTINE");
  assert.equal(op.quarantineUntil, now + QUARANTINE_SECONDS);
  assert.equal(hasRelevantCriticalOperation([op], now + 10), true);
  assert.equal(
    hasRelevantCriticalOperation([op], now + QUARANTINE_SECONDS + 1),
    false,
  );
});

test("expired queued is not zombie", () => {
  const now = 1_700_000_000;
  let op: Op = {
    opKey: "a",
    state: "QUEUED",
    opExpiresAt: now - 1,
    quarantineUntil: 0,
  };
  assert.equal(hasRelevantCriticalOperation([op], now), false);
  op = onExpire(op, now);
  assert.equal(op.state, "EXPIRED");
});

test("initial-5 allowlist loads", () => {
  const rows = loadInitialQueues();
  assert.equal(rows.length, 5);
});

test("health stale when never updated", () => {
  const h = computeHealth({ lastProcessedBlock: null, updatedAtMs: null });
  assert.equal(h.stale, true);
});
