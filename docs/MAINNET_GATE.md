# Base mainnet readiness checklist

Do **not** deploy SavioursRegistryV2 to Base mainnet until all are checked:

- [x] Foundry suite green (ops / quarantine / supersede / 7702)
- [x] Fixtures committed (Makina / Term forensic / Thessaly research-synthetic)
- [x] QueueWatch Term CI green
- [x] `assessTransaction` + Term Safe review demo (`scripts/demo-v3-stranger.ts`)
- [ ] Base Sepolia verified live deploy (see `deployments/base-sepolia.json`) — deployer 0 ETH
- [ ] Staging demo against live address (`SAVIOURS_BASE_REGISTRY` + demo-v3-stranger)
- [ ] Writer Safe 2-of-3 plan documented (INDEXER ≠ ATTESTER)
- [ ] Independent security review notes started
- [x] No CRITICAL→auto-TAINTED in decoder/registry paths
- [x] Docs label Sepolia ENS as staging (`docs/PRODUCT_LAW.md`, README)
