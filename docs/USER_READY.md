# End-user ready path (V3)

## What works today (no founder API)

1. **Landing** — assess-first Hook (`/` on this branch)
2. **Workflow B** — `/review` · Load Term Prop 5 demo · Assess  
   - Safe tx hash recomputed  
   - Privileged selectors decoded → **WARN**  
   - Coverage / integrity / evidence panel  
3. **Offline demo** — `pnpm exec tsx scripts/demo-v3-stranger.ts`
4. **Address memory** — `/resolve` (needs `SAVIOURS_BASE_REGISTRY` for live Base)

## What still blocks “production live”

| Blocker | Status |
|---|---|
| Base Sepolia deployer ETH | **0** — `0x679997b836Cf84D32d7f68C1c662546E797f15FA` |
| Continuous indexer writes | Stub — allowlist has real Term addresses |
| Branch deploy to saviours.xyz | Unpushed feature branch |
| Thessaly OP addresses | Research-synthetic until publicly pinned |
| Makina Type-4 auth tuple | Still null — primary Type-2 tx recorded |

## Stranger checklist

- [ ] `pnpm --filter @saviours/queuewatch test`
- [ ] `pnpm --filter @saviours/check test`
- [ ] `pnpm exec tsx scripts/demo-v3-stranger.ts` → WARN + MATCH
- [ ] `pnpm --filter web dev` → `/review` Term demo
- [ ] Fund Sepolia → `docs/DEPLOY_BASE_SEPOLIA.md` → fill `deployments/base-sepolia.json`
- [ ] `SAVIOURS_BASE_REGISTRY=0x… pnpm exec tsx scripts/demo-v3-stranger.ts`
- [ ] Push branch + deploy web

## Honesty

Static decode ≠ full simulation. NO_VERDICT ≠ SAFE. Signer decides.
