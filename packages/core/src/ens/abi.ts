/**
 * Shared minimal ABIs for ENSv2 UserRegistry + PermissionedResolver writes.
 * Sourced from ensdomains/contracts-v2 interfaces used by the Sepolia spike.
 */

import { parseAbi } from "viem";

export const userRegistryAbi = parseAbi([
  "function register(string label, address owner, address registry, address resolver, uint256 roleBitmap, uint64 expiry) returns (uint256)",
  "function getResolver(string label) view returns (address)",
  "function findTokenId(string label) view returns (uint256)",
  "function getExpiry(uint256 anyId) view returns (uint64)",
  "function renew(uint256 anyId, uint64 newExpiry)",
  "function unregister(uint256 anyId)",
]);

export const permissionedResolverAbi = parseAbi([
  "function setText(bytes32 node, string key, string value)",
  "function text(bytes32 node, string key) view returns (string)",
]);
