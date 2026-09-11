# Live agent — zero `@saviours/*` on the ENS hot path

Standalone Node process that:

1. Reads `<addr>.saviours.eth` `saviours.status` via Sepolia + PermissionedResolver (**no SAVIOURS imports**)
2. On MEMORY HIT → BLOCK / WARN and stops (real agent decision)
3. On miss → calls Bazantic / upstream investigate (may return HTTP 402)

## Quick start

```bash
cd consumers/live-agent
pnpm install
export SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
# optional:
# export BAZANTIC_GATEWAY_URL=https://saviour.bazgateway.com
# export PUBLIC_APP_URL=https://www.saviours.xyz
# export AGENT_WORKLIST=0x935bfb495e33f74d2e9735df1da66ace442ede48,0x352423a7c8b4e5f0a1d2c3b4a5968778899aabb3cc7
pnpm start
# ATTACK-1 → BLOCK · BOT-1 → WARN · $0 on MEMORY HIT
```

## Paid miss (optional)

The agent does not hold a Bazantic grant. For a live Base settle of the investigate miss, use the product UI on **`pnpm dev`**: Live / Build → **Pay & investigate** (needs `bazantic` CLI + `BAZANTIC_PAY_ACCOUNT=film-base`).

## Judge note

Open `src/ensShield.ts` — if the Vercel app disappears, this agent still BLOCKs on named threats via ENS alone.
