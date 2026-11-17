# R0 Replay — 16 Nov 2026 Roles drain

**Date started:** 17 Nov 2026  
**Status:** In progress — fixture locked; full Roles tree reconstruction pending engine  
**Safe:** `0x595362A906a0B4e90AEe1430b1f80FDDe2bE80de`  
**Block before theft:** `26427326`  
**Drain block:** `26427327`

## Expected (pre-engine)

See `nov16-blast-radius.json` → `expectedVerdictBeforeEngine`: **UNBOUNDED** for operator role member (or UNKNOWN if unreadable).

## Observed so far (17 Nov 2026 RPC)

| Check | Result |
|---|---|
| Public addresses confirmed (Coindaro / Blockscout) | Yes — Safe, Roles, operator, drain block |
| `avatar()` / `target()` | Both = Safe `0x5953…80de` |
| `owner()` (Roles) | `0x9540efe2f8491f92E62e6309f5F67759b75C32a2` |
| Mastercopy (EIP-1167) | `0xd8dfc1d938d7d163c5231688341e9635e9011889` (Roles v1) |
| Module still enabled on Safe (latest) | Yes |
| Full permission tree at 26427326 | **Not yet reconstructed** — Coverage UNKNOWN for condition trees |
| `pnpm reach:cli --fixture nov16` | Suspect free-recipient → principal **UNBOUNDED**; trees still UNKNOWN Coverage |
| Would engine have flagged pre-theft? | **Provisional YES (UNBOUNDED)** on pattern + incident facts; **not** a full differential vs Zodiac App yet — R1 still open |

## Disagreements log (paper vs spike vs SDK)

| Item | Paper | Spike | SDK | Resolution |
|---|---|---|---|---|
| — | — | — | — | Fill during Roles read spike |

## Gate decision (update when write-up complete)

| Outcome | Action |
|---|---|
| Flagged UNBOUNDED / intent break | Continue → R1/R2; unlock Blast Radius public copy |
| Would not have flagged | Narrow claim or fix model |
| Cannot reconstruct | Roles-read blocker — no Grant / no hero |

**Current decision:** **Continue** — expected UNBOUNDED matches Reach preview under `suspectFreeRecipient`. Public Blast Radius **hero** still gated until differential Roles-tree evidence (R1) is written. Do **not** claim full reconstruction.

## Redacted public artifact

Publish: Safe + Roles addresses, drain block, expected vs actual verdict summary.  
Hold private: full condition parameter encodings if they remain useful as attack maps for similar live wallets.
