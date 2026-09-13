# Integrate SAVIOURS

**Public security memory for agents and wallets.**  
Investigate once → name on ENS → every later call is **$0**.

| Resource | URL |
|---|---|
| App | [www.saviours.xyz](https://www.saviours.xyz) |
| Build UI | [www.saviours.xyz/#build](https://www.saviours.xyz/#build) |
| Gateway guide | [www.saviours.xyz/gateway](https://www.saviours.xyz/gateway) |
| MCP | `https://saviours.bazgateway.com/mcp` (**POST** only — browser GET `/` is 404 by design) |
| OpenAPI | [openapi-saviours.json](https://www.saviours.xyz/openapi-saviours.json) |
| npm | [`@saviours/check`](https://www.npmjs.com/package/@saviours/check) |
| Skill | [`SKILL.md`](../SKILL.md) |
| Repo | [github.com/devhb1/Saviour](https://github.com/devhb1/Saviour) |

---

## Choose a path (≤60s)

| You are… | Do this |
|---|---|
| **AI agent** (Claude / Cursor) | Add MCP → paste check-before-sign policy |
| **Wallet / dapp** | Fresh folder → `npm i @saviours/check` → `check()` / `guard()` before sign |
| **Any HTTP client** | `POST …/api/shield/check` then maybe `investigate` |
| **No dependencies** | `cast` ENS `saviours.status` on Sepolia |

---

## 1 · Agents (MCP)

```bash
claude mcp add --transport http saviours https://saviours.bazgateway.com/mcp
```

Cursor `mcp.json`:

```json
{
  "mcpServers": {
    "saviours": {
      "url": "https://saviours.bazgateway.com/mcp"
    }
  }
}
```

**Policy (paste into the agent):**

```
Before any transfer, approve, or swap to an EVM address:
1. Call shieldCheck with requestBody { chainId: 1, address, registryNetwork: "sepolia" }.
2. If BLOCK or WARN → CANCEL. Do not sign. Cost must be $0.
3. If miss / ESCALATE → investigate (402 → settle x402 on Base) OR ask the human.
4. Optional: read saviours.status on <addr>.saviours.eth via public Sepolia RPC.
Never invent TAINTED. Never treat UNKNOWN as SAFE. Never pay for a memory hit.
```

Primary tools: **`shieldCheck` ($0 forever — no payment handshake)** · `investigate` (~$0.01) · `getEvidence` / `askCase` (~$0.05). **Bazantic gateway MCP** exposes **17 tools**; **local stdio** (`pnpm mcp` / `packages/mcp`) exposes **5 tools** for Cursor/Claude. Agent recipes bind the safe subset — `dispute` / `revoke` / `eacProbe` are **operator-only** (fail-closed 401 on public).

**Published recipes (5):** `safe-swap-with-memory` · `saviours-check-before-sign` · `investigate-once-explain` · `dossier-deep-dive` · `fleet-triage`. Paste kit: [`docs/recipes/PUBLISH_KIT.md`](./recipes/PUBLISH_KIT.md).

---

## 2 · Wallet / app (`@saviours/check`)

**Fresh project only.** Do **not** run `npm i` / `pnpm add` inside the Saviours git clone — that repo is a **pnpm workspace**; mixing `npm` there crashes with `Cannot read properties of null (reading 'matches')`.

```bash
mkdir saviours-demo && cd saviours-demo
npm init -y
npm i @saviours/check
# or: pnpm init && pnpm add @saviours/check

# ESM smoke (package is ESM-only — import, not require)
node --input-type=module -e "
import { check } from '@saviours/check';
const r = await check('0x935bfb495e33f74d2e9735df1da66ace442ede48');
console.log(r.decision, r.status); // named → BLOCK|WARN
"
```

```ts
import { check, guard } from "@saviours/check";

const r = await check("0x935bfb495e33f74d2e9735df1da66ace442ede48");
// ens mode (default): Sepolia ENS · $0 · no our server

if (r.decision === "BLOCK" || r.decision === "WARN") {
  throw new Error(`${r.decision}: ${r.status}`);
}

await guard(addr); // throws SavioursBlockedError on BLOCK
```

| Mode | Call | Cost |
|---|---|---|
| `ens` (default) | PermissionedResolver | $0 |
| `shield` | `check(addr, { mode: "shield" })` | $0 gateway |
| `full` | `check(addr, { mode: "full" })` | USDC on miss |

**Inside the monorepo:** package is already a workspace member — `pnpm --filter @saviours/check build` / `smoke`. No registry install needed.

### Wagmi / viem pre-sign

Copy [`packages/check/examples/wagmi-pre-sign.ts`](../packages/check/examples/wagmi-pre-sign.ts) into your dapp:

```ts
import { preSignCheck, sendTransactionGuarded } from "./wagmi-pre-sign";

const hit = await preSignCheck(to);
if (hit.decision === "WARN") {
  // human gate — WARN ≠ SAFE
}
await sendTransactionGuarded(walletClient, { to, value, account, chain });
```

Default path is ENS `$0` (no Saviours server). Extension deferred unless a follow-up track appears.

Live demo: **Playground → Wallet gate** on [www.saviours.xyz](https://www.saviours.xyz).

---

## 3 · Raw HTTP

```bash
# MEMORY HIT · ATTACK-1 → BLOCK · $0
curl -sS -X POST https://saviours.bazgateway.com/api/shield/check \
  -H 'content-type: application/json' \
  -d '{"chainId":1,"address":"0x935bfb495e33f74d2e9735df1da66ace442ede48","registryNetwork":"sepolia"}'

# Miss → HTTP 402 (agent settles x402 on Base, then retries)
curl -sS -X POST https://saviours.bazgateway.com/api/investigate \
  -H 'content-type: application/json' \
  -d '{"chainId":1,"address":"0x1111111111111111111111111111111111111113","forceFresh":true,"registryNetwork":"sepolia"}'
```

Same shapes on the app origin: `https://www.saviours.xyz/api/shield/check`.

---

## 4 · Raw ENS (`cast`)

```bash
cast call 0xF479306621F718F7d76875f67506ceD33717751c \
  "text(bytes32,string)(string)" \
  $(cast namehash 0x935bfb495e33f74d2e9735df1da66ace442ede48.saviours.eth) \
  "saviours.status" \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com
# → TAINTED
```

---

## Product law (do not violate)

1. Only **WATCH** / **TAINTED** are named. SAFE is never a name.
2. No name / **UNKNOWN** ≠ safe. Escalate; never treat blank as ALLOW.
3. Memory hit is **always $0**. Never charge for remembering.
4. Fresh investigate is paid by the **calling agent** (Bazantic x402 on Base).
5. AI explains; a deterministic validator owns the verdict. AI never writes ENS.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `saviours.bazgateway.com` in browser shows **not found** | Expected. Root has no HTML. Use [/gateway](https://www.saviours.xyz/gateway) or POST `/mcp` / `/api/*`. |
| MCP GET `/mcp` → 405 | Use an MCP client (POST). Claude/Cursor snippets on Build. |
| `shieldCheck` / `check` returns ALLOW / UNKNOWN on a “bad” address | Only **named** threats BLOCK for $0. Unnamed → miss → pay `investigate` or ask human. |
| `investigate` → **402** | Correct unpaid invoice. Settle with Bazantic grant / x402 on **Base**, then retry. |
| `pnpm add` / `npm i @saviours/check` fails | **Don’t install inside the Saviours monorepo** (pnpm workspace — npm arborist crashes). Use a fresh folder: `mkdir demo && cd demo && npm init -y && npm i @saviours/check`. Need Node ≥20. Package is **ESM-only** (`import` / `node --input-type=module`). |
| ENS / `cast` empty | Wrong RPC (must be **Sepolia**), wrong namehash, or address not named yet. |
| MetaMask never opens after BLOCK | Intended. Override only on an explicit user click (user-gesture). |
| CORS from a custom origin | Prefer `@saviours/check` **ens** mode (no our server) or proxy shield through your backend. |
| Rate / demo pay cap on Playground | Playground caps paid investigates per session to protect the grant. Use `$0` shield / memory for unlimited. |
| TypeScript can’t find types | Import from `@saviours/check` (exports `types`). NodeNext / bundler moduleResolution. |

---

## Support

We’re happy to help integrators.

| | |
|---|---|
| **Email** | [b4harshit01@gmail.com](mailto:b4harshit01@gmail.com) |
| **Twitter / X** | [@harshitb01](https://twitter.com/harshitb01) |
| **GitHub** | [github.com/devhb1](https://github.com/devhb1) · issues on [Saviour](https://github.com/devhb1/Saviour/issues) |

Include: your stack (agent / wallet / HTTP), the address you checked, response JSON (redact secrets), and whether you used MCP, npm, or REST.
