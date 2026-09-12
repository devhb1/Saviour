# AI tool usage

ETHGlobal disclosure. Product runtime AI is separate from development AI.
Neither writes ENS, SavioursRegistry, or Shield decisions.

## Tools

| Tool | Used for |
|---|---|
| Cursor (agent mode) | Implementation across `apps/web`, `packages/*`, `contracts/`, docs, gates |
| OpenAI API (`gpt-4o-mini` default) | **Product only** — investigator explain step with citations |

## Development AI

- Scaffolding and iteration of Graph fan-out, signals, validator, ENS remember/resolve, Shield, UI walkthrough, Bazantic wiring, MCP, Foundry registry, `@saviours/check`, consumers.
- Drafting and revising docs; humans locked product law and demo addresses.
- Gate scripts under `pnpm check:*` and `pnpm bazantic:e2e` — humans confirm green before treating a gate as demo-ready.

## Product runtime rule

1. Model input: evidence pack + signals JSON only.
2. Model output: explanation + cited evidence ids.
3. Code: `validateAssessment` owns status. Shield / ENS / registry never call the LLM on MEMORY HIT.

## Verified by hand (not taken on trust)

- Contract and hero addresses from `deployments/*.json` and `evals/` — not model memory.
- Live Graph fan-out and Adapter A against the gateway; broken subgraphs excluded honestly.
- Live Sepolia ENS: `cast` / Shield / EAC revert / Remember when keys + RPC present.
- TAINTED cannot be minted by the model alone — fixtures + validator.
- MEMORY HIT cost: 0 Graph · 0 AI when named.
- IPFS CIDs only from pin responses — never invented.

## Artifacts

| Artifact | Role |
|---|---|
| [`prompts/investigator.system.md`](../prompts/investigator.system.md) | Product explain-step system prompt |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Trust and control-flow spec |
| [`INTEGRATE.md`](./INTEGRATE.md) | Agent / wallet integration |
| [`evals/demo-targets.json`](../evals/demo-targets.json) | Locked demo addresses |
