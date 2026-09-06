# Decision log

Technical decisions that affect architecture, track eligibility, or module
boundaries. Record the choice and the reason — not the discussion that
produced it.

## DEC-0001 — Official prize pages verified
Date: 2026-09-06

Verified the live ETHOnline 2026 prize pages before locking tracks.

- Graph AI is two pools (Start Fresh vs Continuity). This project is Start Fresh.
- ENS target is Best Use of ENSv2 (net-new, Sepolia), not the Continuity integration track.
- Messari Standardized Subgraphs is one example of a standardized schema, not the only qualifying path. Adapter choice waits until the demo data need is known.
- Graph Composable docs also include StreamingFast chain modules and Pinax EVM Substreams.

Sources: `docs/SOURCES.md`. Re-verify before submission.

## DEC-0002 — Create modules when they are first used
Date: 2026-09-06

Do not pre-create empty `apps/*` or `packages/*` shells.

A package, app, or contract directory is added in the commit that first
needs it, with only the dependencies that commit uses.

## DEC-0003 — One Next.js app as the runtime
Date: 2026-09-06

`apps/web` is a Next.js App Router app. Its route handlers are the API.
There is no separate Vite app and no `apps/api` service.

The shell exists so TypeScript, env, and later routes have a real home.
Investigation and Shield screens wait until those APIs exist.

## DEC-0004 — Do not pre-create unused packages
Date: 2026-09-06

`packages/graph`, contracts, investigator, etc. are added in the commit
that first needs them. Empty folder scaffolding is not the app structure.

## DEC-0005 — One core package instead of 12 micro-packages
Date: 2026-09-06

The spec's suggested layout (12 packages: graph, evidence, investigator,
classifier, fingerprints, registry, ens, shield, policy, mcp, shared +
3 apps) creates a package.json/tsconfig per module with no benefit at
this scale — nothing is published, and one app consumes everything.

Final layout:

- `apps/web` — Next.js UI + API route handlers (the only JS runtime)
- `packages/core` — all domain logic; modules are FOLDERS
  (`src/graph/`, `src/evidence/`, `src/investigator/`, `src/classifier/`,
  `src/registry/`, `src/ens/`, `src/shield/`, `src/policy/`), shared
  types in `src/types.ts`. Layer boundaries are enforced by the
  architecture rules, not by npm package walls.
- `contracts/` — Foundry (Solidity; no package.json)
- `packages/mcp` — added later only if the MCP server needs its own
  runnable entry point

Permanent package.json count: 3 (root, web, core).
