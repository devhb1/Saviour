/** Zodiac Roles Modifier — chain is trust root; SDK is differential oracle only. */

export const rolesModifierAbi = [
  {
    type: "function",
    name: "avatar",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "target",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "multisend",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "defaultRoles",
    stateMutability: "view",
    inputs: [{ name: "member", type: "address" }],
    outputs: [{ type: "uint16" }],
  },
] as const;

/** Roles v1 mastercopy (EIP-1167 target for Nov16 module). */
export const ROLES_V1_MASTERCOPY =
  "0xd8dfc1d938d7d163c5231688341e9635e9011889" as const;
