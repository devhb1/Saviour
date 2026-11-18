# @saviours/audit

Read-only audit of who can act through an Ethereum mainnet Safe beyond the owners.

This package is not `@saviours/check`. That name on npm is an older ENS counterparty check.

```bash
npm i @saviours/audit
```

```ts
import { auditSafe, goldenReportJson, verifyGoldenDigest } from "@saviours/audit";
import type { Hex } from "@saviours/audit";

const report = await auditSafe({
  safeAddress: "0x46DA347d1Db6EdCA62BF6Cd5892Dc284fC938613" as Hex,
  chainId: 1,
  blockNumber: 26435999n,
});
const golden = goldenReportJson(report);
const pin = JSON.parse(golden);
verifyGoldenDigest(pin);
```

`auditSafe` reads chain id 1 only. Condition amounts stay unknown. The report never says the Safe is safe. A matching digest means this package produced the pin at that block.
