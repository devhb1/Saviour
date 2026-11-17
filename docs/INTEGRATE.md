# Integrate Saviour

**Product (interim):** Safe authority audit — Delay/topology + Privilege Diff.  
**Next:** Blast Radius Reach / Intent / Delta ([`BLAST_RADIUS.md`](./BLAST_RADIUS.md) · [`/vision`](https://www.saviours.xyz/vision)).

| Resource | URL |
|---|---|
| App | [www.saviours.xyz](https://www.saviours.xyz) |
| **In-app Integrate** | [/integrate](https://www.saviours.xyz/integrate) — SDK · CLI · API · CI |
| **In-app Docs** | [/docs](https://www.saviours.xyz/docs) — operator how-to |
| Audit | [/audit](https://www.saviours.xyz/audit) |
| Review (Delta evidence) | [/review](https://www.saviours.xyz/review) |
| Vision | [/vision](https://www.saviours.xyz/vision) |
| npm | [`@saviours/check`](https://www.npmjs.com/package/@saviours/check) |
| Archive (ENS / investigate) | [/legacy/v1](https://www.saviours.xyz/legacy/v1) |

> Prefer the live **/integrate** and **/docs** pages for the product guide; this file mirrors them for the repo.

---

## Choose a path (≤60s)

| You are… | Do this |
|---|---|
| **Treasury ops** | `/audit` or `pnpm audit:cli` / `pnpm reach:cli` |
| **Co-signer** | Open share link from Audit/Review; verify Freshness + hash MATCH on Delta |
| **Engineer** | Intent file + CI ([`INTENT_SPEC.md`](./INTENT_SPEC.md)) |
| **Auditor** | Golden report (`pnpm reach:cli --out report.json`) · [`REPORT_FORMAT.md`](./REPORT_FORMAT.md) |
| **Agent (archive)** | MCP shield — **not** day-1 Blast Radius |

---

## CLI

```bash
# Topology + Reach preview
pnpm audit:cli --fixture reference
pnpm reach:cli --fixture reference
pnpm reach:cli --fixture nov16 --out /tmp/nov16-reach.json

# Transaction Delta evidence
pnpm review:cli --fixture term

# Intent ⊆ Reach (token qty v1)
pnpm intent:cli --intent fixtures/intent/reference-keeper.json
```

Env: `ETH_RPC_URL` or `MAINNET_RPC_URL` (recommended in production). Falls back to public RPC.

---

## SDK (`@saviours/check`)

```ts
import {
  auditSafe,
  assessAndExplain,
  checkIntent,
  parseIntentJson,
  goldenReportJson,
} from "@saviours/check";

const audit = await auditSafe({ safeAddress: "0x…" });
// audit.findings · audit.coverage · audit.freshness · audit.reach

const golden = goldenReportJson(audit);
```

HTTP: `GET /api/audit?safe=0x…&chainId=1`  
Controls for Diff: `GET /api/review/controls?safe=0x…&delay=0x…`

---

## GitHub Action

Workflow: [`.github/workflows/intent-check.yml`](../.github/workflows/intent-check.yml)  
Runs intent unit tests + parses reference intent (rejects USD fields).

---

## Operator habit

See [`OPERATOR_RUNBOOK.md`](./OPERATOR_RUNBOOK.md).

---

## Archive appendix (not the product)

MCP / ENS / x402 investigate-once paths remain at `/legacy/v1` and historical docs (`ENS.md`, `BAZANTIC.md`). Do not integrate those for Blast Radius day-1.
