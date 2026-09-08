# Graph queries

## Endpoints / providers

- Gateway: `https://gateway.thegraph.com/api/<GRAPH_API_KEY>/subgraphs/id/<ID>`
- Key: Subgraph Studio **query** API key (not deploy key)
- Product paths: **live only** — fixtures only under `/evals`

## Live Messari standardized subgraphs (mainnet)

Checked live 2026-09-07 / re-confirmed by `pnpm p0:discover` 2026-09-07 / **fan-out verified `pnpm check:standard` 2026-09-08**.

| Protocol | Schema family | Subgraph ID | Status |
|---|---|---|---|
| Aave V3 | lending-cdp 3.1.0 | `JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk` | live |
| Compound V3 | lending-cdp 3.1.0 | `AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9` | live |
| Spark Lend | lending-cdp 3.1.0 | `GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si` | live |
| MakerDAO | lending-cdp 2.0.1 | `8sE6rTNkPhzZXZC6c8UQy2ghFTu5PPdGauwUBm4t7HZ1` | live (legacy account counts) |
| Uniswap V3 | dex-amm-extended 4.0.0 | `4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6` | live (`swaps where: { account }`) |
| SushiSwap | dex-amm 1.3.2 | `77jZ9KWeyi3CJ96zkkj5s1CojKPHt6XJKjLFzsDCd8Fd` | live (`swaps where: { from }` / `{ to }` — **no `account` on Swap**) |
| Curve | dex-amm 1.3.0 | `3fy93eAT56UJsRCEht8iFhfi6wjHWXtZ9dnnbQmvFopF` | live (same `from`/`to`) |
| Yearn V2 | yield-aggregator 1.3.0 | `FDLuaz69DbMADuBjJDEcLnTuPnjhZqNbFVrkNiBLGkEg` | live (`deposits`/`withdraws` where `{ from }`) |

## Product code

| Module | Role |
|---|---|
| `packages/core/src/graph/protocols.ts` | `STANDARD_PROTOCOLS` + `EXCLUDED_PROTOCOLS` |
| `packages/core/src/graph/standardQueries.ts` | One GraphQL template per schema family |
| `packages/core/src/graph/standard.ts` | `fanOut(address)` — `Promise.allSettled`, per-protocol ms, Evidence mapping |
| `pnpm check:standard [addr]` | Live gate (default ATTACK-1) |

## Excluded (do not query in product)

| Protocol | Subgraph ID | Reason (7 Sep 2026) |
|---|---|---|
| Balancer V2 | `794H6CNzdGF5YfBK9nPsUgGn7EBbdJSCTjgcKPEPyFnn` | indexing_error on network |
| PancakeSwap V3 | `JAGXF8B14mpB8QGKnwhKTs5JxsQZBJQvbDGFcWwL7gbm` | no allocations |
| Convex | `7rFZ2x6aLQ7EZsNx8F5yenk4xcqwqR3Dynf9rdixCSME` | indexing_error |

State exclusions on the Coverage panel (PIVOT §3.5).

## Second Graph product (Composable)

- Community Uniswap V3: `5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV` — Adapter A (keep).

## Query purpose

| Purpose | Schema | Entities |
|---|---|---|
| Flashloan / liquidate threat shape | lending-cdp | `account`, `flashloans`, `liquidates` |
| Swap context / same-tx intersect | dex-amm / extended | `account` (ext) or `from`/`to` (1.3) + `swaps.hash` |
| Yield presence | yield-aggregator | `deposits`/`withdraws` by `from` |
| Standards leverage banner | all | one template × N subgraph ids |

## Standardized schema justification

Messari shared `hash` semantics enable `ATOMIC_MULTI_PROTOCOL` (same tx across protocols) and “add a protocol = one table row.”  
**S1.2 fix:** classic dex-amm 1.3 does **not** expose `Swap.account` — fan-out uses dual `from`/`to` filters (live-verified 2026-09-08).

## Live fan-out sample (ATTACK-1 MakinaFi · 2026-09-08)

```
5 query templates · 8 protocols · 70 rows · ~1310ms
aave-v3: flashloan USDC ≈$119,391,141 tx 0x569733b8…0651f5
uniswap-v3 + sushi + curve: swap rows present
compound / spark / maker / yearn: protocol context only (empty activity)
```

## P0 discover notes (2026-09-07)

- MakinaFi `0x935bfb…ede48`: Aave flashloanCount=1, maxFl≈$119M, also Uniswap V3 → **strong ATTACK-1**.
- Euler exploiter: **no Messari account rows** → weak for live demo unless Coverage explains.
- Shared flashloan↔dex tx was blocked by wrong Sushi/Curve filter → **fixed in S1.2**.
- BOT: `0x352423e2…23cc7` flashloanCount=15027 → WATCH contrast.

## Example queries

See `packages/core/src/graph/standardQueries.ts` and `scripts/p0-discover.ts`.
