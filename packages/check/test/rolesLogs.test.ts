import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import type { Hex } from "../src/assessTypes.js";
import { hitsForRolesReach } from "../src/authority/patterns.js";
import type { PatternHit } from "../src/authority/patterns.js";
import { derivePatternFlagsFromPolicy } from "../src/authority/rolesPatterns.js";
import { sdkPermissionsFromPolicy } from "../src/authority/rolesSdkDiff.js";
import {
  replayRolesEvents,
  scoutItemsToEvents,
  type RolesEvent,
} from "../src/authority/rolesLogs.js";

const ROLE =
  "0xd01f5d7becdbd3695813aa0d6195bb7a6cd8f69c622d017842a3b545cdf333aa" as Hex;
const MEMBER = "0xe0ddfeb6a833886530e728a3caed5890092b0909" as Hex;
const TARGET = "0xe8dee32be7fb6f78f2dbce9d6390931a51eb398f" as Hex;

/** Events captured from mainnet Roles proxy 0x83840F61…362a. Reducer only. */
const events: RolesEvent[] = [
  {
    blockNumber: 1,
    index: 1,
    name: "AssignRoles",
    params: {
      module: MEMBER,
      roleKeys: [ROLE],
      memberOf: ["true"],
    },
  },
  {
    blockNumber: 1,
    index: 2,
    name: "ScopeTarget",
    params: { roleKey: ROLE, targetAddress: TARGET },
  },
  {
    blockNumber: 1,
    index: 3,
    name: "ScopeFunction",
    params: {
      roleKey: ROLE,
      targetAddress: TARGET,
      selector: "0x957ed2b3",
      conditions: [["0", "5", "5", "0x"]],
      options: "0",
    },
  },
];

test("chain-log replay keeps a scoped function conditioned", () => {
  const replay = replayRolesEvents(events);
  assert.equal(replay.roles.length, 1);
  assert.deepEqual(replay.roles[0].members, [MEMBER]);
  assert.equal(replay.roles[0].targets[0].clearance, "Function");
  assert.equal(replay.roles[0].targets[0].functions[0].selector, "0x957ed2b3");
  assert.equal(replay.roles[0].targets[0].functions[0].wildcarded, false);
  assert.equal(
    replay.roles[0].targets[0].functions[0].conditionId,
    "conditions:1",
  );
  assert.equal(replay.conditionedFunctions, 1);

  const flags = derivePatternFlagsFromPolicy(
    [
      {
        rolesAddress: "0x83840f61cfba04d3baa84bd0eccf54be0ebd362a",
        mastercopy: "0xf2964ce6161ce0e75964fe7927ce114cb0b283d5",
        version: "v2.1.1",
        status: "reconstructed",
        roles: replay.roles,
        hasAllowanceData: false,
        gaps: [],
        reconstructed: [],
        source: "chain-logs",
      },
    ],
    "0xd92c8514323cc6e6f375908fea5453f694818b42",
  );
  assert.equal(flags.freeRecipientTransfer, false);
  assert.equal(flags.anyUnbounded, false);
});

test("delay-bypass does not upgrade an unread Roles principal", () => {
  const hits: PatternHit[] = [
    {
      id: "pattern:delay-bypass",
      severity: "CRITICAL",
      title: "Module path bypasses Delay",
      detail: "topology",
      forcesVerdict: "UNBOUNDED",
    },
    {
      id: "pattern:free-recipient",
      severity: "CRITICAL",
      title: "free",
      detail: "policy",
      forcesVerdict: "UNBOUNDED",
    },
  ];
  const applied = hitsForRolesReach(hits, false);
  assert.deepEqual(
    applied.map((h) => h.id),
    [],
  );
  const complete = hitsForRolesReach(hits, true);
  assert.deepEqual(
    complete.map((h) => h.id),
    ["pattern:free-recipient"],
  );
});

test("SetDefaultRole replaces prior default; zero clears it", () => {
  const ADMIN =
    "0x1111111111111111111111111111111111111111111111111111111111111111" as Hex;
  const OPERATOR =
    "0x2222222222222222222222222222222222222222222222222222222222222222" as Hex;
  const ZERO = `0x${"0".repeat(64)}` as Hex;
  const alice = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hex;

  const switched = replayRolesEvents([
    {
      blockNumber: 1,
      index: 1,
      name: "SetDefaultRole",
      params: { module: alice, defaultRoleKey: ADMIN },
    },
    {
      blockNumber: 2,
      index: 1,
      name: "SetDefaultRole",
      params: { module: alice, defaultRoleKey: OPERATOR },
    },
  ]);
  const admin = switched.roles.find((r) => r.key === ADMIN);
  const operator = switched.roles.find((r) => r.key === OPERATOR);
  assert.ok(admin);
  assert.ok(operator);
  assert.equal(admin!.members.includes(alice), false);
  assert.equal(operator!.members.includes(alice), true);
  assert.equal(switched.defaultRoleByMember[alice], OPERATOR);

  const cleared = replayRolesEvents([
    {
      blockNumber: 1,
      index: 1,
      name: "SetDefaultRole",
      params: { module: alice, defaultRoleKey: ADMIN },
    },
    {
      blockNumber: 2,
      index: 1,
      name: "SetDefaultRole",
      params: { module: alice, defaultRoleKey: ZERO },
    },
  ]);
  assert.equal(
    cleared.roles.find((r) => r.key === ADMIN)?.members.includes(alice),
    false,
  );
  assert.equal(cleared.defaultRoleByMember[alice], undefined);

  const both = replayRolesEvents([
    {
      blockNumber: 1,
      index: 1,
      name: "AssignRoles",
      params: {
        module: alice,
        roleKeys: [ADMIN],
        memberOf: ["true"],
      },
    },
    {
      blockNumber: 2,
      index: 1,
      name: "SetDefaultRole",
      params: { module: alice, defaultRoleKey: OPERATOR },
    },
  ]);
  assert.equal(
    both.roles.find((r) => r.key === ADMIN)?.members.includes(alice),
    true,
  );
  assert.equal(
    both.roles.find((r) => r.key === OPERATOR)?.members.includes(alice),
    true,
  );
});

test("AllowTarget is an unconstrained target", () => {
  const replay = replayRolesEvents([
    {
      blockNumber: 2,
      index: 1,
      name: "AllowTarget",
      params: { roleKey: ROLE, targetAddress: TARGET, options: "2" },
    },
  ]);
  assert.equal(replay.roles[0].targets[0].clearance, "Target");
  assert.equal(replay.roles[0].targets[0].functions.length, 0);
  const flags = derivePatternFlagsFromPolicy(
    [
      {
        rolesAddress: "0x83840f61cfba04d3baa84bd0eccf54be0ebd362a",
        mastercopy: "0xf2964ce6161ce0e75964fe7927ce114cb0b283d5",
        version: "v2.1.1",
        status: "reconstructed",
        roles: replay.roles,
        hasAllowanceData: false,
        gaps: [],
        reconstructed: [],
        source: "chain-logs",
      },
    ],
    "0xd92c8514323cc6e6f375908fea5453f694818b42",
  );
  assert.equal(flags.freeRecipientTransfer, true);
  assert.equal(flags.rolesDelegatecall, true);
  assert.equal(replay.roles[0].targets[0].executionOptions, "DelegateCall");
});

test("Blockscout items without a decoded name are counted, not replayed", () => {
  const parsed = scoutItemsToEvents(
    [
      { block_number: 1, index: 0, decoded: { abi: { name: "AssignRoles" }, parameters: [] } },
      { block_number: 2, index: 0 },
    ],
    10n,
  );
  assert.equal(parsed.events.length, 1);
  assert.equal(parsed.dropped, 1);
});

test("frozen v2.1.1 shape matches replay and the SDK", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
  const frozen = JSON.parse(
    readFileSync(join(root, "fixtures/authority/v211-roles-shape.json"), "utf8"),
  ) as {
    events: RolesEvent[];
    expected: {
      roleKey: string;
      members: string[];
      target: string;
      selector: string;
      executionOptions: string;
    };
  };
  const replay = replayRolesEvents(frozen.events);
  assert.equal(replay.roles.length, 1);
  const role = replay.roles[0];
  assert.equal(role.key, frozen.expected.roleKey);
  assert.deepEqual(
    [...role.members].sort(),
    [...frozen.expected.members].sort(),
  );
  assert.equal(role.targets[0].address, frozen.expected.target);
  assert.equal(role.targets[0].clearance, "Function");
  assert.equal(role.targets[0].functions[0].selector, frozen.expected.selector);
  assert.equal(role.targets[0].functions[0].wildcarded, false);
  assert.equal(
    role.targets[0].functions[0].executionOptions,
    frozen.expected.executionOptions,
  );
  const flat = JSON.stringify(
    sdkPermissionsFromPolicy({
      rolesAddress: "0x83840f61cfba04d3baa84bd0eccf54be0ebd362a",
      mastercopy: "0xf2964ce6161ce0e75964fe7927ce114cb0b283d5",
      version: "v2.1.1",
      status: "partial",
      roles: replay.roles,
      hasAllowanceData: false,
      gaps: [],
      reconstructed: [],
      source: "chain-logs",
    }),
  ).toLowerCase();
  assert.ok(flat.includes(frozen.expected.selector.slice(2)));
});
