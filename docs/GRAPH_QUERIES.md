# Graph queries

Evidence substrate for Investigate. Companion: [ARCHITECTURE.md](./ARCHITECTURE.md) · [BAZANTIC.md](./BAZANTIC.md).

## Endpoints / providers

- Gateway: `https://gateway.thegraph.com/api/<GRAPH_API_KEY>/subgraphs/id/<ID>`
- Key: Subgraph Studio **query** API key (not deploy key)
- Product paths: **live only** — fixtures only under `/evals`

## Live Messari standardized subgraphs (mainnet)

Checked live 2026-09-07 · fan-out verified `pnpm check:standard` / `eval:live` through finalist cut.

| Protocol | Schema family | Subgraph ID | Status |
|---|---|---|---|
| Aave V3 | lending-cdp 3.1.0 | `JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk` | live |
| Compound V3 | lending-cdp 3.1.0 | `AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9` | live |
| Spark Lend | lending-cdp 3.1.0 | `GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si` | live |
| MakerDAO | lending-cdp 2.0.1 | `8sE6rTNkPhzZXZC6c8UQy2ghFTu5PPdGauwUBm4t7HZ1` | live (legacy account counts) |
| Uniswap V3 | dex-amm-extended 4.0.0 | `4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6` | live (`swaps where: { account }`) |
| SushiSwap | dex-amm 1.3.2 | `77jZ9KWeyi3CJ96zkkj5s1CojKPHt6XJKjLFzsDCd8Fd` | live (`from`/`to` — no `account` on Swap) |
| Curve | dex-amm 1.3.0 | `3fy93eAT56UJsRCEht8iFhfi6wjHWXtZ9dnnbQmvFopF` | live (same `from`/`to`) |
| Yearn V2 | yield-aggregator 1.3.0 | `FDLuaz69DbMADuBjJDEcLnTuPnjhZqNbFVrkNiBLGkEg` | live (`deposits`/`withdraws` by `from`) |

## Product code

| Module | Role |
|---|---|
| `packages/core/src/graph/protocols.ts` | `STANDARD_PROTOCOLS` + `EXCLUDED_PROTOCOLS` |
| `packages/core/src/graph/standardQueries.ts` | One GraphQL template per schema family |
| `packages/core/src/graph/standard.ts` | `fanOut(address)` — `Promise.allSettled`, per-protocol ms |
| `pnpm check:standard [addr]` | Live gate (default ATTACK-1) |

## Excluded (Coverage panel)

| Protocol | Subgraph ID | Reason |
|---|---|---|
| Balancer V2 | `794H6CNzdGF5YfBK9nPsUgGn7EBbdJSCTjgcKPEPyFnn` | indexing_error |
| PancakeSwap V3 | `JAGXF8B14mpB8QGKnwhKTs5JxsQZBJQvbDGFcWwL7gbm` | no allocations |
| Convex | `7rFZ2x6aLQ7EZsNx8F5yenk4xcqwqR3Dynf9rdixCSME` | indexing_error |

## Second Graph product (Composable)

- Community Uniswap V3: `5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV` — Adapter A.

## Query purpose

| Purpose | Schema | Entities |
|---|---|---|
| Flashloan / liquidate | lending-cdp | `account`, `flashloans`, `liquidates` |
| Swap / same-tx intersect | dex-amm / extended | `account` or `from`/`to` + `swaps.hash` |
| Yield presence | yield-aggregator | `deposits`/`withdraws` by `from` |
| Standards banner | all | one template × N subgraph ids |

## Standardized schema justification

Messari shared `hash` enables `ATOMIC_MULTI_PROTOCOL`. Classic dex-amm 1.3 has no `Swap.account` — fan-out uses dual `from`/`to` filters.

## Live sample (ATTACK-1 MakinaFi)

```
5 query templates · 8 protocols · ~100+ rows
signals: FLASHLOAN_ONE_SHOT + ATOMIC_MULTI_PROTOCOL → TAINTED
same-tx e.g. aave-v3/flashloan + curve/swap on 0x569733b8…
```

## Example queries

See `packages/core/src/graph/standardQueries.ts` and `scripts/p0-discover.ts`.
