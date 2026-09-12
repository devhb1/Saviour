# Recipe — Check before sign (Bazantic · core)

**Name:** `saviours-check-before-sign`  
**Gateways:** Saviours only (`https://saviours.bazgateway.com`)  
**Tools:** `shieldCheck` ($0) · `investigate` (~$0.01 miss)  
**Expected spend:** **$0** on memory hit · **~$0.01** USDC on Base only on miss

## Paste — Describe the Recipe

```text
Check before sign: shieldCheck first ($0). BLOCK/WARN → CANCEL. Investigate only on miss (~$0.01). Never invent TAINTED. UNKNOWN ≠ SAFE.
```

## Paste — Description

```text
Before swap/approve/transfer to an unfamiliar EVM address, call Saviour shieldCheck ($0). If BLOCK or WARN from ens/registry → CANCEL. Only on miss call investigate (~$0.01 x402 on Base). Never invent verdicts. Never treat UNKNOWN as SAFE.
```

## Paste — Prompt

```text
Goal: decide CANCEL or PROCEED for a target address before signing. Inputs: {{inputs}}

Pricing: shieldCheck = $0 forever. investigate = ~$0.01 only on miss.

1) Call shieldCheck with { "chainId": 1, "address": "<target>", "registryNetwork": "sepolia" }. No payment handshake.
2) If decision is BLOCK or WARN and source is ens or registry → CANCEL. Do not call investigate. Return ENS name / reason. Cost $0.
3) If miss / ESCALATE → call investigate once { "chainId": 1, "address": "<target>", "persist": false, "forceFresh": true } (may 402). Cancel on TAINTED or WATCH.
4) Never invent a verdict. Never treat UNKNOWN as SAFE. Never charge a memory hit.

Final answer: CANCEL or PROCEED.
```

**Tick:** `shieldCheck`, `investigate` only.  
**Test:** `0x935bfb495e33f74d2e9735df1da66ace442ede48` → CANCEL · $0
