# Golden report format

Schema version `1.0.0`. Produced by `toGoldenReport` / `pnpm reach:cli --out file.json`.

## Fields

| Field | Meaning |
|---|---|
| `schemaVersion` | `1.0.0` |
| `product` | `saviour` |
| `feature` | `authority-audit` \| `blast-radius-reach-preview` |
| `engineVersion` / `rolesModelVersion` | Pin for re-verify |
| `freshness` | chainId · blockNumber · blockHash · rpc host |
| `coverage` | complete · gaps · reconstructed |
| `findings` | Rule hits |
| `reach` | Principals + BOUNDED/UNBOUNDED/UNKNOWN |
| `honesty` | Fixed disclaimer strings |

## Re-verify

```bash
pnpm reach:cli --safe 0x… --out report.json
# Compare freshness.blockNumber / engineVersion with shared report
```

Shareable UI: `/audit?safe=0x…` (copy share link on Audit page).
