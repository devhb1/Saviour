---
name: Saviours Build Plan
overview: "A modular, phased build plan for SAVIOURS (ETHOnline 2026) that follows the MASTER.MD spec: a pnpm+Turborepo modular monolith delivering the Investigate -> Remember -> Block loop across live Graph evidence, a Claude-based AI investigator, a Sepolia registry, real ENSv2 incident identities, and a registry-first Shield, with disciplined per-module commits and hackathon-rule compliance."
todos:
  - id: p0
    content: "Phase 0: init public GitHub repo, pnpm+turbo monorepo scaffold, packages/shared, /docs /prompts /evals, .env.example, root agent instruction file; run 4 de-risk spikes (Graph, ENSv2 Sepolia, Sepolia registry r/w, AI JSON) with fallbacks; lock human-verified demo incident"
    status: pending
  - id: p1
    content: "Phase 1: build packages/graph Adapter A + Adapter B and packages/evidence normalized schema + cache; GATE address -> live evidence JSON"
    status: pending
  - id: p2
    content: "Phase 2: packages/investigator tool-loop + state machine, packages/classifier deterministic validators, freeze ThreatAssessment + taxonomy, 8-case eval set; GATE 8/8 defensible"
    status: pending
  - id: p3
    content: "Phase 3: SavioursRegistry.sol (Foundry tests first, Anvil fork iteration, deployments/sepolia.json), packages/registry + packages/fingerprints; GATE TAINTED -> real Sepolia record"
    status: pending
  - id: p4
    content: "Phase 4: packages/ens ENSv2 Sepolia subname + resolver + text records, IPFS dossier, enforce ENS-node-before-registry write order; GATE incident-XXXX.saviours.eth resolves live"
    status: pending
  - id: p5
    content: "Phase 5: packages/shield + packages/policy tiered registry-first decision engine; CRITICAL GATE full hero loop (steps 1-10) instant BLOCK with no second AI run"
    status: pending
  - id: p6
    content: "Phase 6: packages/mcp 3 tools, frontend polish + evidence viz + security receipt, prove benign SAFE case; reputation only if far ahead; then freeze"
    status: pending
  - id: p7
    content: "Phase 7: record 2-4min video, finalize all /docs, pre-verify+cache demo responses, final track selection, submit with >=2h buffer"
    status: pending
isProject: false
---

## SAVIOURS - Phased, Modular Build Plan

The single source of truth is `SAVIOURS MASTER.MD`. This plan operationalizes Sections 8, 42-44, 66 into concrete phases, modules, commits, and gates. We hold the "Do Not Drift" rule (Section 69): every task must serve INVESTIGATE -> REMEMBER -> PROTECT.

### Locked technical decisions (my defaults, adjust if you disagree)
- Monorepo: `pnpm` workspaces + `Turborepo`. Node 20 (confirmed installed).
- App topology: ONE `Next.js` (App Router) app at `apps/web` whose route handlers ARE the API (folds `apps/api` + `apps/worker` in-process). This honors Section 8's note: investigations are 5-10s synchronous awaited calls, no BullMQ/Redis queue.
- All logic lives in `packages/*` (Section 8 list) so modules stay independently testable; the app is a thin shell.
- Contracts: `Foundry`. Day 0 check: the installed `forge` is the `foundry-zksync` variant - verify it targets standard Sepolia EVM or install upstream `foundry`.
- AI: provider-agnostic `LLMClient` in `packages/investigator`, default `Anthropic Claude` (tool-use + JSON), swappable to OpenAI/Gemini via env.
- DB: `Supabase` (managed Postgres free tier). IPFS: `Pinata` (or web3.storage) free tier.
- MCP: separate thin runnable in `packages/mcp` exposing 3 tools over the same packages.

### Hackathon-rule compliance baked in (Sections 1, 49, 70)
- Start Fresh / Net-new pool: `SAVIOURS MASTER.MD` is research/spec (allowed); ALL implementation code is written now, during the event. Public GitHub repo with real commit history.
- Graph must be load-bearing and consume LIVE data (no mocked/static in the real path). Fixtures only under `/evals`, labelled.
- ENSv2 must be central and resolve to real Sepolia data - no hard-coded identities.
- AI investigates, deterministic code decides. AI never writes the registry or executes tx. UNKNOWN != SAFE.
- `AI_USAGE.md` documents AI-assisted development. Disclose the mainnet-evidence / Sepolia-registry boundary (Section 23).

### Documentation links to gather + verify on Day 0 (Section 71)
- ETHGlobal: [event](https://ethglobal.com/events/ethonline2026), [prizes](https://ethglobal.com/events/ethonline2026/prizes), [rules/details](https://ethglobal.com/events/ethonline2026/info/details), [Graph track](https://ethglobal.com/events/ethonline2026/prizes/the-graph), [ENS track](https://ethglobal.com/events/ethonline2026/prizes/ens)
- The Graph: [docs](https://thegraph.com/docs/en/), [Subgraph MCP](https://thegraph.com/docs/en/subgraphs/tooling/subgraph-mcp/introduction/), [Standardized Subgraphs](https://thegraph.com/docs/en/subgraphs/existing-subgraphs/standard-subgraphs/), [Pinax EVM Substreams](https://github.com/pinax-network/substreams-evm)
- ENSv2 (BETA - Sepolia, interfaces not final; re-verify): [Permissioned Registry](https://docs.ens.domains/ensv2/permissioned-registry/), [Contract dev guide](https://docs.ens.domains/ensv2/tutorial-contract-developers/), [App dev guide](https://docs.ens.domains/ensv2/tutorial-app-developers/), [Enhanced Access Control](https://docs.ens.domains/ensv2/enhanced-access-control/), [ENSIP-25](https://docs.ens.domains/ensip/25/), [ENSIP-26](https://docs.ens.domains/ensip/26/)
- Tooling: [OpenZeppelin](https://docs.openzeppelin.com/contracts/), [Foundry Book](https://book.getfoundry.sh/), [IPFS](https://docs.ipfs.tech/), [Anthropic API](https://docs.anthropic.com/), [MCP](https://modelcontextprotocol.io/)
- Competitive (do-not-copy references): [Immunity](https://ethglobal.com/showcase/immunity-eg56a), [Aegis7702](https://ethglobal.com/showcase/aegis7702-93wwp), [Pista](https://ethglobal.com/showcase/pista-us51n)

### Credentials to provision in Phase 0 (you have none yet)
- The Graph API key (Subgraph Studio) + pick a live Standardized/Messari subgraph for the demo protocol.
- AI key (Claude, or the ChatGPT/Gemini credits you get - the seam handles either).
- RPC: Sepolia + Mainnet read-only (Alchemy/Infura free tier).
- Dedicated, minimally-funded Sepolia relayer wallet (NEVER a personal/mainnet key; server-side env only, never `NEXT_PUBLIC_`).
- Supabase project + Pinata token.
- Populate `.env.example` (Section 32); real `.env` git-ignored.

---

## Phases

Phases map to the Section 42 schedule but are modular: each ends at a hard GATE and a commit checkpoint. The Section 66 core loop (steps 1-10) is the non-negotiable spine; optional features (MCP polish, reputation) come only after it works.

### Phase 0 - Scaffold + de-risk primitives (Day 0, 6 Sept)
- Init public GitHub repo; add `pnpm`/`turbo` monorepo skeleton, `packages/shared` (types/config/errors), `/docs`, `/prompts`, `/evals`, `.env.example`, root agent instruction file (Section 50).
- Four spikes, each with a documented fallback (DAY 0 GATE): live Graph query works; ENSv2 Sepolia minimal subname registration works; Sepolia registry read/write works; AI structured-JSON tool call works.
- Lock the demo incident (Section 33): shortlist 2-3 real historical incidents, verify addresses from credible sources + Graph coverage, pick the cleanest. Human-verified, never AI-invented.
- Commits: `chore: initialize hackathon repository`, `chore: add product and engineering specification`, `spike: verify live graph query`, `spike: verify ensv2 sepolia registration`, `spike: verify registry read write`, `spike: verify structured investigator output`.

### Phase 1 - Graph evidence engine (Day 1)
- `packages/graph` Adapter A (transfer/activity/concentration) + Adapter B (standardized protocol context); `packages/evidence` normalized schema `{source, reference, claim, blockRange, timestamp, rawHash}`; basic cache.
- GATE: address -> structured evidence JSON from LIVE Graph data.
- Commits: `feat: graph evidence adapters`, `feat: normalized investigation evidence`, `feat: standardized graph protocol context`.

### Phase 2 - AI investigator + classifier (Day 2)
- `packages/investigator` tool-calling loop over the fixed MVP toolset (Section 15) + controlled state machine; `packages/classifier` deterministic validators; freeze `ThreatAssessment` schema + threat taxonomy (Sections 12-13); counter-evidence handling; 8-case eval set in `/evals` (Section 34).
- GATE: 8/8 eval cases produce defensible output; no silent UNKNOWN->SAFE; TAINTED needs multiple signals.
- Commits: `feat: graph evidence investigator`, `feat: structured threat assessment`, `feat: evidence-grounded classification`, `test: add eight-case investigator evaluation set`.

### Phase 3 - Persistent security registry (Day 3)
- `contracts/SavioursRegistry.sol` (durable facts only, duplicate protection, role restrictions, events, evidence+ENS-node refs); Foundry tests first; Anvil-fork-of-Sepolia iteration; deploy script writes `deployments/sepolia.json`; `packages/registry` read/write adapter + `packages/fingerprints` (deterministic code/proxy/behavior features, no ML).
- GATE: a TAINTED investigation writes a real Sepolia registry record.
- Commits: `feat: saviours security registry`, `test: registry access and lifecycle`, `feat: threat incident persistence`.

### Phase 4 - ENSv2 incident identity (Day 4)
- `packages/ens` using the current documented ENSv2 Sepolia pattern (verify interfaces first - beta); subname registration `incident-XXXX.saviours.eth`; resolver + incident text records; IPFS dossier (Section 17). Enforce write order: register ENS subname -> capture node hash -> write registry entry.
- GATE: `incident-XXXX.saviours.eth` resolves to real live data via Universal Resolver.
- Commits: `feat: ensv2 incident identity`, `feat: incident resolver metadata`, `feat: ipfs investigation dossier`.

### Phase 5 - Registry-first Shield (Day 5) - CRITICAL GATE
- `packages/shield` + `packages/policy`: Tier 0 local policy -> Tier 1 registry/cache -> Tier 2 deterministic target/action checks -> deep audit escalation only when needed; action-aware safety (target vs action, Section 22); outputs ALLOW/WARN/REQUIRE_HUMAN/BLOCK.
- CRITICAL GATE = the hero loop end-to-end (Section 66 steps 1-10): unknown target -> investigate -> TAINTED -> registry -> ENS -> same target proposed -> instant BLOCK with no second full AI run. If this fails, do NOT start optional features.
- Commits: `feat: registry-first shield`, `feat: action-aware transaction policy`, `feat: deep-audit escalation`.

### Phase 6 - Integration + polish (Day 6)
- `packages/mcp` 3 tools (`check_target`, `check_transaction`, `get_incident`); frontend polish (verdict->why->evidence->action->provenance), evidence visualization, Security Receipt UI (Section 27); benign SAFE case proven; reputation/investigator-ENS ONLY if far ahead. Then freeze features.
- Commits: `feat: saviours agent mcp`, `feat: investigation experience`, `feat: security receipt ui`, `fix: shield edge cases`.

### Phase 7 - Submission (Day 7, 13 Sept) - no new features
- Record 2-4 min video; finalize `README`, `ARCHITECTURE.md`, `THREAT_MODEL.md`, `GRAPH_QUERIES.md`, `ENS.md`, `SECURITY_RECEIPT.md`, `AI_USAGE.md`, `DEMO.md` (Section 57); pre-verify + cache real demo responses (Section 41); final track selection (Graph AI + ENSv2 always; Graph Composable only if standardized path genuinely works); submit with >=2h buffer.
- Commits: `docs: finalize architecture and threat model`, `docs: document ai-assisted development`, `docs: finalize demo and submission`, `test: final end-to-end regression`, `chore: prepare ethglobal submission`.

---

### Commit + git discipline (regular commits)
- Conventional Commits; commit per module and at every GATE (not one giant commit/day). Push after each phase.
- Feature branches per package where useful, PR-style merges to keep history reviewable; secrets never committed.

### Kill-switches (Section 44) - decide at each GATE
- ENSv2 breaks: fall back to simplest documented UserRegistry path; don't hand-build wildcard infra.
- Standardized Graph coverage poor: drop the Composable track selection rather than fake it (Graph AI + ENS still strong).
- AI unreliable: deterministic rules are the decision floor; AI becomes explanation only.
- MCP eating time: cut after Graph/ENS/Shield proven.

### Definition of Done (Section 66)
Steps 1-10 (investigate -> TAINTED -> Sepolia registry -> ENS resolves -> same target proposed -> instant Shield BLOCK) work live; plus benign -> SAFE -> ALLOW; plus one external agent call via MCP/API.