# Graph queries

## Endpoints / providers

- Gateway: `https://gateway.thegraph.com/api/<GRAPH_API_KEY>/subgraphs/id/<ID>`
- Key: Subgraph Studio **query** API key (not deploy key)
- Product paths: **live only** — fixtures only under `/evals`

## Live Messari standardized subgraphs (mainnet)

Checked live 2026-09-07 / re-confirmed by `pnpm p0:discover` 2026-09-07.

| Protocol | Schema family | Subgraph ID | Status |
|---|---|---|---|
| Aave V3 | lending-cdp 3.1.0 | `JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk` | live |
| Compound V3 | lending-cdp 3.1.0 | `AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9` | live |
| Spark Lend | lending-cdp 3.1.0 | `GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si` | live |
| MakerDAO | lending-cdp 2.0.1 | `8sE6rTNkPhzZXZC6c8UQy2ghFTu5PPdGauwUBm4t7HZ1` | live (older; protocol context) |
| Uniswap V3 | dex-amm-extended 4.0.0 | `4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6` | live (`swaps where: { account }`) |
| SushiSwap | dex-amm 1.3.2 | `77jZ9KWeyi3CJ96zkkj5s1CojKPHt6XJKjLFzsDCd8Fd` | live (account filter differs — fix in P1) |
| Curve | dex-amm 1.3.0 | `3fy93eAT56UJsRCEht8iFhfi6wjHWXtZ9dnnbQmvFopF` | live (same — fix in P1) |
| Yearn V2 | yield-aggregator 1.3.0 | `FDLuaz69DbMADuBjJDEcLnTuPnjhZqNbFVrkNiBLGkEg` | live |

## Excluded (do not query in product)

| Protocol | Subgraph ID | Reason (7 Sep 2026) |
|---|---|---|
| Balancer V2 | `794H6CNzdGF5YfBK9nPsUgGn7EBbdJSCTjgcKPEPyFnn` | indexing_error on network |
| PancakeSwap V3 | `JAGXF8B14mpB8QGKnwhKTs5JxsQZBJQvbDGFcWwL7gbm` | no allocations |
| Convex | `7rFZ2x6aLQ7EZsNx8F5yenk4xcqwqR3Dynf9rdixCSME` | indexing_error |

State exclusions on the Coverage panel (PIVOT §3.5).

## Second Graph product (Composable)

- Community Uniswap V3: `5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpKpSbxtgVENFV` — Adapter A (keep).

## Query purpose

| Purpose | Schema | Entities |
|---|---|---|
| Flashloan / liquidate threat shape | lending-cdp | `account`, `flashloans`, `liquidates`, `borrows`, `withdraws` |
| Swap context / same-tx intersect | dex-amm / extended | `account`, `swaps` |
| Yield presence | yield-aggregator | `account`, deposits/withdraws |
| Standards leverage banner | all | one template × N subgraph ids |

## Standardized schema justification

Messari shared `hash` / `account` semantics enable `ATOMIC_MULTI_PROTOCOL` (same tx across protocols) and “add a protocol = one table row.”

## P0 discover notes (2026-09-07)

- MakinaFi `0x935bfb…ede48`: Aave flashloanCount=1, maxFl≈$119M, also Uniswap V3 rows → **strong ATTACK-1**.
- Euler exploiter: **no Messari account rows** in our set → weak for live demo unless Coverage explains.
- Multi-protocol gate passed (≥2). No flashloan↔dex shared tx hashes yet (Sushi/Curve `account` filter invalid on 1.3.x) → PIVOT fallback: `FLASHLOAN_ONE_SHOT ∧ FRESH_ACCOUNT` until P1 fixes DEX filters.
- BOT candidate: `0x352423e2…23cc7` flashloanCount=15027 → WATCH contrast.

## Example queries

See `scripts/p0-discover.ts` and (P1) `packages/core/src/graph/standard.ts`.
