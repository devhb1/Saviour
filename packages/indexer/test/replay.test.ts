import assert from "node:assert/strict";
import { test } from "node:test";
import { replayTermCritical } from "../src/poll.js";
import { loadTip } from "../src/store.js";

test("replayTermCritical stores CRITICAL alert with English summary", async () => {
  const alert = await replayTermCritical();
  assert.equal(alert.severity, "CRITICAL");
  assert.match(alert.summary, /delay|module|privilege/i);
  assert.ok(alert.bullets.length >= 2);
  assert.ok(alert.reviewPath.includes("/review"));
  const tip = loadTip(1);
  assert.ok(tip.alerts.some((a) => a.id === alert.id));
  assert.ok(tip.updatedAtMs != null);
});
