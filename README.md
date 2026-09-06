# SAVIOURS

Security memory for autonomous agents.

Investigate a suspicious onchain target once, persist the result as
machine-readable security memory (Sepolia registry + ENSv2 identity), and
let later agents query that memory before they act.

> Investigate once. Remember forever. Block instantly next time.

## Stack

- pnpm workspaces · Node 20 · TypeScript
- Next.js App Router (`apps/web`)

## Layout

```text
saviours/
├── apps/web/          # Next.js UI + API route handlers
├── packages/core/     # domain logic (graph, evidence, investigator, ...)
├── contracts/         # Foundry (Sepolia) — added with the first contract
├── prompts/           # investigator prompt templates
└── docs/
```

## Develop

```bash
pnpm install
pnpm dev
```
- Foundry + OpenZeppelin (Sepolia)
- The Graph (live evidence) · ENSv2 (incident identity)
- AI investigates; deterministic code validates and writes state

## Tracks (ETHOnline 2026)

- The Graph — Best AI Tooling / AI Use Case (Start Fresh)
- The Graph — Composable / Standardized Graph Products
- ENS — Best Use of ENSv2

## Docs

- [Sources](docs/SOURCES.md)

Architecture, threat model, Graph queries, ENS, security receipt, AI usage,
and demo notes will be written as those parts of the system land.

## License

ETHOnline 2026.
