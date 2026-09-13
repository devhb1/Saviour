# Secrets rotation checklist (Phase C2)

Run this if `.env` was ever shared, screenshotted, pasted into chat, or committed.

**Never commit secrets.** Rotate in the provider UI, then update Vercel / local `.env` only.

| Secret | Where to rotate | Env keys |
|---|---|---|
| The Graph Studio | https://thegraph.com/studio/ | `GRAPH_API_KEY` |
| OpenAI | https://platform.openai.com/api-keys | `OPENAI_API_KEY` |
| Relayer / investigator / disputer | Generate new EOAs; fund Sepolia; re-grant EAC | `RELAYER_PRIVATE_KEY`, `INVESTIGATOR_PRIVATE_KEY`, `DISPUTER_PRIVATE_KEY` |
| Hosted RPC | Alchemy / Infura / etc. | `SEPOLIA_RPC_URL`, `MAINNET_RPC_URL` |
| Bazantic | Dashboard API keys | `BAZANTIC_API_KEY` (if used) |

After rotation:

1. Update Vercel project env → redeploy.
2. Re-run `pnpm check:demo-ready` (ATTACK-1 must stay **TAINTED** / shield **BLOCK**).
3. If investigator/disputer keys changed: `pnpm check:ens-roles` (45s fail-fast) with writes allowed on a funded Sepolia RPC.
4. Confirm gateway smoke in `docs/recipes/PUBLISH_KIT.md`.

Operator-only: this doc does not store or print key material.
