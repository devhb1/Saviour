import assert from "node:assert/strict";
import { test } from "node:test";
import { ownerSetPrincipal, ownersAreBurned } from "../src/authority/findings.js";
import {
  acceptModelParaphrase,
  answerFromReport,
  explainAudit,
} from "../src/report/explain.js";
import { pilotReceiptMarkdown } from "../src/report/pilotReceipt.js";
import type { AuthorityAuditReport } from "../src/authority/types.js";

const DEAD = "0x000000000000000000000000000000000000dead";

test("burned owners are bounded and cannot be called unbounded", () => {
  assert.equal(ownersAreBurned([DEAD]), true);
  assert.equal(ownersAreBurned(["0x000000000000000000000000000000000000dEaD"]), true);
  assert.equal(ownersAreBurned(["0xabc0000000000000000000000000000000000001"]), false);
  const burned = ownerSetPrincipal([DEAD], 1);
  assert.equal(burned.verdict, "BOUNDED");
  assert.equal(burned.patterns.includes("pattern:owners-burned"), true);
  const live = ownerSetPrincipal(
    ["0xabc0000000000000000000000000000000000001"],
    1,
  );
  assert.equal(live.verdict, "UNBOUNDED");
  const unread = ownerSetPrincipal([], null, {
    ownersRead: "failed",
    thresholdRead: "failed",
  });
  assert.equal(unread.verdict, "UNKNOWN");
  assert.equal(unread.patterns.includes("pattern:owners-unread"), true);
});

function sample(): AuthorityAuditReport {
  return {
    product: "saviour-control-path-auditor",
    version: "test",
    safeAddress: "0x46da347d1db6edca62bf6cd5892dc284fc938613",
    findings: [
      {
        id: "owners-burned",
        rule: "OWNERS_BURNED",
        severity: "CRITICAL",
        title: "Safe owner set is a burn address",
        detail: "Every owner is the zero or dead address.",
        evidence: [],
      },
    ],
    coverage: {
      complete: false,
      components: [],
      gaps: [],
      reconstructed: [],
    },
    freshness: {
      chainId: 1,
      blockNumber: "26435938",
      blockHash: `0x${"ab".repeat(32)}`,
    },
    graph: null,
    reach: {
      engineVersion: "test",
      rolesModelVersion: "test",
      principals: [
        ownerSetPrincipal([DEAD], 1),
        {
          principalId: "roles-module",
          principal: "module",
          kind: "module",
          verdict: "UNKNOWN",
          bounds: [],
          reasons: ["trees not fully enumerated"],
          patterns: [],
        },
      ],
    },
    errors: [],
  };
}

test("plain answers refuse safety, amounts, and prevention", () => {
  const report = sample();
  const plain = explainAudit(report);
  assert.match(plain.brief, /does not say the Safe is safe/);
  assert.match(plain.brief, /owner-set is BOUNDED/);
  assert.match(answerFromReport(report, "is this safe?"), /never stamps SAFE/);
  assert.match(answerFromReport(report, "how much USDC can it move?"), /No token amount/);
  assert.match(
    answerFromReport(report, "would this have stopped 16 Nov?"),
    /does not claim it would have prevented/,
  );
});

test("a model paraphrase that adds a claim is dropped", () => {
  const brief = explainAudit(sample()).brief;
  assert.equal(
    acceptModelParaphrase("The owners cannot sign. Coverage is incomplete.", brief)
      .ok,
    true,
  );
  assert.equal(
    acceptModelParaphrase("The report does not say the Safe is safe.", brief).ok,
    true,
  );
  const safe = acceptModelParaphrase("The Safe is safe to use.", brief);
  assert.equal(safe.ok, false);
  const amount = acceptModelParaphrase("The role can move 1000 USDC.", brief);
  assert.equal(amount.ok, false);
  const prevented = acceptModelParaphrase(
    "This would have prevented the loss.",
    brief,
  );
  assert.equal(prevented.ok, false);
});

test("a pilot receipt does not count itself as an external operator", () => {
  const md = pilotReceiptMarkdown({
    operator: "Ada",
    witness: "",
    safe: "0x46da347d1db6edca62bf6cd5892dc284fc938613",
    block: "26435999",
    digest: "abc",
    pinUrl: "https://example.test/audit?safe=0x1&block=1&digest=abc",
    coverageComplete: false,
    principals: [{ id: "roles-module", verdict: "UNKNOWN" }],
    recordedAt: "2026-11-17T00:00:00.000Z",
  });
  assert.match(md, /does not count/);
  assert.match(md, /outside the Saviour team/);
  assert.match(md, /Witness: \(none yet\)/);
  assert.match(md, /roles-module: UNKNOWN/);
  assert.doesNotMatch(md, /external operator: Ada/);
});
