# SAVIOURS

**Security memory for autonomous agents.**

Investigate a suspicious onchain target once, turn the evidence into persistent
machine-readable security memory (Sepolia registry + ENSv2 identity), and let
every future agent query that memory before acting.

> Investigate once. Remember forever. Block instantly next time.

## Status

Day 0 starter monorepo. Packages and apps are created **just-in-time** per build
step — this root only holds workspace config, Cursor rules, docs, and prompts.

## Stack (locked)

- pnpm workspaces · Node 20 · TypeScript
- Next.js App Router (`apps/web` — created when UI/API is needed)
- Foundry + OpenZeppelin (Sepolia)
- The Graph (live evidence) · ENSv2 (incident identity)
- AI investigates; deterministic code validates and writes state

## Tracks (ETHOnline 2026)

- The Graph — Best AI Tooling / AI Use Case (Start Fresh)
- The Graph — Composable / Standardized Graph Products
- ENS — Best Use of ENSv2

## Docs

- [`docs/SAVIOURS MASTER.MD`](docs/SAVIOURS%20MASTER.MD) — product source of truth
- [`docs/SAVIOURS_CURSOR_STEPS.md`](docs/SAVIOURS_CURSOR_STEPS.md) — 55-step build ladder
- [`docs/SAVIOURS_MASTER_BUILD_PLAN.md`](docs/SAVIOURS_MASTER_BUILD_PLAN.md) — phases
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — running decision log
- [`docs/SOURCES.md`](docs/SOURCES.md) — official doc registry

## Workspace

```text
saviours/
├── .cursor/rules/     # engineering invariants
├── docs/              # spec, steps, decisions
├── prompts/           # Cursor / investigator prompts
├── package.json       # pnpm workspace root
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

`apps/*`, `packages/*`, and `contracts/` appear in later steps when first needed.

## License

Hackathon project — ETHOnline 2026.
