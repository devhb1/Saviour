# Recipe — Dossier deep dive (Bazantic · $0 memory)

**Name:** `dossier-deep-dive`  
**Gateways:** Saviour only  
**Tools:** `shieldCheck` or `resolveEns` · `fetchDossier` · `askCase`  
**Expected spend:** **$0** (pinned dossier + asks — no fresh Graph)

## Paste — Describe the Recipe

```text
Deep dive a named threat for $0: resolve/shield → fetchDossier → askCase. No fresh Graph. No invent.
```

## Paste — Description

```text
After an address is already named, pull the pinned dossier and answer questions for $0. Uses shieldCheck/resolveEns + fetchDossier + askCase. Does not call investigate. Memory hits stay free.
```

## Paste — Prompt

```text
Goal: answer questions about a named threat using the pinned dossier. Inputs: {{inputs}}

Pricing weight: $0 (all memory/read tools).

1) shieldCheck or resolveEns for the address (registryNetwork sepolia).
2) If no named memory → say UNKNOWN and stop. Do not invent. Do not investigate in this recipe.
3) fetchDossier for the pinned URL/CID if present.
4) askCase only from dossier + cited evidence. Never invent signals.
5) Return plain answers with citations.

Never charge. Never call investigate/dispute/revoke.
```

**Tick:** `shieldCheck`, `resolveEns`, `fetchDossier`, `askCase`  
**Test:** ATTACK-1 · expect $0 path
