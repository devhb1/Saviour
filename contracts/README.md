# contracts/

Foundry workspace for SAVIOURS on-chain security memory (Sepolia).

No `package.json` here — Solidity only. Domain TypeScript lives in `packages/core`.

## Dependencies

Vendored under `lib/` (forge-std, OpenZeppelin contracts sources). Rebuild if missing:

```bash
cd contracts
forge install foundry-rs/forge-std --no-git
forge install OpenZeppelin/openzeppelin-contracts@v5.0.2 --no-git
```

Audit PDFs and OZ test/docs trees are gitignored — only Solidity sources are tracked.

## Commands

```bash
cd contracts
forge build
forge test
```

Deploy (needs funded `RELAYER_PRIVATE_KEY` + `SEPOLIA_RPC_URL` in repo-root `.env`):

```bash
set -a && source ../.env && set +a
forge script script/Deploy.s.sol:DeployScript --rpc-url "$SEPOLIA_RPC_URL" \
  --broadcast --private-key "$RELAYER_PRIVATE_KEY"
```

After deploy, record address/block into `/deployments/sepolia.json` via script — never hand-edit `.env`.
