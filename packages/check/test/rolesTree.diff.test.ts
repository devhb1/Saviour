import assert from "node:assert/strict";
import { test } from "node:test";
import {
  diffRoleKeys,
  ROLES_V211_MASTERCOPY,
} from "../src/authority/rolesTree.js";
import { derivePatternFlagsFromPolicy } from "../src/authority/rolesPatterns.js";
import type { RolesPolicy } from "../src/authority/rolesTree.js";
import type { Hex } from "../src/assessTypes.js";
import {
  canonicalGoldenPayload,
  digestGoldenPayload,
  toGoldenReport,
  verifyGoldenDigest,
} from "../src/report/golden.js";
import type { AuthorityAuditReport } from "../src/authority/types.js";
import { comparePolicyToSdkFlat } from "../src/authority/rolesSdkDiff.js";

test("diffRoleKeys match", () => {
  const a = ["0x01", "0x02"] as Hex[];
  const b = ["0x02", "0x01"] as Hex[];
  assert.equal(diffRoleKeys(a, b).match, true);
});

test("diffRoleKeys detects missing", () => {
  const d = diffRoleKeys(["0x01"] as Hex[], ["0x01", "0x02"] as Hex[]);
  assert.equal(d.match, false);
  assert.ok(d.missing.includes("0x02" as Hex));
});

test("ROLES_V211_MASTERCOPY constant", () => {
  assert.match(ROLES_V211_MASTERCOPY, /^0xf2964c/i);
});

test("derivePatternFlags detects delegatecall + call-safe", () => {
  const safe = "0x46da347d1db6edca62bf6cd5892dc284fc938613" as Hex;
  const policy: RolesPolicy = {
    rolesAddress: "0x1111111111111111111111111111111111111111" as Hex,
    mastercopy: ROLES_V211_MASTERCOPY,
    version: "v2.1.1",
    status: "reconstructed",
    hasAllowanceData: false,
    gaps: [],
    reconstructed: [],
    source: "subgraph+chain",
    roles: [
      {
        key: "0xabc" as Hex,
        members: ["0x2222222222222222222222222222222222222222" as Hex],
        targets: [
          {
            address: safe,
            clearance: "Function",
            functions: [
              {
                selector: "0x12345678" as Hex,
                wildcarded: false,
                executionOptions: "DelegateCall",
              },
            ],
          },
        ],
      },
    ],
  };
  const d = derivePatternFlagsFromPolicy([policy], safe);
  assert.equal(d.rolesCanCallSafe, true);
  assert.equal(d.rolesDelegatecall, true);
  assert.equal(d.anyUnbounded, true);
});

test("sdk reconstructPermissions flattens our targets", () => {
  const safe = "0x46da347d1db6edca62bf6cd5892dc284fc938613" as Hex;
  const policy: RolesPolicy = {
    rolesAddress: "0x1111111111111111111111111111111111111111" as Hex,
    mastercopy: ROLES_V211_MASTERCOPY,
    version: "v2.1.1",
    status: "reconstructed",
    hasAllowanceData: false,
    gaps: [],
    reconstructed: [],
    source: "subgraph+chain",
    roles: [
      {
        key: "0xabc" as Hex,
        members: [],
        targets: [
          {
            address: safe,
            clearance: "Function",
            functions: [
              {
                selector: "0xa9059cbb" as Hex,
                wildcarded: false,
                executionOptions: "None",
              },
            ],
          },
        ],
      },
    ],
  };
  const cmp = comparePolicyToSdkFlat(policy);
  assert.equal(cmp.ourTargetCount, 1);
  assert.ok(cmp.sdkPermissionCount >= 1);
});

test("golden digest verifies", () => {
  const audit: AuthorityAuditReport = {
    product: "saviour-control-path-auditor",
    version: "test",
    safeAddress: "0x46da347d1db6edca62bf6cd5892dc284fc938613" as Hex,
    findings: [],
    coverage: {
      complete: false,
      components: [
        { id: "safeOwners", status: "assessed" },
        { id: "modules", status: "partial" },
        { id: "rolesV211", status: "unassessed" },
        { id: "rolesOther", status: "unsupported" },
        { id: "delay", status: "unsupported" },
        { id: "delegatecall", status: "unassessed" },
        { id: "guards", status: "partial" },
        { id: "allowances", status: "unsupported" },
      ],
      gaps: [],
      reconstructed: [],
    },
    freshness: {
      chainId: 1,
      blockNumber: "1",
      blockHash: ("0x" + "ab".repeat(32)) as Hex,
    },
    graph: null,
    reach: {
      engineVersion: "t",
      rolesModelVersion: "t",
      principals: [],
    },
    errors: [],
  };
  const g = toGoldenReport(audit);
  assert.ok(g.reportDigest);
  assert.equal(g.reportDigest.length, 64);
  assert.equal(verifyGoldenDigest(g), true);
  assert.equal(
    digestGoldenPayload(canonicalGoldenPayload(g)),
    g.reportDigest,
  );
  const otherHost = toGoldenReport({
    ...audit,
    freshness: { ...audit.freshness!, rpcUrlHost: "other.example" },
  });
  const thisHost = toGoldenReport({
    ...audit,
    freshness: { ...audit.freshness!, rpcUrlHost: "eth.example" },
  });
  assert.equal(otherHost.reportDigest, thisHost.reportDigest);
});
