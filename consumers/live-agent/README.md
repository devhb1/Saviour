# Live agent — zero @saviours/* on the ENS hot path

Standalone Node process that:

1. Reads `<addr>.saviours.eth` `saviours.status` via Sepolia + PermissionedResolver (**no SAVIOURS imports**)
2. On MEMORY HIT → BLOCK / WARN and stops (real agent decision)
3. On miss → calls Bazantic / upstream investigate (may return HTTP 402)

## Quick start

```bash
cd consumers/live-agent
pnpm install
export SEPOLIA_RPC_URL=https://…   # required
# optional:
# export BAZANTIC_GATEWAY_URL=https://saviour.bazgateway.com
# export PUBLIC_APP_URL=https://saviour-gilt.vercel.app
# export AGENT_WORKLIST=0x935bfb…,0x352423…
pnpm start
```

## Judge note

Open `src/ensShield.ts` — the file header states the product law: if the Vercel app disappears, this agent still BLOCKs on named threats.
