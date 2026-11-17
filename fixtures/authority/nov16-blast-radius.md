# Nov 16 2026 — Roles drain fixture (R0)

**Safe:** [`0x595362A906a0B4e90AEe1430b1f80FDDe2bE80de`](https://etherscan.io/address/0x595362A906a0B4e90AEe1430b1f80FDDe2bE80de)  
**Roles module:** [`0x729c87d1B6939C9b2b0858ac25E235E83E5e6410`](https://etherscan.io/address/0x729c87d1B6939C9b2b0858ac25E235E83E5e6410)  
**Operator (role member):** `0x065F395147FC72747c7f48f67f039d4235884148`  
**Drain block:** `26427327` · **Replay at:** `26427326` (block before theft)  
**Machine twin:** [`nov16-blast-radius.json`](./nov16-blast-radius.json)

## Expected verdict (written BEFORE engine)

| Principal | Expected | Why |
|---|---|---|
| Role member `0x065F…4148` | **UNBOUNDED** (or UNKNOWN if policy unreadable) | Drain moved vault USDC + syrupUSDC to external Safe without owner signatures — effective policy permitted outbound value |

Must **never** claim BOUNDED for this principal at pre-theft block if free recipient / vault redeem paths existed.

## Cast sketch (pin block)

```bash
SAFE=0x595362A906a0B4e90AEe1430b1f80FDDe2bE80de
ROLES=0x729c87d1B6939C9b2b0858ac25E235E83E5e6410
BLOCK=26427326
RPC=${ETH_RPC_URL:-https://ethereum-rpc.publicnode.com}

cast call $SAFE "getModulesPaginated(address,uint256)(address[],address)" \
  0x0000000000000000000000000000000000000001 20 --rpc-url $RPC --block $BLOCK
cast call $ROLES "avatar()(address)" --rpc-url $RPC --block $BLOCK
cast call $ROLES "target()(address)" --rpc-url $RPC --block $BLOCK
cast call $ROLES "owner()(address)" --rpc-url $RPC --block $BLOCK
```

## Disclosure

Public addresses already in incident reporting. Do **not** publish full condition trees / exploit-ready params for other live treasuries without opt-in. See `docs/DISCLOSURE.md`.
