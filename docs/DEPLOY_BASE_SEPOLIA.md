# Deploy SavioursRegistryV2 — Base Sepolia (84532)

**Schema:** 2.4.1  
**Admin policy:** EOA OK for staging; move `DEFAULT_ADMIN_ROLE` to 2-of-3 Safe before mainnet.

## Prerequisites

```bash
# In Saviours/.env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org   # or Alchemy/QuickNode
DEPLOYER_PRIVATE_KEY=0x…                        # funded on Base Sepolia
REGISTRY_ADMIN=0x…                              # staging admin (often = deployer)
```

Fund deployer (Base Sepolia ETH). Current planned deployer from repo relayer: check `deployments/base-sepolia.json`.

## Broadcast + verify

```bash
cd contracts
set -a && source ../.env && set +a
export DEPLOYER_PRIVATE_KEY="${DEPLOYER_PRIVATE_KEY:-$RELAYER_PRIVATE_KEY}"
export REGISTRY_ADMIN="${REGISTRY_ADMIN:-$(cast wallet address --private-key $DEPLOYER_PRIVATE_KEY)}"

forge script script/DeployV2.s.sol:DeployV2 \
  --rpc-url "${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}" \
  --broadcast --verify \
  --private-key "$DEPLOYER_PRIVATE_KEY"
```

Record address/block/tx into `deployments/base-sepolia.json` (never commit private keys).

## Smoke (public RPC)

```bash
REG=0x…   # from deployments/base-sepolia.json
cast call $REG "resolve(uint64,address)(uint8,bool,uint8,bytes32,uint32,bytes32,uint8,bool,bool)" \
  8453 0x0000000000000000000000000000000000000001 \
  --rpc-url https://sepolia.base.org
# Expect action = 0 (NO_VERDICT), verifiedSafe = false
```

## Local dry-run (no faucet)

```bash
anvil &
forge script script/DeployV2.s.sol:DeployV2 --rpc-url http://127.0.0.1:8545 --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

See `deployments/anvil-v2.json` for last local proof.
