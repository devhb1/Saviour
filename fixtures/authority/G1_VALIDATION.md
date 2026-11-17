# Gate G1 validation notes

**Date:** 17 Nov 2026  
**Command:** `pnpm audit:cli --fixture reference`  
**Safe:** `0x46DA347d1Db6EdCA62BF6Cd5892Dc284fC938613`

## Matched against live RPC / cast ground truth

| Field | Expected (fixture / cast) | Auditor |
|---|---|---|
| Safe VERSION | `1.3.0` | matched |
| Threshold | `1` | matched |
| Modules | Delay `0x35C99…` + `0xD9DdE…` | matched |
| Delay cooldown | `0` | matched → `DELAY_COOLDOWN_ZERO` |
| Delay expiration | `0` | matched → `DELAY_EXPIRATION_ZERO` |
| Bypass | non-Delay module on Safe with Delay present | matched → `DELAY_BYPASS_PATH` |

## Coverage honesty (still incomplete — expected)

- Roles members / permission trees for `0xD9DdE…` are **gaps** (MVP identity only).
- Do not treat report as proving “what the role can spend.”
- Operator / Zodiac-literate reviewer should confirm bypass + cooldown findings are useful before Safe Tx Service or Grant claims.

## Kill check

- [x] Graph owners/modules/Delay cooldown match ground truth at a pinned block  
- [x] Bypass finding fires for Term reference Safe  
- [x] P0 trust unit tests green (`@saviours/queuewatch`, `@saviours/check`)  
- [ ] External operator confirmation (human — not automated)

**Stop before STS/Grant until the unchecked box is done.**
