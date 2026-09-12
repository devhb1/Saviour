# Bazantic — advanced agent gateway for SAVIOURS

Bazantic meters **discovery**. ENS + The Graph remain the product.
Gateway does **not** replace Graph evidence or Sepolia memory.

| | |
|---|---|
| **Gateway (canonical)** | [https://saviours.bazgateway.com](https://saviours.bazgateway.com) |
| **MCP** | [https://saviours.bazgateway.com/mcp](https://saviours.bazgateway.com/mcp) · POST only |
| **Upstream** | [https://www.saviours.xyz](https://www.saviours.xyz) |
| **OpenAPI** | [https://www.saviours.xyz/openapi-saviours.json](https://www.saviours.xyz/openapi-saviours.json) |
| **Human guide** | [https://www.saviours.xyz/gateway](https://www.saviours.xyz/gateway) |
| **Recipes kit** | [`docs/recipes/PUBLISH_KIT.md`](./recipes/PUBLISH_KIT.md) |

> Retired host: `saviour.bazgateway.com` (singular). Use **`saviours.`** only.

**Who pays:** the calling agent (Bazantic grant / x402 on Base), not the website.  
**Law:** MEMORY HIT (`shieldCheck`) is **$0 forever** — no payment handshake.

---

## Architecture

```text
Agent / Recipe / MCP client
        │
        ▼
saviours.bazgateway.com     ← Bazantic: authz, x402 invoice, MCP tool surface
        │  free routes pass through
        │  paid routes → 402 until settled
        ▼
www.saviours.xyz            ← Next.js APIs (Shield, Investigate, Evidence, Ask…)
        │
        ├─ Sepolia ENS / registry   (memory · $0 reads)
        └─ Mainnet Graph + AI       (discovery · metered)
```

Code defaults live in `apps/web/src/lib/bazanticGateway.ts`  
(`BAZANTIC_GATEWAY_DEFAULT = https://saviours.bazgateway.com`).  
Override with env `BAZANTIC_GATEWAY_URL` / `NEXT_PUBLIC_BAZANTIC_GATEWAY_URL`.

---

## Pricing tiers (live gateway)

| Tier | Price | Routes |
|---|---|---|
| **Free** | `$0` | `POST /api/shield/check`, `GET /api/resolve`, `GET /api/resolve-target`, `GET /api/incidents`, `GET /api/catalog`, `POST /api/dossier/fetch`, `POST /api/fingerprint/recompute` |
| **Standard** | `~$0.01` | `POST /api/investigate`, `POST /api/bazantic/pay-investigate`, `POST /api/govern/*` |
| **Complex** | `~$0.05` | `POST /api/evidence`, `GET /api/evidence/{chainId}/{address}`, `POST /api/case/ask`, `POST /api/case/{address}/ask` |

Prefer **body** forms for agents: `POST /api/evidence`, `POST /api/case/ask`  
(path-param forms historically 404’d on Bazantic’s proxy).

---

## MCP tools (17 on live gateway)

`info` · `shieldCheck` · `investigate` · `payInvestigate` · `getEvidence` · `getEvidenceByPath` · `askCase` · `askCaseByPath` · `resolveEns` · `resolveTarget` · `listIncidents` · `fleetCatalog` · `fetchDossier` · `recomputeFingerprint` · `eacProbe` · `dispute` · `revoke`

**Agent recipes never bind:** `dispute`, `revoke`, `eacProbe` (operator-only; OpenAPI summaries say so).

```bash
claude mcp add --transport http saviours https://saviours.bazgateway.com/mcp
```

---

## Published recipes

| Recipe | Gateways | Spend shape |
|---|---|---|
| `safe-swap-with-memory` | Uniswap/quote + Saviours | **$0** on BLOCK (prize · multi-service) |
| `saviours-check-before-sign` | Saviours | **$0** hit · **$0.01** miss |
| `investigate-once-explain` | Saviours | **$0** / **$0.01** + **$0.05** depth |
| `dossier-deep-dive` | Saviours | **$0** (+ optional **$0.05** ask) |
| `fleet-triage` | Saviours | **$0×N** · **$0.01×miss** |

Paste / rebind / tests: [`recipes/PUBLISH_KIT.md`](./recipes/PUBLISH_KIT.md).

---

## Product surfaces in this repo

| Surface | Path |
|---|---|
| Build → Recipe | `SafeSwapRecipePanel` · `/api/recipes/safe-swap` |
| Playground → Bazantic meter | `BazanticPayPanel` |
| Build → Agent quick start | `AgentQuickStart` |
| Wallet gate pay path | `WalletGatePanel` → `/api/bazantic/pay-investigate` |
| Gateway landing | `/gateway` |
| Settle helpers | `bazanticGrantSettle.ts` · vendored `lib/vendor/bazantic/` |
| E2E / register | `pnpm bazantic:e2e` · `pnpm bazantic:register` · `pnpm recipe:safe-swap` |

---

## Settlement rails (label both)

1. **Developer JWT** (`BAZANTIC_API_KEY` / `BAZENTI_API_KEY`) — bypasses 402 for testing; UI marks `settlement: "developer-jwt"` (no Basescan tx).  
2. **End-user x402** — unpaid → **402** → settle with Bazantic grant on `--network base`; UI marks `x402-cli` / `x402-grant` **with** tx.

```bash
bazantic login
bazantic grant create --name film-base --cap 1 --network base

bazantic curl https://saviours.bazgateway.com/api/investigate \
  -X POST -H 'content-type: application/json' \
  -d '{"chainId":1,"address":"0x935bfb495e33f74d2e9735df1da66ace442ede48","persist":false,"forceFresh":true,"registryNetwork":"sepolia"}' \
  --account film-base --network base --max-amount 0.05 --yes --json
```

---

## Smoke gate (must stay green)

```bash
GW=https://saviours.bazgateway.com
ADDR=0x935bfb495e33f74d2e9735df1da66ace442ede48

curl -sS -X POST "$GW/api/shield/check" -H 'content-type: application/json' \
  -d "{\"chainId\":1,\"address\":\"$ADDR\",\"registryNetwork\":\"sepolia\"}"
# → 200 BLOCK · $0

curl -sS -o /dev/null -w '%{http_code}\n' -X POST "$GW/api/investigate" \
  -H 'content-type: application/json' \
  -d "{\"chainId\":1,\"address\":\"$ADDR\",\"persist\":false}"
# → 402

curl -sS -o /dev/null -w '%{http_code}\n' -X POST "$GW/api/evidence" \
  -H 'content-type: application/json' \
  -d "{\"chainId\":1,\"address\":\"$ADDR\"}"
# → 402 (not 404)

curl -sS -o /dev/null -w '%{http_code}\n' -X POST "$GW/api/case/ask" \
  -H 'content-type: application/json' \
  -d "{\"address\":\"$ADDR\",\"question\":\"why\"}"
# → 402 (not 404)
```

Full e2e (local grant): `pnpm bazantic:e2e`

---

## Env

```bash
BAZANTIC_API_KEY=…                 # or BAZENTI_API_KEY
BAZANTIC_GATEWAY_URL=https://saviours.bazgateway.com
PUBLIC_APP_URL=https://www.saviours.xyz
# Paid settle on Vercel / film:
# BAZANTIC_GRANT_JSON=…
# BAZANTIC_GATEWAY_DEVICE_KEY=…
# BAZANTIC_PAY_ACCOUNT=film-base
# BAZANTIC_PAY_NETWORK=base
```

---

## Prize targeting

| Prize | Status |
|---|---|
| **Agentify a new API** | Gateway LIVE + multi-service recipe `safe-swap-with-memory` |
| **Best Recipe + sponsor APIs** | Same multi-service artifact |
| Help an Agent… | Skip (Continuity) |

**Still manual for form:** Bazantic username · screen-record recipe abort on ATTACK-1.

---

## Feedback for Bazantic (if asked)

1. Path-param OpenAPI ops (`/api/evidence/{chainId}/{address}`, `/api/case/{address}/ask`) 404’d on the gateway proxy — body POSTs are the reliable agent path.  
2. `bazantic-cli` via pnpm broke Vercel packaging (symlink); we vendored a subset under `apps/web/src/lib/vendor/bazantic/`.  
3. Free routes must work with **no** payment handshake — `shieldCheck` does; keep it that way.
