export const safeAbi = [
  {
    type: "function",
    name: "VERSION",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "getOwners",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address[]" }],
  },
  {
    type: "function",
    name: "getThreshold",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getGuard",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "getModulesPaginated",
    stateMutability: "view",
    inputs: [
      { name: "start", type: "address" },
      { name: "pageSize", type: "uint256" },
    ],
    outputs: [
      { name: "array", type: "address[]" },
      { name: "next", type: "address" },
    ],
  },
] as const;

export const delayAbi = [
  {
    type: "function",
    name: "txCooldown",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "txExpiration",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
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
    name: "getModulesPaginated",
    stateMutability: "view",
    inputs: [
      { name: "start", type: "address" },
      { name: "pageSize", type: "uint256" },
    ],
    outputs: [
      { name: "array", type: "address[]" },
      { name: "next", type: "address" },
    ],
  },
] as const;

export const SENTINEL = "0x0000000000000000000000000000000000000001" as const;
export const ZERO = "0x0000000000000000000000000000000000000000" as const;

/** Known Zodiac mastercopies (Ethereum) — identity hints only */
export const ROLES_MASTERCOPIES = new Set([
  "0xf2964ce6161ce0e75964fe7927ce114cb0b283d5", // 2.1.1
  "0x9646fdad06d3e24444381f44362a3b0eb343d337", // 2.1.0 faulty
  "0xd8dfc1d938d7d163c5231688341e9635e9011889", // Roles v1 (Nov16 module impl)
]);
export const DELAY_MASTERCOPIES = new Set([
  "0x824175b945838d127c1ca83cbce11d8e44f6df01", // 1.1.1
  "0x01f8cabb808d7de0df4202d4b60c8310d2f1339b", // 1.1.0 faulty
]);
