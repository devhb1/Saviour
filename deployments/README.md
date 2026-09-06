/**
 * Deployment records for Sepolia (and local Anvil).
 *
 * Written by `pnpm deploy:record` after a Foundry broadcast.
 * The TypeScript registry client reads these files — never put the
 * contract address in `.env`.
 *
 * Tracked JSON example shape:
 * {
 *   "network": "sepolia",
 *   "chainId": 11155111,
 *   "contracts": {
 *     "SavioursRegistry": {
 *       "address": "0x...",
 *       "blockNumber": 0,
 *       "abiHash": "0x...",
 *       "deployedAt": "ISO-8601"
 *     }
 *   }
 * }
 */
