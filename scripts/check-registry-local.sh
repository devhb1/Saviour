#!/usr/bin/env bash
# Functional gate: Anvil deploy → record → TS register/read/idempotent.
# Proves Remember path works before Sepolia. Does not commit anything.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ANVIL_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
RPC=http://127.0.0.1:8545

if ! curl -s -X POST "$RPC" -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
  | grep -q 0x7a69; then
  echo "Starting anvil..."
  anvil --silent >/tmp/saviours-anvil.log 2>&1 &
  ANVIL_PID=$!
  trap 'kill "$ANVIL_PID" 2>/dev/null || true; rm -f deployments/anvil.json' EXIT
  for i in $(seq 1 30); do
    if curl -s -X POST "$RPC" -H 'content-type: application/json' \
      --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
      | grep -q 0x7a69; then
      break
    fi
    sleep 0.2
  done
else
  trap 'rm -f deployments/anvil.json' EXIT
fi

echo "Deploying SavioursRegistry to Anvil..."
(
  cd contracts
  RELAYER_PRIVATE_KEY="$ANVIL_KEY" forge script script/Deploy.s.sol:DeployScript \
    --rpc-url "$RPC" --broadcast --private-key "$ANVIL_KEY" -vv
)

echo "Recording deployment..."
pnpm exec tsx scripts/record-deployment.ts --network anvil

echo "Running TS register/read gate..."
RELAYER_PRIVATE_KEY="$ANVIL_KEY" ANVIL_RPC_URL="$RPC" \
  pnpm --filter @saviours/core exec tsx src/registry/local.gate.ts

echo "ok: check-registry-local"
