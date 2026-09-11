# `@saviours/check`

Two-line counterparty check. Default path talks to Sepolia ENS only — **zero** `@saviours/core`, **$0**, no our server.

```ts
import { check } from "@saviours/check";

const r = await check("0x935bfb495e33f74d2e9735df1da66ace442ede48");
if (r.decision === "BLOCK") throw new Error("counterparty is named TAINTED");
```

| Mode | Path | Cost | Our server? |
|---|---|---|---|
| `ens` (default) | PermissionedResolver.text | $0 | No |
| `shield` | `POST /api/shield/check` | $0 | Gateway |
| `full` | `POST /api/investigate` | ~$0.01 miss | Gateway |

Also: `guard(address)`, `castCommand(address)`.
