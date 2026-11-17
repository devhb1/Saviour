# Intent file spec (v1)

Token **quantities** only. **No USD fields.**

```json
{
  "safe": "0x…",
  "chain": 1,
  "role": "keeper-bot",
  "may_call": [
    {
      "target": "0x… or symbol",
      "functions": ["supply", "withdraw"],
      "recipient": "must_equal_safe",
      "max_amount": {
        "token": "USDC",
        "per_day": "250000000000"
      }
    }
  ],
  "must_not": ["delegatecall", "call_to_self", "approve_to_unlisted_spender"],
  "revocation": { "max_latency_hours": 24 }
}
```

## Rules

| Field | Meaning |
|---|---|
| `may_call` | Declared allow-list |
| `recipient: must_equal_safe` | Outbound recipient must be the Safe |
| `max_amount` | Native token decimals as decimal **string** |
| `must_not` | Hard bans — CI fails if Reach patterns hit these |

Parser rejects any `max_value_usd*` keys.

## Fail-closed CI

| Reach principal | Result |
|---|---|
| `UNBOUNDED` vs declared limits | `FAIL` |
| `UNKNOWN` (requireKnown=true, default) | `INCONCLUSIVE` — CI non-green, never silent pass |
| All relevant principals constrained + ⊆ intent | `PASS` |

## Check

```bash
pnpm intent:cli --intent fixtures/intent/reference-keeper.json --safe 0x…
```

Exit `2` on breaks. UNKNOWN Reach principals are noted; fail-closed recommended for production CI once Roles trees land.
