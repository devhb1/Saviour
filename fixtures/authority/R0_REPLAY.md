# R0 Replay — 16 Nov 2026 Roles drain

**Date:** 17 Nov 2026 (rev 2 — no injection theater)  
**Status:** Continue engineering — v1 fixture reader landed; full v1 trees still UNKNOWN  
**Safe:** `0x595362A906a0B4e90AEe1430b1f80FDDe2bE80de`  
**Roles:** `0x729c87d1B6939C9b2b0858ac25E235E83E5e6410`  
**Mastercopy:** `0xd8df…1889` (**Roles v1** — not v2.1.1)  
**Operator:** `0x065F395147FC72747c7f48f67f039d4235884148`  
**Block before theft:** `26427326` · **Drain block:** `26427327`

## Acceptance criteria (what R0 must prove)

1. Permissions/members that existed immediately before the incident tx (or honest UNKNOWN).  
2. Whether the configured policy would have **permitted** the drain path.  
3. Which options/conditions/allowances enabled it (when readable).  
4. What Saviour would report at `26427326`.  
5. Consistency with execution at `26427327`.

## What Saviour may claim

> This principal had authority under the configured policy at the pinned block (when reconstructed).

## What Saviour must not claim

> Operators never intended this · we would have prevented the drain · compromised-key detection.

## Observed (engine)

| Check | Result |
|---|---|
| Public addresses / drain block | Confirmed |
| Roles version | **v1** — must not use v2.1.1 adapter |
| Fixture reader | `rolesV1Fixture.readNov16V1AtBlock` — identity + `getMemberRoles` probe |
| Full v1 permission trees | **Not reconstructed** → Coverage UNKNOWN for spend bounds |
| CLI `pnpm reach:cli --fixture nov16` | May still label `assumption:freeRecipientTransferSuspected` for fixture demos — **loud assumption**, not a public API flag and not a differential proof |
| Pattern without assumption | Topology may yield `roles-no-delay` WARN; free-recipient CRITICAL only from reconstruction or explicit fixture assumption |

## Gate decision

| Outcome | Action |
|---|---|
| Flagged UNBOUNDED / intent break from reconstruction | Continue → R1 |
| Would not have flagged without assumption | Narrow claim or fix v1 model |
| Cannot reconstruct | Roles-read blocker for Grant hero |

**Current decision:** **Continue** — R0 identity + membership probe works; **do not** claim R0 complete until free-recipient (or equivalent) is derived from v1 trees or explicitly documented as UNKNOWN. Public Blast Radius / Permission Auditor “complete” claim stays gated on **R1 (v2.1.1 differential)**.

## Public artifact

Publish: Safe + Roles + blocks + expected vs actual summary.  
Hold private: exploit-ready condition encodings for similar live wallets.
