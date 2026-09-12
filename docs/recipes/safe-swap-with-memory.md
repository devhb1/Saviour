# Recipe — Safe swap with memory (Bazantic · multi-service)

**Name:** `safe-swap-with-memory`  
**Gateways:** Uniswap (or any swap quote API on Bazantic) + Saviours (`https://saviours.bazgateway.com`)  
**Tools:** Uniswap quote · Saviour `shieldCheck` ($0) · optional `investigate` (miss only)

**When:** An agent is about to execute a swap and must decide whether counterparties are safe.  
**Why:** Quote APIs give a route; they do not tell you if the router / pool / recipient is already a named threat. Shared ENS memory answers that for $0.  
**How:**

1. Call the **Uniswap** (or sponsor) quote API for the token pair / amount.
2. Extract every address the quote depends on (router, pool, recipient, spender).
3. For each address, call Saviour **`shieldCheck`**  
   `{ "chainId": 1, "address": "<0x…>", "registryNetwork": "sepolia" }` → **$0**.
4. If any returns `BLOCK` or `WARN` → **abort**. Return the ENS name / reason. Do not execute the swap.
5. If all clear → return the executable quote. Call `investigate` only on true misses, and only if the agent chooses to pay (~$0.01).

**Result depends on both services:** Uniswap supplies the route; Saviours supplies permission to use it.

**Demo (in-product):** Build → Recipe · Playground → Safe-swap recipe · `pnpm recipe:safe-swap`  
Include ATTACK-1 `0x935bfb495e33f74d2e9735df1da66ace442ede48` as a recipient or counterparty → `shieldCheck` → BLOCK → abort.

**Register:** [bazantic.com/dashboard/recipes/new](https://bazantic.com/dashboard/recipes/new) — paste task description + prompt below. Bind Uniswap (or any quote service on Bazantic) + Saviour `shieldCheck`.

**Do not:** charge on MEMORY HIT; invent TAINTED; treat UNKNOWN as SAFE; skip shield and go straight to investigate.

## Paste into Bazantic New Recipe

**Task description (draft):**

> Safe swap with memory: get a Uniswap quote, extract router/pool/recipient addresses, call Saviour shieldCheck on each ($0). Any BLOCK/WARN aborts and returns the ENS reason. All clear returns the quote. Investigate only on miss. Never invent verdicts. Demo abort on 0x935bfb495e33f74d2e9735df1da66ace442ede48.

**Prompt template:**

```text
Goal: return an executable swap quote only if every counterparty address has no named threat memory. Inputs: {{inputs}}

1) Obtain a Uniswap (or bound quote) route for the requested swap.
2) Extract router, pool, recipient, and any spender addresses from the quote.
3) For each address call Saviour shieldCheck with chainId=1 and registryNetwork=sepolia.
4) If any decision is BLOCK or WARN → CANCEL. Return the ENS name / reason. Do not investigate first. Cost $0.
5) If all ALLOW/clear → return the executable quote.
6) On miss/ESCALATE only, you may call investigate once (may 402 / ~$0.01); cancel on TAINTED or WATCH.
7) Never invent a verdict. Never treat UNKNOWN as SAFE. Never charge a memory hit.

Final answer: CANCEL (with reasons) or PROCEED (with quote).
```

**Bind tools:** Uniswap quote tool(s) + Saviour `shieldCheck` (+ `investigate` optional).
