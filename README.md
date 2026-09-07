# SAVIOURS

**Every onchain threat gets a name. Any agent can resolve it.**

SAVIOURS investigates a suspicious address once — with one Messari standardized
query fanned out across eight DeFi protocols on The Graph — and turns the
verified finding into a **named, evidence-attached, permissioned, expiring
incident record on ENSv2**. Any agent, wallet, or plain `cast` call can resolve
the verdict afterwards without touching our servers.

Think **CVE for onchain threats**: detection networks (Forta, Pista, Blockaid)
find things; SAVIOURS names them so everyone can reference the same finding.

> Forta and similar networks are excellent at ambient, continuous detection —
> that's not what we're building. SAVIOURS takes a single verified finding and
> turns it into a portable, ENS-resolvable evidence trail that anything can
> verify without integrating with our network at all.

ETHOnline 2026 · Start Fresh · Tracks: The Graph Composable/Standardized ·
The Graph AI Use Case · ENS Best Use of ENSv2.

## The loop

```text
address ─► 1 standardized query × 8 protocols (The Graph, live)
        ─► deterministic signals (flashloan one-shot, atomic multi-protocol tx, drain fan-in …)
        ─► AI explains · validator decides (TAINTED needs a threat-class signal)
        ─► <address>.<parent>.eth on ENSv2 Sepolia
              text records: saviours.status / threat / evidenceHash / dossier / investigator
              expiry: WATCH 7 days · TAINTED 10 years · non-transferable · revocable
              roles: investigator key may set only saviours.* records; disputer key only status/dispute
        ─► SavioursRegistry (Sepolia) ledger of evidenceHash + ensNode
        ─► Shield: resolve ENS → BLOCK / WARN / ESCALATE, no Graph, no AI, ~150 ms
```

## Verify a verdict with zero SAVIOURS code

```bash
cast call 0xF479306621F718F7d76875f67506ceD33717751c \
  "text(bytes32,string)(string)" \
  $(cast namehash <target-address>.savioursqsy56o.eth) saviours.status \
  --rpc-url $SEPOLIA_RPC_URL
```

## Run it

```bash
pnpm install
cp .env.example .env        # GRAPH_API_KEY (Studio query key), OPEN_AI_API_KEY,
                            # SEPOLIA_RPC_URL, MAINNET_RPC_URL, RELAYER_PRIVATE_KEY,
                            # INVESTIGATOR_PRIVATE_KEY, DISPUTER_PRIVATE_KEY, IPFS_PINNING_TOKEN
pnpm dev                    # http://localhost:3000
pnpm mcp                    # MCP server: check_target · investigate_target · get_incident
```

Checks (all hit live services):

```bash
pnpm check:standard <addr>  # 1 query · N protocols banner
pnpm check:evidence         # evidence + signals for locked demo targets
pnpm check:investigate      # Graph → signals → AI → validator
pnpm check:remember-ens     # ENS name + records + registry write (Sepolia)
pnpm check:ens-roles        # investigator denied on saviours.dispute, disputer allowed
pnpm check:shield           # ENS-first Shield
pnpm eval:rules             # validator unit tests (synthetic rows, /evals only)
pnpm eval:live              # demo targets expected vs actual
pnpm test:contracts         # Foundry
```

## Standards leverage (The Graph)

One query template per Messari schema, one table of subgraph ids. Adding a
protocol is one row. Because `hash` and `account` mean the same thing on every
protocol, "same transaction touched Aave and Curve" is a set intersection, not
an integration.

| Protocol | Schema | Subgraph |
|---|---|---|
| Aave V3 | lending-cdp 3.1.0 | `JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk` |
| Compound V3 | lending-cdp 3.1.0 | `AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9` |
| Spark Lend | lending-cdp 3.1.0 | `GbKdmBe4ycCYCQLQSjqGg6UHYoYfbyJyq5WrG35pv1si` |
| MakerDAO | lending-cdp 2.0.1 | `8sE6rTNkPhzZXZC6c8UQy2ghFTu5PPdGauwUBm4t7HZ1` |
| Uniswap V3 | dex-amm-extended 4.0.0 | `4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6` |
| SushiSwap | dex-amm 1.3.2 | `77jZ9KWeyi3CJ96zkkj5s1CojKPHt6XJKjLFzsDCd8Fd` |
| Curve | dex-amm 1.3.0 | `3fy93eAT56UJsRCEht8iFhfi6wjHWXtZ9dnnbQmvFopF` |
| Yearn V2 | yield-aggregator 1.3.0 | `FDLuaz69DbMADuBjJDEcLnTuPnjhZqNbFVrkNiBLGkEg` |

Plus the community Uniswap V3 subgraph as a second Graph product. All queries
go through the Graph Network gateway with a Studio query key. No mocks in
product paths; fixtures live only under `/evals`.

## ENSv2 (Sepolia)

| Feature | How SAVIOURS uses it |
|---|---|
| Hierarchical registry | parent `.eth` → own `UserRegistry` of incident names |
| Permissioned Resolver | verdict lives in the name's text records |
| Enhanced Access Control | `authorizeTextRoles` per key: investigator ≠ disputer ≠ admin |
| Expiry | WATCH names expire in 7 days; TAINTED in 10 years; `renew` on re-confirm |
| Revocable / non-transferable | `unregister`; no `ROLE_CAN_TRANSFER_ADMIN` |
| Agents as namespaces | `investigator-01.<parent>.eth` holds the scoped write roles |

Addresses live in `deployments/*.json`, never in `.env`.

## Layout

```text
apps/web/          Next.js UI + API routes (/api/investigate, /api/shield, /api/govern)
packages/core/     graph · evidence · signals · investigator · classifier · ens · registry · shield · dossier
packages/mcp/      MCP server over core
contracts/         Foundry: SavioursRegistry (Sepolia)
evals/             validator unit fixtures + locked demo targets
docs/              PIVOT.md is the product spec; ARCHITECTURE, GRAPH_QUERIES, ENS, AI_USAGE, DEMO
```

## Chain boundary

Evidence: Ethereum mainnet via The Graph (`Incident.chainId = 1`).
Memory: Sepolia (ENSv2 beta + SavioursRegistry). Local proof: Anvil.

## AI disclosure

The investigator uses an LLM to explain evidence and propose a status. Code
computes signals, a deterministic validator decides, and only role-scoped keys
write state. Development was AI-assisted (Cursor); see `docs/AI_USAGE.md`.

## Docs

`docs/PIVOT.md` (spec) · `docs/ARCHITECTURE.md` · `docs/GRAPH_QUERIES.md` ·
`docs/ENS.md` · `docs/DECISIONS.md` · `docs/SOURCES.md` · `docs/SUBMISSION.md`

MIT.
