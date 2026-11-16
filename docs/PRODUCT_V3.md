# Saviour V3 — Product Plan

**Status:** Improvisation master for connecting the stack into a real signer product  
**Branch baseline:** `feat/saviour-v2-base-pivot` (keep V2 registry/QueueWatch foundations)  
**Date:** 16 Nov 2026  

> V2 built the layers. V3 connects them into one transaction-assessment product a DAO signer can use without founder babysitting.

---

## 1. Locked product definition (narrow)

### One sentence

**Saviour helps DAO treasury operators understand dangerous privileged actions before they authorize them, and makes proven threat intelligence reusable for wallets and agents.**

### Three capabilities (in order)

| # | Capability | Layer | Output |
|---|---|---|---|
| 1 | **Understand the action** | QueueWatch decode | Decoded action tree, severity, unsupported flags |
| 2 | **Remember the threat** | Registry V2 | UNSET / WATCH / TAINTED + evidence refs |
| 3 | **Explain before authorize** | Check assessment + `/review` | WARN / BLOCK_RECOMMENDATION / NO_VERDICT / UNSUPPORTED / RPC_ERROR / STALE_DATA |

**Signer decides.** Saviour recommends; it does not claim to enforce a block unless a wallet integration does.

### What V3 is *not*

- Not “another malicious-address list”
- Not full Safe Transaction Service interception (yet)
- Not 40 queues on day one
- Not AI auto-TAINTED
- Not x402 as the product

---

## 2. Hard distinction: resolve ≠ assess

| API | Question answered | Input |
|---|---|---|
| `resolveBase(subject)` | Is this address/authority associated with an established finding? | `chainId`, address |
| `assessTransaction(tx)` **(V3)** | What will *this* authorization do, and what risk evidence applies? | Safe context + `to`/`value`/`data`/`operation` |

V2 mostly shipped resolve. V3’s killer loop is **assess**.

```ts
type TransactionAssessmentInput = {
  chainId: number;
  safeAddress: `0x${string}`;
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
  operation: 0 | 1; // CALL | DELEGATECALL
};
```

Assessment pipeline:

1. Parse tx  
2. Decode supported governance/module payloads  
3. Recursively unwrap MultiSend / nested supported calls  
4. Mark unknown nested actions `UNSUPPORTED` (never SAFE)  
5. Verify AuthorityLink when claiming vault↔queue inheritance  
6. Resolve subjects via Registry  
7. Return action tree + evidence + recommendation  

---

## 3. Decision vocabulary (consistent)

| Result | Meaning | UI behaviour |
|---|---|---|
| `NO_VERDICT` | No established finding | Show unknown — never SAFE |
| `WARN` | Suspicious / pending critical / quarantine | Caution + evidence |
| `BLOCK_RECOMMENDATION` | Attested TAINTED | Strong warning; wallet policy decides |
| `UNSUPPORTED` | Decoder cannot understand payload | Explicit human review |
| `RPC_ERROR` | Cannot retrieve data | Service failure, not clean result |
| `STALE_DATA` | Monitoring freshness exceeded | Show last verified + stale banner |
| `COVERAGE_INCOMPLETE` | Op scan / indexer overflow | Keep WATCH; never claim full coverage |

Legacy `toDecision`: `NO_VERDICT`/`RPC_ERROR` → `ESCALATE` (never `ALLOW`). Prefer exposing the table above in V3 UI/SDK.

---

## 4. Four-layer architecture (keep)

```
QueueWatch (Understand) → Registry (Remember) → Check assess (Evaluate) → Review UI / SDK / MCP (Act)
```

- QueueWatch must remain usable **without** Registry  
- Registry must accept findings from Indexer **or** Attester (not QueueWatch-only)  
- Check must eventually assess **transactions**, not only addresses  
- UI/SDK never invent SAFE  

---

## 5. First shippable product (Gate package)

### Saviour Transaction Review — Base Sepolia staging

Journey a stranger can finish:

1. Import **real calldata** or Safe tx JSON (chain + Safe + execution context)  
2. QueueWatch decodes supported Aragon / Zodiac / MultiSend paths  
3. Show affected vault + authority evidence (or honest gap)  
4. Resolve subjects on **live** Base Sepolia Registry V2  
5. Evidence panel: what / why / evidence refs  
6. Signer decides — no fake execute/block  

**Done when:** Term-like Safe tx paste → decoded tree → WATCH explanation → independent cast/resolve against published Sepolia address.

---

## 6. Build gates (reorder vs V2 A–J)

| Gate | Focus | Acceptance |
|---|---|---|
| **G0** | Honest public wording | Decoder package ≠ live monitoring; Sepolia ENS = staging |
| **G1** | Forensic fixtures | Term / Thessaly / Makina: real addresses, logs/calldata, separate Type-4 auth tx; unit + forensic CI |
| **G2** | Live registry | Verified Base Sepolia deploy; INDEXER ≠ ATTESTER roles; `deployments/base-sepolia.json` filled |
| **G3** | Connect loop | calldata → decode → authority → write → resolve → cancel/quarantine E2E script |
| **G4** | Signer UX | `/review` calldata + Safe JSON; evidence panel; UNSUPPORTED/STALE/RPC states; AppShell theme |
| **G5** | Continuous monitoring | 1→2→5 real queues; finality/reorg; `/queues` freshness |
| **G6** | Market validation | Talk to operators **during G3+**; 1 pilot; documented repeats |

Start operator conversations in **G3**, not after G6.

---

## 7. Explicit non-goals (now)

| Postpone | Why |
|---|---|
| Safe Transaction Service auto-intercept | Manual import first |
| All-chain wallet embeds | Prove Base registry + cross-chain evidence |
| Agent auto-blocking | Reliability first |
| Basenames per address | Not the security problem |
| x402 as headline | Public-goods resolve first |
| 40 queues binary gate | Prove 1 pipeline, then 5, then scale |
| Broad AI investigation expansion | Deterministic assess first |

---

## 8. Engineering debt V3 must fix

1. **Overflow:** last-32 op scan → emit overflow, `COVERAGE_INCOMPLETE`, keep vault WATCH  
2. **Reorgs:** source blockHash + provisional vs finalized findings; supersede on reorg  
3. **Fixtures:** synthetic unit vs forensic (separate folders/tests)  
4. **7702:** Type-2 exploit ≠ Type-4 auth; per-chain codeHash; CURRENT vs HISTORICAL vs REMEDIATION  
5. **Indexer:** real poll/stream + writers; never claim “QueueWatch live” until G5  

---

## 9. Success metrics (product, not vanity)

| Metric | Target for “V3 real” |
|---|---|
| Live registry | Verified Sepolia address public |
| Stranger demo | Import real tx → understand risk without founder API |
| Forensic CI | Term + Thessaly + Makina green on real evidence |
| Queues | ≥1 live, then 5 with freshness SLA |
| Operator feedback | ≥3 sessions documented; ≥1 pilot trial |

---

## 10. Relationship to V2

Keep: Registry V2, QueueWatch package, `resolveBase`, product law, Option B honesty.  
Change: lead with **transaction assessment** + evidence UX; finish fixtures/deploy/indexer; stop selling address-only CHECK as the whole product.

---

*Product plan for Saviour V3. Funding process notes live outside this repo (`ZA ENDGAME FILES/`).*
