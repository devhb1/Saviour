# SAVIOURS

**Every onchain threat gets a name. Any agent can resolve it.**

SAVIOURS investigates a suspicious address once — one Messari standardized query
fanned out across eight DeFi protocols on The Graph — and turns a verified finding
into a **named, evidence-attached, permissioned, expiring incident on ENSv2**.
Any agent, wallet, MCP client, or plain `cast` call can resolve the verdict afterwards
without touching our servers.

Think **CVE for onchain threats**: detection networks (Forta and similar) find things;
SAVIOURS **names** them so everyone can reference the same finding.

> Forta detects. SAVIOURS remembers.

ETHOnline 2026 · Start Fresh · Tracks: **The Graph Composable/Standardized** ·
**The Graph AI Use Case** · **ENS Best Use of ENSv2**.

## The loop

```text
address ─► 1 query template × 8 Messari protocols (The Graph, live)
        ─► deterministic signals (FLASHLOAN_ONE_SHOT ∧ ATOMIC_MULTI_PROTOCOL · …)
        ─► AI explains · validator decides (TAINTED needs a threat-class signal)
        ─► <address>.savioursqsy56o.eth on ENSv2 Sepolia
              saviours.status / threat / evidenceHash / dossier / investigator / dispute
              expiry: WATCH 7d · TAINTED 10y · non-transferable · revocable
              EAC: investigator ≠ disputer text keys (live revert demo)
        ─► SavioursRegistry (Sepolia) + optional IPFS dossier
        ─► Shield: ENS-first → BLOCK / WARN / ESCALATE · 0 Graph · 0 AI
```

## Verify with zero SAVIOURS code

```bash
cast call 0xF479306621F718F7d76875f67506ceD33717751c \
  "text(bytes32,string)(string)" \
  $(cast namehash 0x935bfb495e33f74d2e9735df1da66ace442ede48.savioursqsy56o.eth) \
  saviours.status \
  --rpc-url $SEPOLIA_RPC_URL
# → "TAINTED"
```

Or open `consumers/plain-shield.html` (public RPC + resolver ABI only — Next server not required).

## Quick start

```bash
pnpm install
cp .env.example .env
# Required for Shield / ENS: SEPOLIA_RPC_URL
# Required for Investigate:   GRAPH_API_KEY, AI_API_KEY (or OPEN_AI_API_KEY)
# Required for Remember:      RELAYER_PRIVATE_KEY (+ INVESTIGATOR_/DISPUTER_ optional)
# Optional dossier pin:       IPFS_PINNING_TOKEN (Pinata JWT)

pnpm dev          # http://localhost:3000 — Investigate · Resolve · Govern
pnpm mcp          # Cursor MCP: check_target · investigate_target · get_incident
```

## Live gates (no static chain payloads in product paths)

```bash
pnpm check:standard          # Messari fan-out banner
pnpm check:evidence          # live Graph + signals
pnpm check:investigate       # Shield → Graph → AI → validator
pnpm check:remember-ens      # ENS name + registry write
pnpm check:ens-roles         # investigator dispute REVERT · disputer OK
pnpm check:shield            # ENS-first MEMORY HIT
pnpm check:govern            # dispute → WARN · revoke drops ENS
pnpm check:cooccur           # REGISTRY_COOCCURRENCE on live Graph edge
pnpm check:dossier           # Pinata (or public JSON) + saviours.dossier fetch
pnpm check:provenance        # ATTACK-1 same-tx edges
pnpm check:plain-shield      # BLOCK without Next
pnpm check:incidents         # seeded ∪ live list
pnpm check:mcp               # check_target → BLOCK · source ENS
pnpm eval:rules              # unit fixtures only (/evals)
pnpm eval:live               # locked demo-targets vs live Graph
pnpm test:contracts          # Foundry
```

## Monorepo

| Path | Role |
|---|---|
| `apps/web` | Next.js UI + API routes |
| `packages/core` | Graph · signals · investigate · ENS · Shield · dossier |
| `packages/mcp` | MCP stdio server |
| `contracts` | SavioursRegistry (Foundry) |
| `consumers/plain-shield.html` | Zero-SDK ENS consumer |
| `evals/` | Locked demo-targets + unit fixtures |
| `deployments/` | Sepolia registry + ENS identity + seed/live indexes |

## Identity (Sepolia · do not invent)

| Item | Value |
|---|---|
| Parent | `savioursqsy56o.eth` |
| PermissionedResolver | `0xF479306621F718F7d76875f67506ceD33717751c` |
| UserRegistry | `0x3BA6b1c9F0018cac383C17C2ACA5A4dC0F370De5` |
| SavioursRegistry | `0x8f246dd1f7bdd6d169b3cdb77e95d4e84eaff5db` |
| Investigator NS | `investigator-01.savioursqsy56o.eth` |

Full tables: `docs/ENS.md`, `deployments/sepolia-ens-identity.json`, `deployments/sepolia.json`.

## Docs

| Doc | Contents |
|---|---|
| `docs/ARCHITECTURE.md` | Modules · data flow · trust boundary |
| `docs/GRAPH_QUERIES.md` | Live subgraph ids · exclusions · fan-out |
| `docs/ENS.md` | ENSv2 identity · roles · records · cast |
| `docs/AI_USAGE.md` | AI disclosure · product prompts |
| `docs/DEMO.md` | Demo targets · beats · recovery |
| `docs/SUBMISSION.md` | ETHGlobal form copy |
| `docs/PIVOT.md` | Product law (finalist cut) |

## Standards leverage (The Graph)

One query template per Messari schema, one table of subgraph ids. Adding a protocol is one row.
Shared `hash` semantics make `ATOMIC_MULTI_PROTOCOL` a set intersection — not a custom integration.

See `docs/GRAPH_QUERIES.md` for the live eight + Balancer/Pancake/Convex exclusions.
