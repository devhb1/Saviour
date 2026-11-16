# Base mainnet readiness checklist

Do **not** deploy SavioursRegistryV2 to Base mainnet until all are checked:

- [x] Foundry suite green (ops / quarantine / supersede / 7702)
- [x] Fixtures committed (Makina / Term / Thessaly)
- [x] QueueWatch Term CI green
- [ ] Base Sepolia verified live deploy (see `deployments/base-sepolia.json`)
- [ ] Staging demo scripted against live address (`scripts/demo-v2-sepolia.ts`)
- [ ] Writer Safe 2-of-3 plan documented (INDEXER ≠ ATTESTER)
- [ ] Independent security review notes started
- [x] No CRITICAL→auto-TAINTED in decoder/registry paths
- [x] Docs label Sepolia ENS as staging (`docs/PRODUCT_LAW.md`, README)
