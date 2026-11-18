# Golden report format

Schema version `1.2.0`. Produced by `toGoldenReport` / `pnpm reach:cli --out file.json`.

The digest ignores `generatedAt`, the RPC host, `errors`, and reconstructed lines that only name the log index (`chain.logsSource:` and `chain.logs:`). Object keys are sorted. A match means those two runs used this engine on the same block. It does not mean a second implementation read the policy.

## Fields

| Field | Meaning |
|---|---|
| `schemaVersion` | `1.2.0` |
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
