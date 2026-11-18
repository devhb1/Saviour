import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  evaluateAuthorityFindings,
  ownerInventoryValid,
  ownerSetPrincipal,
  unreadModulePrincipal,
} from "../src/authority/findings.js";
import { deriveAuditStatus } from "../src/authority/auditStatus.js";
import {
  classifyDelayIdentity,
  eip1167Impl,
} from "../src/authority/delayAdapter.js";
import { buildCapabilityGraph, rolesProbeCandidates } from "../src/authority/executionPaths.js";
import type { Hex } from "../src/assessTypes.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

test("bypass finding when Delay + direct module coexist", () => {
  const safeAddr = "0x46da347d1db6edca62bf6cd5892dc284fc938613" as Hex;
  const delayAddr = "0x35c99cf4a5df2d9bcd822bee32676d9590229e33" as Hex;
  const other = "0xd9dde54d99a27f0f0e2b282369bfaa95528e9b75" as Hex;
  const graph = buildCapabilityGraph({
    safe: {
      address: safeAddr,
      version: "1.3.0",
      owners: ["0x000000000000000000000000000000000000dead" as Hex],
      threshold: 1,
      modules: [delayAddr, other],
      guard: null,
      fallbackHandler: null,
    },
    delays: [
      {
        address: delayAddr,
        txCooldown: "0",
        txExpiration: "0",
        avatar: safeAddr,
        target: safeAddr,
        modules: [],
        looksLikeDelay: true,
      },
    ],
    modules: [
      {
        address: delayAddr,
        avatar: safeAddr,
        target: safeAddr,
        looksLikeDelay: true,
        looksLikeRolesProxy: false,
      },
      {
        address: other,
        avatar: safeAddr,
        target: safeAddr,
        looksLikeDelay: false,
        looksLikeRolesProxy: true,
      },
    ],
  });
  const findings = evaluateAuthorityFindings(graph);
  assert.ok(findings.some((f) => f.rule === "DELAY_BYPASS_PATH"));
  assert.ok(findings.some((f) => f.rule === "DELAY_COOLDOWN_ZERO"));
  assert.ok(findings.some((f) => f.rule === "DIRECT_SAFE_MODULE"));
});

test("reference fixture addresses are well-formed", () => {
  const raw = JSON.parse(
    readFileSync(join(root, "fixtures/authority/reference-safe.json"), "utf8"),
  );
  assert.equal(raw.chainId, 1);
  assert.match(raw.safeAddress, /^0x[a-fA-F0-9]{40}$/);
  assert.match(raw.delay.address, /^0x[a-fA-F0-9]{40}$/);
});

test("Roles enabled only on a Delay is a probe candidate, not a direct Safe module", () => {
  const safeAddr = "0x46da347d1db6edca62bf6cd5892dc284fc938613" as Hex;
  const delayAddr = "0x35c99cf4a5df2d9bcd822bee32676d9590229e33" as Hex;
  const rolesOnDelay = "0x1457bd2063bed3fc38276cf644b50ae52e8dfed" as Hex;
  const delays = [
    {
      address: delayAddr,
      txCooldown: "0",
      txExpiration: "0",
      avatar: safeAddr,
      target: safeAddr,
      modules: [rolesOnDelay],
      looksLikeDelay: true,
    },
  ];
  const safeProbes = [
    {
      address: delayAddr,
      avatar: safeAddr,
      target: safeAddr,
      looksLikeDelay: true,
      looksLikeRolesProxy: false,
    },
  ];
  assert.deepEqual(rolesProbeCandidates(safeProbes, delays), [rolesOnDelay]);
  const graph = buildCapabilityGraph({
    safe: {
      address: safeAddr,
      version: "1.3.0",
      owners: ["0x000000000000000000000000000000000000dead" as Hex],
      threshold: 1,
      modules: [delayAddr],
      guard: null,
      fallbackHandler: null,
    },
    delays,
    modules: safeProbes,
  });
  assert.ok(
    graph.edges.some((e) => e.id === `delay-mod:${delayAddr}:${rolesOnDelay}`),
  );
  assert.equal(
    graph.edges.some((e) => e.id === `direct:${rolesOnDelay}`),
    false,
  );
  assert.ok(graph.nodes.some((n) => n.id === `module:${rolesOnDelay}`));
});

test("failed owner read is UNKNOWN, not UNBOUNDED", () => {
  const unread = ownerSetPrincipal([], null, { ownersRead: "failed" });
  assert.equal(unread.verdict, "UNKNOWN");
  assert.ok(unread.reasons.some((r) => /getOwners failed/i.test(r)));
});

test("empty or invalid owner inventory is UNKNOWN, not UNBOUNDED", () => {
  const empty = ownerSetPrincipal([], 1, {
    ownersRead: "ok",
    thresholdRead: "ok",
  });
  assert.equal(empty.verdict, "UNKNOWN");
  assert.ok(empty.patterns.includes("pattern:owners-invalid"));

  const over = ownerSetPrincipal(
    ["0xabc0000000000000000000000000000000000001"],
    2,
    { ownersRead: "ok", thresholdRead: "ok" },
  );
  assert.equal(over.verdict, "UNKNOWN");

  const zeroThresh = ownerSetPrincipal(
    ["0xabc0000000000000000000000000000000000001"],
    0,
    { ownersRead: "ok", thresholdRead: "ok" },
  );
  assert.equal(zeroThresh.verdict, "UNKNOWN");

  assert.equal(ownerInventoryValid([], 1).ok, false);
  assert.equal(
    ownerInventoryValid(["0xabc0000000000000000000000000000000000001"], 1).ok,
    true,
  );
});

test("deriveAuditStatus: snapshot failure is INCONCLUSIVE, not success", () => {
  assert.equal(
    deriveAuditStatus({
      errors: ["RPC request failed"],
      freshness: null,
      graph: null,
      findings: [],
      reach: { engineVersion: "t", rolesModelVersion: "t", principals: [] },
      coverage: {
        complete: false,
        components: [],
        gaps: [{ area: "snapshot", reason: "failed" }],
        reconstructed: [],
      },
    }),
    "INCONCLUSIVE",
  );
  assert.equal(
    deriveAuditStatus({
      errors: ["chainId must be 1"],
      freshness: null,
      graph: null,
      findings: [],
      reach: { engineVersion: "t", rolesModelVersion: "t", principals: [] },
      coverage: {
        complete: false,
        components: [],
        gaps: [],
        reconstructed: [],
      },
    }),
    "INVALID_INPUT",
  );
  assert.equal(
    deriveAuditStatus({
      errors: [],
      freshness: {
        chainId: 1,
        blockNumber: "1",
        blockHash: ("0x" + "ab".repeat(32)) as Hex,
      },
      graph: null,
      findings: [],
      reach: { engineVersion: "t", rolesModelVersion: "t", principals: [] },
      coverage: {
        complete: false,
        components: [],
        gaps: [{ area: "roles", reason: "partial" }],
        reconstructed: [],
      },
    }),
    "PARTIAL",
  );
});

test("safe.identity gap is INCONCLUSIVE even when a graph object exists", () => {
  assert.equal(
    deriveAuditStatus({
      errors: ["Address is not a supported Safe at this block (VERSION unread)"],
      freshness: {
        chainId: 1,
        blockNumber: "1",
        blockHash: ("0x" + "ab".repeat(32)) as Hex,
      },
      graph: {} as never,
      findings: [],
      reach: { engineVersion: "t", rolesModelVersion: "t", principals: [] },
      coverage: {
        complete: false,
        components: [],
        gaps: [
          {
            area: "safe.identity",
            reason: "VERSION() failed",
          },
        ],
        reconstructed: [],
      },
    }),
    "INCONCLUSIVE",
  );
});

test("eip1167Impl requires the full 45-byte minimal-proxy runtime", () => {
  const impl = "824175b945838d127c1ca83cbce11d8e44f6df01";
  const valid =
    `0x363d3d373d3d3d363d73${impl}5af43d82803e903d91602b57fd5bf3` as Hex;
  assert.equal(eip1167Impl(valid), `0x${impl}`);
  // Substring inside a larger blob must not match.
  assert.equal(eip1167Impl(`0xdead${valid.slice(2)}beef` as Hex), null);
  assert.equal(eip1167Impl("0x363d3d373d3d3d363d73" as Hex), null);
});

test("Delay identity: cooldown alone is suspected; only known mastercopy verifies", () => {
  assert.equal(
    classifyDelayIdentity({
      cooldownReadable: true,
      implementation: null,
      avatar: null,
      target: null,
    }),
    "suspected",
  );
  assert.equal(
    classifyDelayIdentity({
      cooldownReadable: false,
      implementation: null,
      avatar: null,
      target: null,
    }),
    "unsupported",
  );
  assert.equal(
    classifyDelayIdentity({
      cooldownReadable: true,
      implementation: "0x824175b945838d127c1ca83cbce11d8e44f6df01",
      avatar: "0x46da347d1db6edca62bf6cd5892dc284fc938613",
      target: "0x46da347d1db6edca62bf6cd5892dc284fc938613",
    }),
    "verified",
  );
  assert.equal(
    classifyDelayIdentity({
      cooldownReadable: true,
      implementation: null,
      avatar: "0x46da347d1db6edca62bf6cd5892dc284fc938613",
      target: "0x46da347d1db6edca62bf6cd5892dc284fc938613",
    }),
    "suspected",
  );
});

test("generic Safe module is an UNKNOWN principal; Roles is skipped", () => {
  const other = "0xd9dde54d99a27f0f0e2b282369bfaa95528e9b75" as Hex;
  const roles = "0x1457bd2063bed3fc38276cf644b50ae52e8dfed" as Hex;
  const delay = "0x35c99cf4a5df2d9bcd822bee32676d9590229e33" as Hex;
  const generic = unreadModulePrincipal(
    {
      address: other,
      avatar: null,
      target: null,
      looksLikeDelay: false,
      looksLikeRolesProxy: false,
    },
    "safe",
  );
  assert.ok(generic);
  assert.equal(generic.verdict, "UNKNOWN");
  assert.equal(generic.principalId, `module:${other}`);
  assert.equal(
    unreadModulePrincipal(
      {
        address: roles,
        avatar: null,
        target: null,
        looksLikeDelay: false,
        looksLikeRolesProxy: true,
      },
      "safe",
    ),
    null,
  );
  const delayRow = unreadModulePrincipal(
    {
      address: delay,
      avatar: null,
      target: null,
      looksLikeDelay: true,
      looksLikeRolesProxy: false,
      delayIdentity: "verified",
    },
    "safe",
  );
  assert.ok(delayRow);
  assert.equal(delayRow.verdict, "UNKNOWN");
  assert.match(delayRow.reasons[0] ?? "", /queue/i);

  const suspected = unreadModulePrincipal(
    {
      address: delay,
      avatar: null,
      target: null,
      looksLikeDelay: false,
      looksLikeRolesProxy: false,
      delayIdentity: "suspected",
    },
    "safe",
  );
  assert.ok(suspected);
  assert.equal(suspected.principalId, `module:${delay}`);
  assert.match(suspected.reasons[0] ?? "", /not a verified Zodiac Delay/i);
  assert.ok(suspected.patterns.includes("pattern:delay-suspected"));
});
