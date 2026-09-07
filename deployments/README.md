/**
 * Deployment records for Sepolia (and local Anvil).
 *
 * ## Chain boundary
 * - Graph evidence / threats: **mainnet** (stored as Incident.chainId = 1, etc.)
 * - This file’s network (sepolia|anvil): where the **registry contract** lives
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
