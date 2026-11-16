# Saviour Product Reset — Governance Policy Guard

**Status:** Locked direction (Nov 2026)  
**Primary surface:** `/review` · **CLI:** `pnpm review:cli`

---

## One sentence (5 seconds)

> Before a DAO executes a proposal, know exactly who gains new power over its treasury — and whether that change weakens the controls protecting it.

---

## Product name

# SAVIOUR — Governance Policy Guard

Pre-sign / pre-execution **treasury control intelligence** for Safe + Zodiac Delay stacks.

Not: ENS memory · x402 · Graph AI investigator · multi-agent platform · 40-queue monitor.

---

## Customer

DAO treasury operations and security teams who review governance changes that alter permissions, modules, timelocks, or ownership — before approval/execution.

---

## Core workflow (shipped path)

1. **Input** — Safe JSON, calldata, or `pnpm review:cli --fixture term`  
2. **Integrity** — Safe 1.3+ tx hash (`chainId` + `verifyingContract`)  
3. **Decode** — MultiSend packed + privilege ABI / sequence (no selector substring invent-WATCH)  
4. **Before-state** — live RPC read of Delay `txCooldown` / `txExpiration` / modules when reachable  
5. **Privilege Diff** — before → after with source (`rpc-read` | `unknown`)  
6. **Verdict** — WARN only for decoded privilege ops; NO_VERDICT ≠ SAFE  

---

## What is cut / demoted

| Item | Status |
|---|---|
| ENS / Graph / x402 as product | Legacy deep links only — out of primary nav |
| Watch / queues | Prototype — not durable monitoring |
| Broad AI explanations | Out — deterministic rules only |
| MCP / agent expansion | Frozen |
| 40 queues / multi-chain sprawl | Frozen |
| Full policy engine (min-delay rules, allowlists) | **Next — only after operator validation** |

---

## Honesty (current limits)

- Privilege ABI is still narrow (`setTxCooldown`, `setTxExpiration`, `enableModule`, `updateDelay`).  
- Term fixture is a **privileged prefix**, not the full 17-action proposal.  
- Static decode ≠ fork simulation of post-state.  
- Policy rules (min delay, approved modules) are the **hypothesis to validate** with operators — not claimed as shipped.

---

## Validate before expanding

Take one real proposal report (CLI or `/review`) to 5 treasury/security operators. Ask:

1. Does this change what you investigate before signing?  
2. What did existing Safe/Tenderly/Aragon tools miss that this caught (or failed to)?  
3. Would you paste a real pending proposal into this again?

**Do not build the full policy engine until that evidence exists.**

---

## Reuse map

| Keep | Path |
|---|---|
| Safe hash | `packages/check/src/safeTxHash.ts` → `computeSafeTxHash` |
| Tree decode | `packages/queuewatch/src/decodeTree.ts` |
| Privilege Diff | `packages/queuewatch/src/privilegeDiff.ts` |
| RPC before-state | `packages/check/src/readControls.ts` |
| Review UI | `apps/web/src/app/review` |
| CLI | `scripts/review-cli.ts` |
| Term research | `fixtures/queue/*` · `fixtures/safe/*` |

---

## Immediate commands

```bash
pnpm review:cli                 # Term privileged prefix + live RPC before-state
pnpm review:cli --fixture term
pnpm exec tsx scripts/demo-v3-stranger.ts
```
