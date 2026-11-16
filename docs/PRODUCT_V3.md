# Saviour V3 — Privilege Guard Product Spec

**Status:** Day-1 product = Privilege Guard (Review + Watch)  
**Date:** 16 Nov 2026  
**Baseline:** `feat/saviour-v2-base-pivot`  
**Canon:** [PRIVILEGE_GUARD.md](./PRIVILEGE_GUARD.md)

> Before you authorize — know if this changes who controls the treasury.

---

## 1. Vision (day-1)

**Saviour Privilege Guard** helps DAO treasury operators and Safe signers understand **privileged governance actions** before they authorize them, and alerts when CRITICAL privilege ops queue.

**QueueWatch understands. Check assesses. Review / Watch act. The signer decides.**

Shared security memory (Base registry) and ENS staging are **phase-2 / legacy** — not required for the day-1 habit.

### Honesty bound

Static decoding cannot predict every state-dependent outcome. Describe supported actions and known privilege risks — never guarantee transaction safety.

### First experience

1. **Review:** import the exact Safe transaction  
2. **Watch:** Telegram when CRITICAL privilege ops appear on subscribed targets  

---

## 2. Two modes (do not conflate)

| | Watch | Review |
|---|---|---|
| Trigger | Queued / onchain privilege activity on allowlist | Signer imports Safe JSON or calldata |
| Proves | Continuous privilege intelligence | Pre-sign decision support |
| Demo | Term Delay/DAO/Roles tips + Telegram | Term Prop 5 Safe fixture |

---

## 3. API contracts

### Assess (day-1 core)

`assessTransaction(SafeTransactionInput | RawCallInput)` → multidimensional result  
(`decision` · `coverage` · `integrity` · actions · unsupported · errors)

Plus `explainPrivilege(assessment)` → English privilege bullets for UI/alerts.

### Resolve (phase-2)

`resolveBase(subject)` when Base registry is deployed — optional memory lookup.

---

## 4. Layers

1. **QueueWatch — Understand**  
2. **Check — Assess + explain**  
3. **Review / Watch — Act**  
4. **Registry — Remember** (phase-2)

QueueWatch must work without Registry.

---

## 5. Build order (Privilege Guard plan)

| Gate | Focus |
|---|---|
| W0 | Product contract docs |
| W1 | English privilege Review + landing |
| W2 | Watch poller + Telegram for 3 Term targets |
| W3 | `/watch` subscribe UX |
| W4 | Public deploy |
| W5 | Pilots → then TheDAO packaging |
| Phase-2 | Base Sepolia registry writes |

---

## 6. Non-goals (day-1)

Safe Tx Service auto-intercept · ENS hero · x402 headline · 40 queues · agent auto-block · competing with Safe Tx Lens on generic hash UX · TheDAO submit before Watch+pilot evidence.

---

*See [PRIVILEGE_GUARD.md](./PRIVILEGE_GUARD.md) · [USER_READY.md](./USER_READY.md)*
