# Partner feedback — Saviours (ETHOnline 2026)

Honest notes from building security memory on ENSv2 beta, The Graph Network, and Bazantic x402. Written so partners can improve docs and tooling — not a pitch.

## ENSv2 (Sepolia)

**What worked**

- Hierarchical names under a parent (`*.saviours.eth`) made agent identity and address aliases one model.
- PermissionedResolver + EAC role texts (`saviours.cannotWrite`, `saviours.role`) are demonstrable without a custom UI story.
- Text records as the memory surface (`saviours.status`, `saviours.threat`, evidence hashes) beat inventing a parallel registry schema.

**Friction**

- Beta docs under-specified PermissionedResolver + EAC wiring for “operator may write status but not dispute.” We read contracts and role text conventions to get fail-closed right.
- Public RPC rate limits make demo film brittle; cast snippets help, but cold resolve latency varies (~150 ms typical, worse under congestion).
- Wildcard / unnamed miss must stay empty — easy to accidentally imply SAFE. Product law: UNKNOWN ≠ SAFE; docs should say that louder for agent builders.

**Ask**

- A short “permissioned text records + role ceilings” recipe in ENS docs (Sepolia → mainnet path).
- Clearer guidance on expiry / renew when status texts are the product, not the primary name UI.

## The Graph

**What worked**

- Messari standardized schemas let one template fan out across eight pinned deployments.
- Honest empty protocol rows (no rows ≠ error) kept the Fan-Out Console trustworthy.

**Friction**

- Excluded deployments (indexer errors / no allocations) need to stay visible as ceilings, not silently dropped — Coverage UI does that; network health still surprises operators.
- Subgraph id pinning is operational debt; a partner-facing “pin + verify” checklist would help hackathon teams.

## Bazantic

**What worked**

- Custom subdomain gateway (`saviours.bazgateway.com`) → upstream product host.
- Free / Standard (~$0.01) / Complex (~$0.05) tiers map cleanly to shield / investigate / evidence+ask.
- MCP tools/list + published recipes make agent integration copy-pasteable.

**Friction**

- Gateway has no HTML homepage (expected) — browsers show “not found”; human path is `/gateway` on the product host. Worth a one-line note in Bazantic customer onboarding.
- MCP is POST-only; GET `/mcp` → 405 confuses first-time Cursor/Claude setup.
- Path-form tools historically 404 on proxy; body forms (`getEvidence`, `askCase`) are safer — document preferred shapes.
- Public prod writes stay fail-closed; write demos (EAC probe) need local grant film. Read-side `cannotWrite` texts are the honest public proof.

**Recipes we lead with**

- Judges: `investigate-once-explain` (real Graph + Saviours memory).
- `safe-swap-with-memory`: **live** Uniswap QuoterV2 (mainnet eth_call via `/api/recipes/safe-swap`; address fallback if RPC flaps) + live Shield. CLI `pnpm recipe:safe-swap` prefers that API; offline address-set smoke is labeled separately.

## npm / wallet

- `@saviours/check` is published (`0.1.3` as of 13 Sep 2026). Browser extension and first-class wagmi package are still deferred; pre-sign gates use the SDK or raw `shield/check`.

## Contact

Support: [b4harshit01@gmail.com](mailto:b4harshit01@gmail.com) · [@harshitb01](https://twitter.com/harshitb01) · [devhb1](https://github.com/devhb1)
