import {
  createPublicClient,
  http,
  type Hex,
  type Address,
} from "viem";
import { mainnet } from "viem/chains";

export type CurrentControls = {
  txCooldown: string | null;
  txExpiration: string | null;
  modules: string[] | null;
  delay: string | null;
  blockNumber: string | null;
  rpcError?: string;
};

const delayAbi = [
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
] as const;

const modulesAbi = [
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

const SENTINEL = "0x0000000000000000000000000000000000000001" as Address;

function rpcUrl(chainId: number) {
  if (chainId === 1) {
    return (
      process.env.ETH_RPC_URL?.trim() ||
      process.env.MAINNET_RPC_URL?.trim() ||
      "https://ethereum-rpc.publicnode.com"
    );
  }
  return process.env.ETH_RPC_URL?.trim() || "https://ethereum-rpc.publicnode.com";
}

/**
 * Read current Delay / Safe control surface for Privilege Diff before-state.
 * Soft-fails to null fields — never invents values.
 */
export async function readCurrentControls(opts: {
  chainId: number;
  /** Zodiac Delay (or OZ Timelock) address */
  delayOrTimelock?: Hex;
  /** Safe that may hold modules */
  safeAddress?: Hex;
}): Promise<CurrentControls> {
  const out: CurrentControls = {
    txCooldown: null,
    txExpiration: null,
    modules: null,
    delay: null,
    blockNumber: null,
  };

  try {
    const client = createPublicClient({
      chain: opts.chainId === 1 ? mainnet : mainnet,
      transport: http(rpcUrl(opts.chainId)),
    });
    const block = await client.getBlockNumber();
    out.blockNumber = block.toString();

    if (opts.delayOrTimelock) {
      try {
        const cooldown = await client.readContract({
          address: opts.delayOrTimelock as Address,
          abi: delayAbi,
          functionName: "txCooldown",
        });
        out.txCooldown = cooldown.toString();
      } catch {
        /* not a Delay or reverted */
      }
      try {
        const exp = await client.readContract({
          address: opts.delayOrTimelock as Address,
          abi: delayAbi,
          functionName: "txExpiration",
        });
        out.txExpiration = exp.toString();
      } catch {
        /* optional */
      }
    }

    const moduleHost = (opts.safeAddress ?? opts.delayOrTimelock) as
      | Address
      | undefined;
    if (moduleHost) {
      try {
        const [mods] = await client.readContract({
          address: moduleHost,
          abi: modulesAbi,
          functionName: "getModulesPaginated",
          args: [SENTINEL, 20n],
        });
        out.modules = mods.map((m) => m.toLowerCase());
      } catch {
        /* host may not be a Safe */
      }
    }
  } catch (e) {
    out.rpcError = e instanceof Error ? e.message : String(e);
  }

  return out;
}
