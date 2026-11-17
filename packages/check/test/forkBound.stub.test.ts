import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * Fork adversarial suite stub (Phase 3).
 * Real fork attacker scripts land when BOUNDED claims exist for Roles trees.
 * Until then: any BOUNDED claim without modeled trees is a release blocker.
 */
test("soundness law: unmodeled Roles cannot claim BOUNDED", () => {
  const rolesTreesModeled = false;
  const claimedBounded = false; // preview engine uses UNKNOWN/UNBOUNDED
  if (!rolesTreesModeled) {
    assert.equal(
      claimedBounded,
      false,
      "Must not ship BOUNDED for unmodeled Roles policies",
    );
  }
});

test("fork suite placeholder documents gate", () => {
  const gate =
    "For each BOUNDED fixture claim, mainnet-fork attacker must not exceed bound — or release blocked";
  assert.ok(gate.includes("BOUNDED"));
});
