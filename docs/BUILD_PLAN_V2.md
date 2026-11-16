# Saviour V2 — Real-World Product Build Plan

**Branch:** `feat/saviour-v2-base-pivot`  
**Repo:** `github.com/devhb1/Saviour`  
**Owner:** `devhb1`  
**Product home:** Base mainnet `8453` after Base Sepolia `84532` validation  

> Ship a Base-native security memory product for real wallets, agents, and DAO/treasury signers. Prefer a narrow working system over multi-chain vapor.

---

## How this plan works

| Rule | Detail |
|---|---|
| Phases | **12 phases** (0–11). Each has goal, files, acceptance, commits. |
| Commits | Conventional; never commit `.env` / secrets. |
| Scope gate | **5 queues E2E** before claiming 40. CRITICAL ≠ auto-TAINTED. |
| Staging | Base Sepolia first. Mainnet only after Phase 10 gate. |

---

## Current baseline

| Surface | Today | V2 adds |
|---|---|---|
| App | `apps/web` · saviours.xyz | Option B review, resolve explorer, queue health |
| SDK | `packages/check` | Base registry resolve + 7702 auth-list sim |
| Core / MCP | investigate + ENS staging | `resolve_base_target` when registry configured |
| Registry V1 | Sepolia incidents | Keep as historical staging |
| Registry V2 | — | Ops lifecycle, quarantine, AuthorityLink, Attester |

### Non-goals

- Claiming Safe Transaction Service “all pending txs” until built  
- Basename-per-address minting  
- 40 queues as day-1 binary gate (**5 E2E** first)  
- Requiring a founder API for resolve hits  

---

## Target architecture

```
Wallet / MCP / cast
        │
        ▼
@saviours/check  ── eth_getCode + auth-list sim on tx.chainId
        │
        ▼
SavioursRegistryV2 (Base) ── resolve(chainId, subject)
        │              ▲
   Indexer + Attester Safe
        │
   QueueWatch decode + Horizon B fixtures
```

**Consumer map:** `UNSET→NO_VERDICT` · `WATCH→WARN` · `TAINTED→BLOCK`  
**NO_VERDICT:** never SAFE, never auto-block.  
**`$0`:** no Saviour protocol fee.

---

## Phase map

| Phase | Name | Outcome |
|---|---|---|
| **0** | Docs + branch | Product plan on branch |
| **1** | Registry V2 state machine | Ops / quarantine / supersede / chain-scoped 7702 |
| **2** | Base Sepolia deploy path | Verified staging (or pending_funding + Anvil proof) |
| **3** | Forensic fixtures | Makina / Term / Thessaly |
| **4** | QueueWatch decoder | Term CI hard gate |
| **5** | SDK Base resolve | NO_VERDICT≠ALLOW; RPC_ERROR distinct |
| **6** | MCP + README + product law | Sepolia=staging; Base=product |
| **7** | Option B Safe review UI | Supported Zodiac/module only |
| **8** | Indexer → 5 queues | Cancel / expire / quarantine |
| **9** | Explorer + stale-feed | `/resolve` · `/queues` |
| **10** | Hardening + mainnet gate | Invariants + demo checklist |
| **11** | Launch kit | Outreach template + ops checklist |
| **(+)** | Scale | 5→40 queues, Base mainnet, real users |

---

## Phase notes (implementation)

### Phase 1 — Registry
`operations[opKey]` with QUEUED / CANCELLED / VETOED / EXECUTED_QUARANTINE / EXPIRED; `quarantineUntil = exec + 72h`; `delegations[chainId][authority]`; Attester supersede; discard stale WATCH before merge.

### Phase 4 — QueueWatch
Aragon OSx + Zodiac Roles required for Term. CRITICAL → vault WATCH only. DELEGATECALL contextual.

### Phase 5 — SDK
`resolveBase` + `simulateAuthorizationList`. Miss → ESCALATE/NO_VERDICT never ALLOW.

### Phase 7 — Option B
`/review` — paste supported ops. Do not market full Safe pending-tx coverage.

### Phase 10 — Mainnet gate
See [MAINNET_GATE.md](./MAINNET_GATE.md).

### Phase 11 — Launch kit
[USER_OUTREACH.md](./USER_OUTREACH.md) for early users. No funding-program framing in product surfaces.

---

## Real-world ready bar

1. Base resolve WARNs Term-class vault before earliestExec.  
2. Post-exec quarantine still WARN until `quarantineUntil`.  
3. Expired/cancelled ops do not zombie-WATCH.  
4. Makina-style TAINTED via Attester; honest labeling + 7702 path.  
5. `@saviours/check` hit = 0 Graph, 0 LLM; NO_VERDICT never ALLOW.  
6. QueueWatch Term CI public; unsupported ≠ SAFE.  
7. Option B UI does not overclaim Safe coverage.  
8. **5** queues live with health (40 = scale).  
9. Docs: Sepolia ENS = staging; Base = product.  
10. Third party can reproduce fixtures offline.

---

*Product build plan for Saviour V2 on Base.*
