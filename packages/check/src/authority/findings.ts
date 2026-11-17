import type { CapabilityGraph, AuthorityFinding } from "./types.js";

/** First three MVP rules: Delay bypass, cooldown==0, direct module on Safe. */
export function evaluateAuthorityFindings(
  graph: CapabilityGraph,
): AuthorityFinding[] {
  const findings: AuthorityFinding[] = [];
  const delays = graph.delays.filter((d) => d.looksLikeDelay);
  const delayAddrs = new Set(delays.map((d) => d.address));

  for (const d of delays) {
    if (d.txCooldown === "0") {
      findings.push({
        id: `cooldown-zero:${d.address}`,
        rule: "DELAY_COOLDOWN_ZERO",
        severity: "CRITICAL",
        title: "Delay cooldown is zero",
        detail:
          "txCooldown=0 removes the waiting period on this Delay path. Distinct from txExpiration.",
        evidence: [
          `delay=${d.address}`,
          `txCooldown=${d.txCooldown}`,
          `txExpiration=${d.txExpiration ?? "unread"}`,
        ],
      });
    }
    if (d.txExpiration === "0") {
      findings.push({
        id: `expiration-zero:${d.address}`,
        rule: "DELAY_EXPIRATION_ZERO",
        severity: "WARN",
        title: "Delay expiration is zero (no auto-expiry)",
        detail:
          "txExpiration=0 means queued transactions never expire automatically; a stale FIFO head can block the queue. Not the same as cooldown=0.",
        evidence: [`delay=${d.address}`, `txExpiration=0`],
      });
    }
  }

  const directModules = graph.safe.modules.filter((m) => !delayAddrs.has(m));
  if (delays.length > 0 && directModules.length > 0) {
    findings.push({
      id: `bypass:${graph.safe.address}`,
      rule: "DELAY_BYPASS_PATH",
      severity: "CRITICAL",
      title: "Direct Safe module path bypasses Delay",
      detail:
        "At least one module is enabled directly on the Safe while a Delay is also present. Delay only protects routes that execute through it — these direct modules can reach the Safe without that waiting period.",
      evidence: [
        `safe=${graph.safe.address}`,
        `delays=${[...delayAddrs].join(",")}`,
        `directModules=${directModules.join(",")}`,
      ],
    });
  }

  for (const m of directModules) {
    findings.push({
      id: `direct-module:${m}`,
      rule: "DIRECT_SAFE_MODULE",
      severity: "WARN",
      title: "Module enabled directly on Safe",
      detail:
        "This module can initiate Safe execution without going through an observed Delay path.",
      evidence: [`module=${m}`, `safe=${graph.safe.address}`],
    });
  }

  return findings;
}
