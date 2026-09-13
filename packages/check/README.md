# `@saviours/check`

<p align="left">
  <img src="https://www.saviours.xyz/brand/saviours-mark-ink.png" alt="saviours" width="40" height="40" />
</p>

[![npm](https://img.shields.io/npm/v/@saviours/check.svg)](https://www.npmjs.com/package/@saviours/check)

Two-line counterparty check for wallets and agents.  
Default path reads Sepolia ENS only — **$0**, no Saviours server.

## Install (fresh project)

**Do not run `npm i` / `pnpm add` inside the Saviours git monorepo.**  
That tree is pnpm-managed; mixing `npm` there crashes arborist (`Cannot read properties of null (reading 'matches')`).

```bash
mkdir saviours-demo && cd saviours-demo
npm init -y
npm i @saviours/check
# or: pnpm init && pnpm add @saviours/check
```

Package is **ESM-only** (`"type": "module"`). Use `import`, not `require`.

```bash
node --input-type=module -e "
import { check } from '@saviours/check';
const r = await check('0x935bfb495e33f74d2e9735df1da66ace442ede48');
console.log(r.decision, r.status); // named → BLOCK|WARN · TAINTED|WATCH
"
```

```ts
import { check, guard } from "@saviours/check";

const r = await check("0x935bfb495e33f74d2e9735df1da66ace442ede48");
if (r.decision === "BLOCK" || r.decision === "WARN") {
  throw new Error(\`named \${r.status}\`);
}

await guard(addr); // throws SavioursBlockedError on BLOCK
```

| Mode | Path | Cost | Our server? |
|---|---|---|---|
| `ens` (default) | PermissionedResolver.text | $0 | No |
| `shield` | `POST …/api/shield/check` | $0 | Bazantic gateway |
| `full` | `POST …/api/investigate` | ~$0.01 on miss (x402) | Bazantic gateway |

```ts
await check(addr, { mode: "shield" });
// unpaid miss → throws with HTTP 402 guidance; or pass apiKey / BAZANTIC_API_KEY
await check(addr, { mode: "full" });
```

Gateway defaults to **`https://saviours.bazgateway.com`** (override with `baseUrl` / `BAZANTIC_GATEWAY_URL`).  
Also exported: `BAZANTIC_GATEWAY`, `BAZANTIC_MCP`, `SAVIOURS_APP_URL`.

Also: `castCommand(address)`, React helper `@saviours/check/react`, wagmi/viem example in `examples/wagmi-pre-sign.ts`.

### Inside this monorepo

Workspace already wires the package — no npm install needed:

```bash
pnpm --filter @saviours/check build
pnpm --filter @saviours/check smoke
```

## Product law

- Memory hit is always **$0**.
- **UNKNOWN / no name ≠ SAFE.**
- Only WATCH / TAINTED are named.

## Bazantic (agents)

| | |
|---|---|
| Gateway | `https://saviours.bazgateway.com` |
| MCP | `https://saviours.bazgateway.com/mcp` (POST) |
| Tiers | Free `$0` · Standard `~$0.01` · Complex `~$0.05` |
| Recipes | `safe-swap-with-memory` · `saviours-check-before-sign` · `investigate-once-explain` · `dossier-deep-dive` · `fleet-triage` |

```bash
claude mcp add --transport http saviours https://saviours.bazgateway.com/mcp
```

Never bind in agent recipes: `dispute` · `revoke` · `eacProbe`.

## Links

- App: [www.saviours.xyz](https://www.saviours.xyz) · Build · Wallet gate · [/gateway](https://www.saviours.xyz/gateway)  
- Integrate: [docs/INTEGRATE.md](https://github.com/devhb1/Saviour/blob/main/docs/INTEGRATE.md)  
- Recipes: [docs/recipes/PUBLISH_KIT.md](https://github.com/devhb1/Saviour/blob/main/docs/recipes/PUBLISH_KIT.md)  
- OpenAPI: [openapi-saviours.json](https://www.saviours.xyz/openapi-saviours.json)

## Support

- Email: [b4harshit01@gmail.com](mailto:b4harshit01@gmail.com)  
- Twitter: [@harshitb01](https://twitter.com/harshitb01)  
- GitHub: [devhb1](https://github.com/devhb1) · [issues](https://github.com/devhb1/Saviour/issues)
