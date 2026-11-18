import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { evaluateAuthorityFindings } from "../src/authority/findings.js";
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
