# Saviour V3 — Locked Product Spec

**Status:** LOCKED vision · execute, do not redesign  
**Date:** 16 Nov 2026  
**Baseline:** `feat/saviour-v2-base-pivot`  

> Understand the action. Remember the threat. Explain the risk before signing.

---

## 1. Vision (frozen)

**Saviour** is a transaction-security intelligence layer for DAO treasuries, wallets, and autonomous agents.

It decodes **supported** privileged governance actions, connects them to the authorities and assets they affect, checks reusable evidence-backed security findings, and explains associated risks before authorization.

**QueueWatch understands. Saviour remembers. Saviour Check assesses. The signer decides.**

### Honesty bound

Static decoding and security assessment **cannot** predict every state-dependent execution outcome. Describe the product as understanding supported actions and assessing known risks — **never** as guaranteeing transaction safety.

### First user

DAO treasury operators and Safe signers.

### First experience

Import the **exact** transaction being considered — not an address search.

---

## 2. Two workflows (do not conflate)

| | Workflow A — Monitor | Workflow B — Review |
|---|---|---|
| Trigger | Queued Aragon / Governor / timelock op discovered | Signer imports Safe JSON or raw calldata |
| Proves | Continuous governance intelligence | Pre-sign decision support |
| Demo | Demo B (Term Prop 5) | Demo A (Safe tx fixture) |

Both share: decoder · AuthorityLink · Registry · assessment engine.

Manual Safe paste **does not** prove continuous indexing. Continuous indexing **does not** replace hash-integrity review of the tx about to be signed.

---

## 3. API contracts (P0)

### 3.1 Resolve (memory) — keep separate

```ts
resolveBase(subject, { subjectChainId, registryAddress, rpcUrls? })
→ UNSET/WATCH/TAINTED mapped to NO_VERDICT | WARN | BLOCK_RECOMMENDATION
```

### 3.2 Assess (decision support) — V3 core

```ts
type SafeTransactionInput = {
  kind: "SAFE_TRANSACTION";
  chainId: number;
  safeAddress: `0x${string}`;
  safeVersion?: string;
  safeTx: {
    to: `0x${string}`;
    value: bigint;
    data: `0x${string}`;
    operation: 0 | 1;
    safeTxGas: bigint;
    baseGas: bigint;
    gasPrice: bigint;
    gasToken: `0x${string}`;
    refundReceiver: `0x${string}`;
    nonce: bigint;
  };
  expectedSafeTxHash?: `0x${string}`;
};

type RawCallInput = {
  kind: "RAW_CALL";
  chainId: number;
  from?: `0x${string}`;
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
};

type TransactionAssessmentInput = SafeTransactionInput | RawCallInput;
```

**Integrity:** For `SAFE_TRANSACTION`, recompute Safe tx hash (version + chain domain). If `expectedSafeTxHash` is set and mismatches → invalidate assessment. If the signer changes fields after review → assessment is stale.

EIP-7702 authorization-list simulation stays an **outer** tx context — not assumed inside every Safe tx.

### 3.3 Multidimensional assessment result

Risk, coverage, freshness, and errors are **orthogonal** — they can co-occur.

```ts
type TransactionAssessment = {
  decision: "NO_VERDICT" | "WARN" | "BLOCK_RECOMMENDATION";
  coverage: "COMPLETE" | "PARTIAL" | "STALE" | "ERROR";
  integrity: "MATCH" | "MISMATCH" | "UNCHECKED" | "N_A";
  actions: DecodedAction[];
  findings: SecurityFinding[];
  unsupportedActions: UnsupportedAction[];
  freshness: SourceFreshness[];
  evidence: EvidenceReference[];
  errors: AssessmentError[];
  assessedAt: { chainId: number; blockNumber: bigint; blockHash: `0x${string}` };
};
```

| Situation | decision | coverage |
|---|---|---|
| No finding, all supported checks done | NO_VERDICT | COMPLETE |
| Critical pending / quarantine | WARN | COMPLETE |
| Attested TAINTED target | BLOCK_RECOMMENDATION | COMPLETE |
| Known WARN + unsupported nested | WARN | PARTIAL |
| No findings, monitoring stale | NO_VERDICT | STALE |
| Registry RPC down | (no fresh decision) | ERROR |

**Never** let unsupported overwrite TAINTED. **Never** let a successful address lookup mark a tx fully assessed when nested calls were not decoded. **NO_VERDICT ≠ SAFE.**

---

## 4. Four layers (permanent)

1. **QueueWatch — Understand** — decode supported privileged / nested actions  
2. **Registry — Remember** — UNSET / WATCH / TAINTED + evidence  
3. **Check — Assess** — correlate tx + findings + coverage limits  
4. **Review — Act** — explain; signer retains authority  

Rules: QueueWatch usable without Registry · Registry accepts non-QueueWatch writers · do not merge resolve into the registry contract as assess.

---

## 5. Official demos

**Demo A — Transaction review**  
Import Safe JSON → hash integrity → decode tree → findings → evidence panel → decide in existing signer.

**Demo B — Governance monitoring**  
Discover queued proposal → decode → AuthorityLink → write WATCH → independent resolve WARN → cancel / expire / 72h quarantine.

---

## 6. Engineering locks (add to implementation)

- Recursive decode: max depth (existing), max action count, max calldata size, malformed ABI → PARTIAL  
- Nested DELEGATECALL: contextual — not auto-CRITICAL  
- Versioned ABIs + known deployments; record decoderVersion; unresolved proxy → limitation  
- AuthorityLink: show provenance / verification method to consumers  
- Overflow: `COVERAGE_INCOMPLETE` + event + keep WATCH  
- Reorg: source blockHash + provisional vs finalized; supersede on reorg  
- Static decode ≠ full simulation — label honestly in UI  

---

## 7. Build order

| Gate | Focus |
|---|---|
| G0 | Honest public wording |
| G1 | Forensic fixtures (unit ≠ forensic) |
| G2 | Live Base Sepolia registry |
| G3 | `assessTransaction` + integrity + structured result |
| G4 | Demo A + Demo B complete |
| G5 | Continuous indexing 1→5 + reorg/freshness |
| G6 | Signer UX polish (evidence panel) |
| G7 | Operator sessions (start as soon as G3 demoable) |
| G8 | Grant packaging (separate from product repo) |

---

## 8. Non-goals (unchanged)

Safe Tx Service auto-intercept · all-chain wallet embeds · agent auto-block · Basenames · x402 headline · 40 queues day-one · vision PDF rewrites.

---

## 9. Landing / product surfaces

Lead with **Review a transaction**. Address resolve is secondary memory lookup. Staging ENS labeled staging. Base = product home.

---

*Locked V3 product specification. Funding strategy: `ZA ENDGAME FILES/THEDAO_V3_FUND_RESEARCH.md`.*
