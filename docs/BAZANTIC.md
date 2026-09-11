# Bazantic — agent gateway for SAVIOURS

Meters the same Investigate → Name → Resolve loop for agents. Does **not** replace Graph or ENS.


|          |                                                                          |
| -------- | ------------------------------------------------------------------------ |
| Gateway  | [https://saviour.bazgateway.com](https://saviour.bazgateway.com)         |
| MCP      | [https://saviour.bazgateway.com/mcp](https://saviour.bazgateway.com/mcp) |
| Upstream | [https://saviour-gilt.vercel.app](https://saviour-gilt.vercel.app)       |
| Tools    | `info` · `shieldCheck` · `investigate`                                   |
| Pricing  | Shield **$0** · Investigate **~$0.01** USDC on Base (x402)               |


**Who pays:** the calling agent (Bazantic account / x402), not the website. MEMORY HIT stays free forever.

## UI proof surfaces


| Surface                                   | What judges see                                                      |
| ----------------------------------------- | -------------------------------------------------------------------- |
| **02 Investigate** · Agent Client Console | Live ENS → HTTP 402 → optional settle · second agent `$0`            |
| **02 / Build** · Bazantic pay panel       | Probe `$0` · show 402 · pay & investigate                            |
| **Footer / Shield**                       | “Shield free forever. Fresh investigate $0.01, metered by Bazantic.” |


Pitch: Graph + ENS first. Bazantic = settlement at the miss — never the hero detector claim.

## Verified live  — `pnpm bazantic:e2e` + real x402 settle


| Beat                               | Result                                              |
| ---------------------------------- | --------------------------------------------------- |
| OpenAPI upstream                   | **200** `/openapi-saviours.json`                    |
| `shieldCheck` ATTACK-1             | **200 BLOCK** · usedAi=false · $0                   |
| `shieldCheck` BOT-1                | **200 WARN** · $0                                   |
| `investigate` unpaid               | **402** x402 · network=`base` · 10000 (=$0.01 USDC) |
| `investigate` + Bearer JWT         | **200 TAINTED** · graph+AI (developer bypass)       |
| `investigate` **real x402 settle** | **200 TAINTED** · paid **$0.01 USDC on Base**       |
| MCP `initialize` + `tools/list`    | **LIVE** · 3 tools                                  |




### Live payment receipt (Base mainnet)


|               |                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| Amount        | **$0.01 USDC**                                                                                                     |
| Network       | `base`                                                                                                             |
| Payer / payTo | `0x270Cf6fFda0C1a149CE17FA7798d9bFa738D05eB`                                                                       |
| Tx            | `[0xa9629758…d4ae47e](https://basescan.org/tx/0xa9629758355a835f8859d82c118497d3cb82ba81c7f5e21f1ab9e8b74d4ae47e)` |
| Result        | assessment `TAINTED` · persist=false                                                                               |


```bash
# Grant must be on Base mainnet (gateway invoices `network: base`, not sepolia)
bazantic login
bazantic grant create --name film-base --cap 1 --network base

bazantic curl https://saviour.bazgateway.com/api/investigate \
  -X POST -H 'content-type: application/json' \
  -d '{"chainId":1,"address":"0x935bfb495e33f74d2e9735df1da66ace442ede48","persist":false,"forceFresh":true,"registryNetwork":"sepolia"}' \
  --account film-base --network base --max-amount 0.05 --yes --json
```



### Two ways to pay investigate

1. **Developer JWT** (`Authorization: Bearer …`) — bypasses 402 for your own testing; used by `pnpm bazantic:e2e`.
2. **End-user x402** — unpaid call returns 402; settle with CLI grant on `--network base` (see receipt above).



## Product law (pricing)


| Call                     | Price     | Why                                   |
| ------------------------ | --------- | ------------------------------------- |
| `POST /api/shield/check` | **$0**    | MEMORY HIT — 0 Graph · 0 AI           |
| `POST /api/investigate`  | **$0.01** | Graph + AI explain + validator (miss) |


Never charge for an ENS hit.

## Surfaces


| Spec            | Path                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| OpenAPI         | [https://saviour-gilt.vercel.app/openapi-saviours.json](https://saviour-gilt.vercel.app/openapi-saviours.json) |
| Recipe          | `[docs/recipes/saviours-agent-shield.md](./recipes/saviours-agent-shield.md)`                                  |
| Register helper | `pnpm bazantic:register`                                                                                       |
| **E2E gate**    | `pnpm bazantic:e2e`                                                                                            |




## Env

```bash
BAZANTIC_API_KEY=…          # or BAZENTI_API_KEY alias (JWT from dashboard)
PUBLIC_APP_URL=https://saviour-gilt.vercel.app   # no #hash
# optional:
# BAZANTIC_GATEWAY_URL=https://saviour.bazgateway.com
# BAZANTIC_PAID_CURL=1 BAZANTIC_PAY_ACCOUNT=film
```



## Agent quick start

```bash
claude mcp add --transport http saviour \
  https://saviour.bazgateway.com/mcp
```

Or Cursor: **ADD TO CURSOR** on the Bazantic gateway page.

## Prize targeting ([ETHOnline](https://ethglobal.com/events/ethonline2026/prizes/bazantic))


| Prize                      | Call                                          |
| -------------------------- | --------------------------------------------- |
| Help an Agent…             | Skip (Continuity only)                        |
| **Agentify a new API**     | Primary — gateway live + e2e green            |
| Best Recipe + sponsor APIs | Stretch — paste Recipe + A/B screen recording |


**Operator still:** paste `[docs/recipes/saviours-agent-shield.md](./recipes/saviours-agent-shield.md)` in Bazantic UI · A/B Recipe-vs-raw clip · username on submission form.

## Pitch (secondary to film)

*Bazantic meters investigate-once vs remember-forever — Shield free; Graph miss paid.*

Film tattoo: *The Graph paid for the first investigation. ENS is why the second agent pays nothing.*

## Demo addresses


| Address                                                 | Shield  |
| ------------------------------------------------------- | ------- |
| `0x935bfb495e33f74d2e9735df1da66ace442ede48` (ATTACK-1) | `BLOCK` |
| `0x352423e2fa5d5c99343d371c9e3bc56c87723cc7` (BOT-1)    | `WARN`  |


