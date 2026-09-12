# Recipe — Fleet triage (Bazantic · batch)

**Name:** `fleet-triage`  
**Gateways:** Saviour only  
**Tools:** `fleetCatalog` · `shieldCheck` ($0×N) · `investigate` (~$0.01×miss)  
**Expected spend:** **$0** for every memory hit · **~$0.01** only per true miss

## Paste — Describe the Recipe

```text
Fleet triage: catalog → shieldCheck each ($0) → investigate only true misses (~$0.01 each). Catalog ≠ Graph-verified.
```

## Paste — Description

```text
Triage many candidates cheaply. Load fleetCatalog, shieldCheck every address ($0), investigate only ESCALATE/miss rows (~$0.01 each). Catalog status is not live Graph detection unless proof=graph. Never invent TAINTED.
```

## Paste — Prompt

```text
Goal: triage a worklist into CANCEL / WATCH / needs-investigate. Inputs: {{inputs}}

Pricing weight: shieldCheck $0 × N · investigate ~$0.01 × misses only.

1) fleetCatalog (optional filter from inputs).
2) For each address: shieldCheck { chainId:1, address, registryNetwork:"sepolia" }.
3) BLOCK/WARN → mark CANCEL/WATCH from memory. Cost $0. Do not investigate.
4) ESCALATE/miss → investigate once only if the user asked for paid discovery.
5) Return a table: address · decision · source · cost.
6) Honesty: catalog labels ≠ Graph-verified unless proof=graph.

Never invent verdicts. Never treat UNKNOWN as SAFE.
```

**Tick:** `fleetCatalog`, `shieldCheck`, `investigate`
