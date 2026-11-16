# Privilege Guard — stranger checklist

## Day-1 product

1. **Landing** — Review + Watch CTAs ([PRIVILEGE_GUARD.md](./PRIVILEGE_GUARD.md))
2. **Review** — `/review` · Load Term Prop 5 · English privilege bullets + hash MATCH
3. **Watch** — `/watch` · subscribe · Telegram CRITICAL · `/queues` health
4. **Offline** — `pnpm exec tsx scripts/demo-v3-stranger.ts`

## Commands

```bash
pnpm --filter @saviours/queuewatch test
pnpm --filter @saviours/check test
pnpm exec tsx scripts/demo-v3-stranger.ts
pnpm --filter @saviours/indexer replay  # synthetic Term CRITICAL → tip + Telegram dry-run
pnpm --filter @saviours/indexer start   # live poll · ETH_RPC_URL
pnpm --filter web dev                   # /review · /watch · /queues
```

## Env (Watch)

```
ETH_RPC_URL=…
TELEGRAM_BOT_TOKEN=…
TELEGRAM_CHAT_IDS=123,456
SAVIOURS_APP_URL=https://www.saviours.xyz
```

## Phase-2 (optional)

- Fund Base Sepolia deployer → Registry V2  
- `SAVIOURS_BASE_REGISTRY=0x…` for live resolve  

## Honesty

Static decode ≠ full simulation. NO_VERDICT ≠ SAFE. Signer decides. ENS = legacy/staging only.
