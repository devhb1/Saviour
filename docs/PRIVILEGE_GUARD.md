# Saviour Privilege Guard → Transaction Review

**Superseded for product lock by** [`SAVIOUR_PRODUCT_RESET.md`](./SAVIOUR_PRODUCT_RESET.md).

**Day-1 product:** Transaction Review (`/review`) with Privilege Diff.  
**Watch:** prototype only. Brand: `saviours`.

> Before you sign — know how a proposed transaction changes who can control the treasury.

---

## Job to be done

Explain whether a transaction or queued governance op **changes privilege** (delay, modules, roles, guardians, upgrades), show evidence, match the Safe hash you will approve, and alert when CRITICAL privilege ops appear.

Not: address reputation browser · AI investigator · generic Tenderly clone · ENS-first memory loop.

---

## Two modes

| Mode | Habit | Surface |
|---|---|---|
| **Review** | Paste Safe JSON / calldata → English privilege risk + hash integrity | `/review` |
| **Watch** | Subscribe Safe/vault → Telegram when CRITICAL privilege ops queue | `/watch` · `/queues` |

Same engine: `@saviours/queuewatch` decode → `@saviours/check` assess → explain.

---

## Privilege taxonomy (CRITICAL → vault WATCH)

| Class | Examples | English cue |
|---|---|---|
| Delay collapse | `setTxCooldown(0)`, `setTxExpiration(0)`, `updateDelay(0)` | Security delay removed or zeroed |
| Module surface | `enableModule`, unknown module enable | New execution path into the Safe/vault |
| Roles / policy | Roles owner calls that widen permissions | Who can call privileged targets expands |
| Upgrade | `upgradeTo`, setImplementation (unverified) | Implementation / control plane change |
| Guardian / cancel rights | Changes to cancel authority | Oversight path weakened |

**CRITICAL ≠ TAINTED.** Privilege change → WATCH / WARN. TAINTED needs Attester + evidence.

---

## Honesty bounds

- Static decode ≠ full simulation  
- NO_VERDICT ≠ SAFE  
- Unsupported nested calls → coverage PARTIAL  
- Safe hash MISMATCH → invalidate assessment  
- Signer decides — Guard never auto-blocks unless a wallet integration does  
- Day-1 Watch covers an allowlist (start: 3 Term-related targets), not “all Safe pending txs”

---

## Alert SLA (Watch)

| Metric | Day-1 target |
|---|---|
| Ingest | eth_getLogs poll ≤ 60s interval |
| CRITICAL notify | Telegram within 2 poll cycles of detection |
| Health | `/queues` shows lastProcessedBlock + stale if tip older than 10 min |
| Coverage incomplete | Explicit note — never claim complete monitoring |

---

## Phase-2 (not day-1)

- Base Registry V2 writes  
- ENS staging memory as legacy deep link only  
- 5→40 queue scale  
- Safe Transaction Service auto-import  

See [PRODUCT_LAW.md](./PRODUCT_LAW.md) · [USER_READY.md](./USER_READY.md)
