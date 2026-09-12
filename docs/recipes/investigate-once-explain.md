# Recipe — Investigate once & explain (Bazantic · discovery)

**Name:** `investigate-once-explain`  
**Gateways:** Saviour only  
**Tools:** `shieldCheck` ($0) · `investigate` (~$0.01) · `getEvidence` · `askCase`  
**Expected spend:** **$0** if shield ends it · else **~$0.01** once (evidence + ask are free after)

## Paste — Describe the Recipe

```text
Paid discovery pack: shield first ($0). On miss → investigate (~$0.01) → getEvidence → askCase. LLM cites evidence ids only; validator owns the verdict.
```

## Paste — Description

```text
Investigate once and explain. Always shieldCheck first ($0). If memory hits, stop. On miss, pay investigate once (~$0.01 USDC on Base), then getEvidence and askCase so the model explains with citations. Never invent signals. Never re-pay on a named address.
```

## Paste — Prompt

```text
Goal: produce a cited explanation for an address. Inputs: {{inputs}}

Pricing weight: shieldCheck $0 · investigate ~$0.01 (once) · getEvidence/askCase free after that path.

1) shieldCheck { chainId:1, address, registryNetwork:"sepolia" }.
2) If BLOCK/WARN from ens/registry → return the memory hit. Cost $0. Do not investigate.
3) On miss only → investigate once (expect 402 until settled). Do not invent status.
4) Prefer evidence already returned by investigate. If you still need a fan-out bundle, call getEvidence via POST body { "chainId": 1, "address": "<0x…>" } — never invent path segments.
5) askCase only from cited evidence ids — never invent signals.
6) Final answer must separate: decision/status · evidence ids · plain explanation.

If getEvidence fails after a successful investigate, continue with investigate's evidence/signals and askCase — do not fail the whole recipe.

Never treat UNKNOWN as SAFE. Never charge a memory hit.
```

**Tick:** `shieldCheck`, `investigate`, `getEvidence`, `askCase`  
**Do not tick:** dispute, revoke, eacProbe
