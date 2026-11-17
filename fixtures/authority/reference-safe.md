# Reference Safe — Gate G0

**Safe:** [`0x46DA347d1Db6EdCA62BF6Cd5892Dc284fC938613`](https://etherscan.io/address/0x46DA347d1Db6EdCA62BF6Cd5892Dc284fC938613) (Ethereum mainnet)  
**Delay:** [`0x35C99CF4a5DF2D9bCd822BeE32676D9590229e33`](https://etherscan.io/address/0x35C99CF4a5DF2D9bCd822BeE32676D9590229e33)  
**Why:** Public Term Finance treasury Safe used in Prop 5 forensic fixtures. Has Delay + at least one additional direct Safe module (bypass-path demo).

## Re-verify (cast)

```bash
SAFE=0x46DA347d1Db6EdCA62BF6Cd5892Dc284fC938613
DELAY=0x35C99CF4a5DF2D9bCd822BeE32676D9590229e33
RPC=${ETH_RPC_URL:-https://ethereum-rpc.publicnode.com}
SENTINEL=0x0000000000000000000000000000000000000001

cast call $SAFE "VERSION()(string)" --rpc-url $RPC
cast call $SAFE "getThreshold()(uint256)" --rpc-url $RPC
cast call $SAFE "getOwners()(address[])" --rpc-url $RPC
cast call $SAFE "getModulesPaginated(address,uint256)(address[],address)" $SENTINEL 20 --rpc-url $RPC
cast call $DELAY "txCooldown()(uint256)" --rpc-url $RPC
cast call $DELAY "txExpiration()(uint256)" --rpc-url $RPC
cast call $DELAY "avatar()(address)" --rpc-url $RPC
cast call $DELAY "target()(address)" --rpc-url $RPC
```

## Observed at doc time (17 Nov 2026)

| Field | Value |
|---|---|
| Safe VERSION | `1.3.0` |
| Threshold | `1` |
| Delay cooldown | `0` |
| Delay expiration | `0` |
| Delay avatar/target | Safe itself |
| Safe modules | Delay `0x35C99…`, plus `0xD9DdE…` (direct path — Delay bypass candidate) |
| Modules on Delay | `0x1457BD…` |

## Coverage honesty

- Roles condition trees / members are **not** fully reconstructed in G0 — mark Coverage incomplete for Roles until Gate G1 expands `rolesAdapter`.
- Owners may change after incidents; always prefer live RPC over this snapshot.
- Cross-check module identity in Zodiac App when possible.

Machine-readable twin: [`reference-safe.json`](./reference-safe.json)
