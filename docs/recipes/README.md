# Bazantic recipes — portfolio + pricing

Gateway tools already carry x402 prices. A **recipe does not invent a new price** — it chooses which tools an agent may call, so the **expected spend** follows the heaviest paid step in the path.

| Recipe | Gateways | Tools to tick | Expected spend | Weight |
|---|---|---|---|---|
| `safe-swap-with-memory` | Uniswap/quote + Saviours | quote + `shieldCheck` (+ `investigate`) | **$0** on memory hit; **~$0.01** only on miss | ★ prize (multi-service) |
| `saviours-check-before-sign` | Saviours | `shieldCheck`, `investigate` | **$0** hit · **~$0.01** miss | ★ core |
| `investigate-once-explain` | Saviours | `shieldCheck`, `investigate`, `getEvidence`, `askCase` | **$0** if shield ends it · else **~$0.01** (+ **~$0.05** depth) | ★★ discovery |
| `dossier-deep-dive` | Saviours | `shieldCheck`/`resolveEns`, `fetchDossier`, `askCase` | **$0** (reads pinned memory) | ★ light |
| `fleet-triage` | Saviours | `fleetCatalog`, `shieldCheck`, `investigate` | **$0** × N shields · **~$0.01** per true miss | ★★ batch |

**Never bind in any agent recipe:** `dispute`, `revoke`, `eacProbe`.

**Publish URL:** https://bazantic.com/dashboard/recipes/new  

Paste kits below live in each `docs/recipes/*.md` and in [`PUBLISH_KIT.md`](./PUBLISH_KIT.md).
