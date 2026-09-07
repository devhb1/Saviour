/**
 * ENSv2 Sepolia protocol addresses — copied from official
 * `ensdomains/contracts-v2` deployment docs (2026-06-29).
 * Source: contracts/lib/contracts-v2/contracts/docs/addresses/sepolia.md
 * Do not invent addresses. Re-verify with `cast codesize` after ENS upgrades.
 */
export const ensSepolia = {
  chainId: 11155111 as const,
  deployedAt: "2026-06-29T05:35:12.452Z",
  source:
    "ensdomains/contracts-v2 docs/addresses/sepolia.md (SEPOLIA_DEPLOYMENT ~20260629)",
  VerifiableFactory: "0x118bc31a50d559f7015a8da26d54b3b030cdb70f" as const,
  UserRegistryImpl: "0x840fa461059862ea466a711e8c98c8de732061c0" as const,
  PermissionedResolverImpl: "0x7e4b2d59938930168024201752ee5503df402303" as const,
  ETHRegistry: "0x67b728a792e789a8978b30cf1b3b641f19354b43" as const,
  ETHRegistrar: "0xa4449a0dd2b83007553d9b1d28b583a46a805a30" as const,
  MockUSDC: "0xd3322b29a7bdee707d1684676f149bf41aa3422f" as const,
  UniversalResolver: "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe" as const,
} as const;

/** EACBaseRolesLib.ALL_ROLES — one unit in every nybble slot */
export const ALL_ROLES =
  0x1111111111111111111111111111111111111111111111111111111111111111n;

/** Roles granted to incident subname owners (ETHRegistrar REGISTRATION_ROLE_BITMAP). */
export const REGISTRATION_ROLE_BITMAP = (() => {
  const ROLE_SET_SUBREGISTRY = 1n << 20n;
  const ROLE_SET_RESOLVER = 1n << 24n;
  const ROLE_CAN_TRANSFER_ADMIN = (1n << 28n) << 128n;
  return (
    ROLE_SET_SUBREGISTRY |
    (ROLE_SET_SUBREGISTRY << 128n) |
    ROLE_SET_RESOLVER |
    (ROLE_SET_RESOLVER << 128n) |
    ROLE_CAN_TRANSFER_ADMIN
  );
})();

export const ROLE_REGISTRAR = 1n << 0n;
export const ROLE_RENEW = 1n << 16n;
