# Bazantic — recipe publish + rebind kit

**Gateway (live):** [https://saviours.bazgateway.com](https://saviours.bazgateway.com)  
**MCP:** [https://saviours.bazgateway.com/mcp](https://saviours.bazgateway.com/mcp)  
**Upstream:** [https://www.saviours.xyz](https://www.saviours.xyz)  
**OpenAPI:** [https://www.saviours.xyz/openapi-saviours.json](https://www.saviours.xyz/openapi-saviours.json)  
**Dashboard:** [https://bazantic.com/dashboard](https://bazantic.com/dashboard)

> Old hosts (`saviour.bazgateway.com`, random `*.bazgateway.com`) are retired.  
> Every recipe must bind **this** gateway: **Saviours**.

Claude / Cursor:

```bash
claude mcp add --transport http saviours https://saviours.bazgateway.com/mcp
```

---

## Pricing tiers (gateway Resources & Pricing)


| Tier         | UI price | Millicents*                         | Tools                                                                                                        |
| ------------ | -------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Free**     | `$0.00`  | `0`                                 | `shieldCheck`, `resolve`, `resolve-target`, `incidents`, `catalog`, `dossier/fetch`, `fingerprint/recompute` |
| **Standard** | `$0.01`  | `1000` (confirm UI shows **$0.01**) | `investigate`, `pay-investigate`, `govern/`*                                                                 |
| **Complex**  | `$0.05`  | `5000` (confirm UI shows **$0.05**) | `POST /api/evidence`, `GET /api/evidence/{…}`, `POST /api/case/ask`, `POST /api/case/{address}/ask`          |


If the UI labels millicents differently, trust the **$** column, not the number.

**Product law:** never charge a MEMORY HIT. `shieldCheck` must stay **$0**.

### Smoke test (run before rebinding recipes)

```bash
GW=https://saviours.bazgateway.com
ADDR=0x935bfb495e33f74d2e9735df1da66ace442ede48

# FREE — must be 200 BLOCK (no 402)
curl -sS -X POST "$GW/api/shield/check" \
  -H 'content-type: application/json' \
  -d "{\"chainId\":1,\"address\":\"$ADDR\",\"registryNetwork\":\"sepolia\"}"
# expect: decision BLOCK · source ens

# STANDARD — unpaid must 402 (~$0.01)
curl -sS -X POST "$GW/api/investigate" \
  -H 'content-type: application/json' \
  -d "{\"chainId\":1,\"address\":\"$ADDR\",\"persist\":false,\"forceFresh\":true}"
# expect: HTTP 402 · maxAmountRequired for ~$0.01

# COMPLEX — unpaid must 402 (~$0.05), NOT 404
curl -sS -X POST "$GW/api/evidence" \
  -H 'content-type: application/json' \
  -d "{\"chainId\":1,\"address\":\"$ADDR\"}"
# expect: HTTP 402 (paid) — if 404, OpenAPI/body route missing

curl -sS -X POST "$GW/api/case/ask" \
  -H 'content-type: application/json' \
  -d "{\"address\":\"$ADDR\",\"question\":\"why tainted\"}"
# expect: HTTP 402 (paid) — if 404, path-form bug; use body tool only
```

**Pass:** shield = **200** · investigate/evidence/ask = **402** (not 404).

---

## Rebind every recipe (do this first)

For each recipe → **Edit** → **Tools**:

1. Remove any dead / old Saviour binding
2. **+ Add gateway** → **Saviours** (`saviours.bazgateway.com`)
3. Tick **only** the tools in the table below
4. **Save** → re-run **Test**


| Recipe                       | Tick on Saviours                                       | Also                           | Expected spend                            |
| ---------------------------- | ------------------------------------------------------ | ------------------------------ | ----------------------------------------- |
| `safe-swap-with-memory`      | `shieldCheck` (+ optional `investigate`)               | Uniswap / quote gateway        | **$0** on BLOCK                           |
| `saviours-check-before-sign` | `shieldCheck`, `investigate`                           | —                              | **$0** hit · **$0.01** miss               |
| `investigate-once-explain`   | `shieldCheck`, `investigate`, `getEvidence`, `askCase` | —                              | **$0** hit · **$0.01** + **$0.05×** depth |
| `dossier-deep-dive`          | `shieldCheck`, `resolveEns`, `fetchDossier`            | optional `askCase` (**$0.05**) | prefer **$0**; ask = complex              |
| `fleet-triage`               | `fleetCatalog`, `shieldCheck`, `investigate`           | —                              | **$0×N** · **$0.01×miss**                 |


**Never tick:** `dispute`, `revoke`, `eacProbe`.

Prefer **body** tools: `getEvidence` = `POST /api/evidence`, `askCase` = `POST /api/case/ask`.  
Avoid path forms if both appear.

---

## 0) `safe-swap-with-memory` · multi-service · prize

**Gateways:** Uniswap/quote **+** Saviours  
**Tick:** quote tool + `shieldCheck` (+ optional `investigate`)

**Describe**

```text
Multi-service safe swap: Uniswap quote → extract router/pool/recipient → Saviours shieldCheck ($0). BLOCK/WARN → CANCEL. Investigate only on miss ($0.01).
```

**Test**

- Recipient / counterparty: `0x935bfb495e33f74d2e9735df1da66ace442ede48`
- Expect: **CANCEL** via `shieldCheck` · **$0**

---

## 1) `saviours-check-before-sign` · $0 hit / $0.01 miss

**Gateways:** Saviours only  
**Tick:** `shieldCheck`, `investigate`

**Describe**

```text
Check before sign: shieldCheck first ($0). BLOCK/WARN → CANCEL. Investigate only on miss ($0.01). Never invent TAINTED. UNKNOWN ≠ SAFE.
```

**Description**

```text
Before swap/approve/transfer to an unfamiliar EVM address, call Saviours shieldCheck ($0). If BLOCK or WARN from ens/registry → CANCEL. Only on miss call investigate ($0.01 x402 on Base). Never invent verdicts. Never treat UNKNOWN as SAFE.
```

**Prompt**

```text
Goal: decide CANCEL or PROCEED for a target address before signing. Inputs: {{inputs}}

Pricing: shieldCheck = $0 forever. investigate = $0.01 only on miss.

1) Call shieldCheck with { "chainId": 1, "address": "<target>", "registryNetwork": "sepolia" }. No payment handshake.
2) If decision is BLOCK or WARN and source is ens or registry → CANCEL. Do not call investigate. Return ENS name / reason. Cost $0.
3) If miss / ESCALATE → call investigate once { "chainId": 1, "address": "<target>", "persist": false, "forceFresh": true } (may 402). Cancel on TAINTED or WATCH.
4) Never invent a verdict. Never treat UNKNOWN as SAFE. Never charge a memory hit.

Final answer: CANCEL or PROCEED.
```

**Test**


| Input                                        | Expect                                        |
| -------------------------------------------- | --------------------------------------------- |
| `0x935bfb495e33f74d2e9735df1da66ace442ede48` | CANCEL · shieldCheck · **$0**                 |
| unknown `0x1111…1111`                        | miss → investigate **402** / settle **$0.01** |


---

## 2) `investigate-once-explain` · $0.01 + $0.05 depth

**Gateways:** Saviours only  
**Tick:** `shieldCheck`, `investigate`, `getEvidence` (`POST /api/evidence`), `askCase` (`POST /api/case/ask`)

**Describe**

```text
Discovery pack: shield ($0) → on miss investigate ($0.01) → optional getEvidence + askCase ($0.05 each). LLM cites evidence ids only; validator owns the verdict.
```

**Description**

```text
Investigate once and explain. Always shieldCheck first ($0). If memory hits, stop. On miss, pay investigate ($0.01). For deeper Graph fan-out / LLM Q&A use getEvidence and askCase ($0.05 each, POST body). Never invent signals. Never re-pay on a named address.
```

**Prompt**

```text
Goal: produce a cited explanation for an address. Inputs: {{inputs}}

Pricing: shieldCheck $0 · investigate $0.01 · getEvidence $0.05 · askCase $0.05.

1) shieldCheck { chainId:1, address, registryNetwork:"sepolia" }.
2) If BLOCK/WARN from ens/registry → return the memory hit. Cost $0. Stop.
3) On miss only → investigate once (402 until settled, $0.01). Do not invent status.
4) Prefer evidence already returned by investigate. If a full fan-out is needed, call getEvidence with POST body { "chainId": 1, "address": "<0x…>" } ($0.05).
5) askCase with POST body { "address": "<0x…>", "question": "…" } ($0.05) — cite evidence ids only.
6) Final answer: decision/status · evidence ids · plain explanation.

If getEvidence fails after investigate succeeded, continue with investigate's evidence and askCase — do not fail the whole recipe.
Never treat UNKNOWN as SAFE. Never charge a memory hit.
```

**Test**


| Input                         | Expect                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| ATTACK-1 `0x935bfb49…ede48`   | short-circuit after shield · **$0** · no investigate                                  |
| Unknown address (full 40 hex) | shield ESCALATE → investigate **402** ($0.01); evidence/ask **402** ($0.05) if called |


**Do not** paste docs notes into Topic/inputs. Address only.

---

## 3) `dossier-deep-dive` · prefer $0

**Gateways:** Saviours only  
**Tick:** `shieldCheck`, `resolveEns`, `fetchDossier`  
**Optional:** `askCase` (adds **$0.05**)

**Describe**

```text
Named-threat deep dive: shield/resolve ($0) → fetchDossier ($0). Optional askCase ($0.05). No fresh investigate.
```

**Description**

```text
After an address is already named, pull the pinned dossier for $0. Uses shieldCheck/resolveEns + fetchDossier. askCase is optional and metered at $0.05. Does not call investigate.
```

**Prompt**

```text
Goal: answer questions about a named threat using the pinned dossier. Inputs: {{inputs}}

Pricing: shield/resolve/dossier $0 · askCase $0.05 if used.

1) shieldCheck or resolveEns (registryNetwork sepolia).
2) If no named memory → UNKNOWN and stop. Do not invent. Do not investigate.
3) fetchDossier for the pinned URL/CID if present ($0).
4) Optional askCase via POST { address, question } ($0.05) — cite only.
5) Return plain answers with citations.

Never call investigate/dispute/revoke.
```

**Test:** ATTACK-1 → shield/resolve/dossier · **$0** (skip ask unless you want to settle $0.05)

---

## 4) `fleet-triage` · $0×N + $0.01×miss

**Gateways:** Saviours only  
**Tick:** `fleetCatalog`, `shieldCheck`, `investigate`

**Describe**

```text
Fleet triage: catalog → shieldCheck each ($0) → investigate only true misses ($0.01). Catalog ≠ Graph-verified.
```

**Description**

```text
Triage many candidates cheaply. Load fleetCatalog, shieldCheck every address ($0), investigate only ESCALATE/miss rows ($0.01 each). Catalog status is not live Graph detection unless proof=graph.
```

**Prompt**

```text
Goal: triage a worklist into CANCEL / WATCH / needs-investigate. Inputs: {{inputs}}

Pricing: shieldCheck $0 × N · investigate $0.01 × misses only.

1) fleetCatalog (optional filter from inputs).
2) For each address: shieldCheck { chainId:1, address, registryNetwork:"sepolia" }.
3) BLOCK/WARN → mark from memory. Cost $0. Do not investigate.
4) ESCALATE/miss → investigate once only if paid discovery was requested.
5) Return table: address · decision · source · cost.
6) Honesty: catalog ≠ Graph-verified unless proof=graph.

Never invent verdicts. Never treat UNKNOWN as SAFE.
```

**Test:** run catalog + shield on ATTACK-1 → BLOCK · **$0**

---

## After rebind checklist

1. [x] Smoke curls — gateway e2e **8/8** (`pnpm bazantic:e2e`) · shield 200 / investigate+evidence 402
2. [x] Five recipes **PUBLISHED** (2026-09-12): `safe-swap-with-memory` · `saviours-check-before-sign` · `investigate-once-explain` · `dossier-deep-dive` · `fleet-triage`
3. [x] Product UI parity — Build/Playground/`/gateway` show 5 recipes + Free/Standard/Complex tiers (`BazanticCatalog`)
4. [ ] Spot-check each recipe editor → gateway **Saviours** @ `saviours.bazgateway.com` (not a deleted host)
5. [ ] `safe-swap-with-memory` abort test CANCEL · $0
6. [ ] `saviours-check-before-sign` ATTACK-1 CANCEL · $0
7. [x] Screenshot recipes list for submission
8. [ ] Bazantic username saved for ETHGlobal form
9. [ ] Screen-record multi-service recipe for Agentify

**Prize minimum:** multi-service `safe-swap-with-memory` + core `saviours-check-before-sign` green. The rest is product depth.