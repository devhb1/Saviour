# Saviour Product Reset — Treasury Control Intelligence

**Status:** Locked product contract (Nov 2026)  
**Branch baseline:** `feat/saviour-v2-base-pivot`  
**Supersedes competing day-1 narratives:** ENS/Graph/x402 hero, Privilege Guard+Watch as equal co-products

---

## One product

# SAVIOUR — Treasury Control Intelligence

**Pre-sign security intelligence for DAO treasuries.**

Understand the permissions, control changes, and security consequences hidden inside proposed transactions before approving them.

| Lock | Value |
|---|---|
| **Customer** | DAO treasury operators / Safe signers |
| **Problem** | A single approved tx can silently remove or widen treasury control |
| **Product** | Transaction Review with **Privilege Diff** (before → after) |
| **v1 stack** | Aragon OSx → Zodiac Roles → Zodiac Delay (Term path) |
| **Primary UI** | `/review` |
| **Engines (not products)** | QueueWatch decode · Registry V2 memory · Watch prototype |

---

## User journey

1. Import pending Safe transaction (JSON / calldata)  
2. Verify Safe tx hash integrity (Safe 1.3+ domain: `chainId` + `verifyingContract`)  
3. Decode supported nested execution tree (ABI / MultiSend packed)  
4. Read current control state where possible; mark UNKNOWN when not  
5. Show Privilege Diff + evidence + explicit limitations  
6. Signer decides in their existing workflow  

---

## Acceptance test

| Test | Must happen |
|---|---|
| Input | Stranger uploads a Safe transaction |
| Integrity | Hash matches Safe domain the signer will approve |
| Decode | Nested supported actions form a real tree |
| Impact | Before/after control changes explained |
| Limitations | Unsupported / stale / UNKNOWN visible |
| Negative | Benign transfer does **not** fabricate privilege WARN |
| Independence | Report reproducible without contacting the founder |

---

## Reuse vs broken (inspected)

### Keep / reuse

| Component | Path | Role |
|---|---|---|
| Registry V2 | `contracts/src/SavioursRegistryV2.sol` | Phase-2 memory |
| QueueWatch types / severity / adapters | `packages/queuewatch` | Rebuild decode on top |
| `@saviours/check` assess types | `packages/check` | Correct contracts; fix hash + tree |
| `/review` | `apps/web/src/app/review` | Main product |
| Term forensic research | `fixtures/queue/term-finance-prop5.json` | Integration target |
| `computeSafeTxHash` | `packages/check/src/safeTxHash.ts` | Correct Safe 1.3+ domain |

### Broken / demote (do not expand)

| Issue | Location | Action |
|---|---|---|
| Wrong hash domain in Review | `computeSafeTxHashWithDomainName` used by assess/UI | Switch to `computeSafeTxHash` |
| Selector scan ≠ decode | `extractSelectorHints` → fake `rolesInner` | Replace with execution tree |
| MultiSend stub | `unwrapMultiSend` envelope-only | Real packed parser |
| Unknown → WATCH | `classifySelector` default | Unknown → UNSUPPORTED |
| Term prefix as “full proof” | `fixtures/safe/term-prop5-review.json` | Bytes-from-tree tests + negatives |
| Watch as product | `/watch`, indexer tip seed | Prototype only; label demo alerts |
| ENS/Graph/x402 as hero | Loop, ARCHITECTURE, INTEGRATE | Legacy deep links |

---

## Explicit exclusions (this cycle)

- 40-queue monitoring expansion  
- x402 commercialization headline  
- ENS/Graph investigation as co-equal product  
- MCP / agent framework expansion  
- Basenames  
- Automatic Safe interception  
- Base Sepolia Registry deploy as blocker  
- Duplicate architectures / new top-level packages beyond privilege-diff helper inside existing packages  

---

## Privilege Diff (v1)

Controls Saviour must speak to for the Term stack:

| Area | Examples |
|---|---|
| Time protection | cooldown / expiration / delay → 0 |
| Execution authority | enableModule / disableModule |
| Permissions | Zodiac Roles scope changes (as decoded) |
| Ownership | owner/threshold (next) |
| Implementation | upgradeTo (next; HIGH until verified) |

**Rule:** after-state from calldata args and/or verified RPC reads — never invent complete before-state from method names alone. Mark UNKNOWN when unread.

---

## Development gates

1. **P0** Trustworthy assess — Safe hash, real tree, honest risk, benign negative  
2. **P0** Privilege Diff panel on `/review`  
3. **P1** Full Term proposal path from bytes  
4. **P1** Real operator pilots  
5. **P2** Durable Watch + Registry enrichment  

Inspect existing implementation before adding files. Prefer fixing QueueWatch + check over new frameworks.
