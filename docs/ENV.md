# Environment

| Var | Required | Purpose |
|---|---|---|
| `ETH_RPC_URL` or `MAINNET_RPC_URL` | **Recommended in prod** | Block-pinned control / Reach reads. Public fallback exists but must not be trusted for operator-critical reports. |
| Telegram / Bazantic / LLM keys | No for Audit/Review/Reach | Archive / Watch / investigate only |

Freshness records `rpcUrlHost` on reports — verify it matches your dedicated RPC.
