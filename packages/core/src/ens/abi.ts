/**
 * Shared minimal ABIs for ENSv2 UserRegistry + PermissionedResolver writes.
 * Sourced from ensdomains/contracts-v2 interfaces used by the Sepolia spike.
 */

import { parseAbi } from "viem";

export const userRegistryAbi = parseAbi([
  "function register(string label, address owner, address registry, address resolver, uint256 roleBitmap, uint64 expiry) returns (uint256)",
  "function getResolver(string label) view returns (address)",
]);

export const permissionedResolverAbi = parseAbi([
  "function setText(bytes32 node, string key, string value)",
  "function text(bytes32 node, string key) view returns (string)",
]);
