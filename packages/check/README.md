# `@saviours/check`

[![npm](https://img.shields.io/npm/v/@saviours/check.svg)](https://www.npmjs.com/package/@saviours/check)

Two-line counterparty check for wallets and agents.  
Default path reads Sepolia ENS only — **$0**, no Saviours server.

```bash
pnpm add @saviours/check
# npm i @saviours/check
```

```ts
import { check, guard } from "@saviours/check";

const r = await check("0x935bfb495e33f74d2e9735df1da66ace442ede48");
if (r.decision === "BLOCK") throw new Error("named TAINTED");

await guard(addr); // throws SavioursBlockedError on BLOCK
```

| Mode | Path | Cost | Our server? |
|---|---|---|---|
| `ens` (default) | PermissionedResolver.text | $0 | No |
| `shield` | `POST /api/shield/check` | $0 | Gateway |
| `full` | `POST /api/investigate` | USDC on miss | Gateway |

```ts
await check(addr, { mode: "shield" });
await check(addr, { mode: "full" });
```

Also: `castCommand(address)`, React helper `@saviours/check/react`.

## Product law

- Memory hit is always **$0**.
- **UNKNOWN / no name ≠ SAFE.**
- Only WATCH / TAINTED are named.

## Links

- App: [www.saviours.xyz](https://www.saviours.xyz) · Build · Wallet gate  
- Integrate guide: [docs/INTEGRATE.md](https://github.com/devhb1/Saviour/blob/main/docs/INTEGRATE.md)  
- MCP: `https://saviour.bazgateway.com/mcp`  
- OpenAPI: [openapi-saviours.json](https://www.saviours.xyz/openapi-saviours.json)

## Support

- Email: [b4harshit01@gmail.com](mailto:b4harshit01@gmail.com)  
- Twitter: [@harshitb01](https://twitter.com/harshitb01)  
- GitHub: [devhb1](https://github.com/devhb1) · [issues](https://github.com/devhb1/Saviour/issues)

## Smoke

```bash
node --input-type=module -e "
import { check } from '@saviours/check';
console.log(await check('0x935bfb495e33f74d2e9735df1da66ace442ede48'));
"
# → decision BLOCK · status TAINTED
```
