import {
  createPublicClient,
  http,
  type Hex,
  type Address,
} from "viem";
import { mainnet } from "viem/chains";

export type ModuleReadStatus = "ok" | "failed" | "truncated" | "unread";

export type CurrentControls = {
  txCooldown: string | null;
  txExpiration: string | null;
  /**
   * @deprecated Prefer safeModules / delayModules. Kept as the Safe list when
   * present, else the Delay list, for older Privilege Diff callers.
   */
  modules: string[] | null;
  /** Modules enabled on the Safe (when safeAddress was supplied). */
  safeModules: string[] | null;
  /** Modules enabled on the Delay (when delayOrTimelock was supplied). */
  delayModules: string[] | null;
  safeModuleReadStatus: ModuleReadStatus;
  delayModuleReadStatus: ModuleReadStatus;
  delay: string | null;
  blockNumber: string | null;
  blockHash: string | null;
  /** True when delayOrTimelock was MultiSend / non-Delay — before-state inconclusive */
  inconclusive?: boolean;
  inconclusiveReason?: string;
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
const ZERO = "0x0000000000000000000000000000000000000000";

function rpcUrl(chainId: number) {
  if (chainId === 1) {
    return (
      process.env.ETH_RPC_URL?.trim() ||
      process.env.MAINNET_RPC_URL?.trim() ||
      "https://ethereum-rpc.publicnode.com"
    );
  }
  return null;
}

async function readModulesOn(
  client: ReturnType<typeof createPublicClient>,
  host: Address,
  blockNumber: bigint,
): Promise<{ modules: string[]; status: ModuleReadStatus }> {
  const mods: string[] = [];
  let start: Address = SENTINEL;
  try {
    for (let page = 0; page < 50; page++) {
      const [batch, next] = await client.readContract({
        address: host,
        abi: modulesAbi,
        functionName: "getModulesPaginated",
        args: [start, 20n],
        blockNumber,
      });
      for (const m of batch) {
        mods.push(m.toLowerCase());
      }
      if (
        !next ||
        next.toLowerCase() === SENTINEL.toLowerCase() ||
        next.toLowerCase() === ZERO ||
        batch.length === 0
      ) {
        return { modules: mods, status: "ok" };
      }
      start = next;
    }
    return { modules: mods, status: "truncated" };
  } catch {
    return { modules: [], status: "failed" };
  }
}

/**
 * Read current Delay / Safe control surface for Privilege Diff before-state.
 * Mainnet-only. Soft-fails to null fields — never invents values.
 * Safe and Delay module lists are read independently when both are present.
 * All contract reads are pinned to the same block.
 */
export async function readCurrentControls(opts: {
  chainId: number;
  /** Zodiac Delay (or OZ Timelock) address — not MultiSend */
  delayOrTimelock?: Hex;
  /** Safe that may hold modules */
  safeAddress?: Hex;
  /** Caller already knows outer to is MultiSend / wrong target */
  inconclusive?: boolean;
  inconclusiveReason?: string;
}): Promise<CurrentControls> {
  const out: CurrentControls = {
    txCooldown: null,
    txExpiration: null,
    modules: null,
    safeModules: null,
    delayModules: null,
    safeModuleReadStatus: "unread",
    delayModuleReadStatus: "unread",
    delay: null,
    blockNumber: null,
    blockHash: null,
  };

  if (opts.inconclusive) {
    out.inconclusive = true;
    out.inconclusiveReason =
      opts.inconclusiveReason ??
      "Delay address not discovered — before-state inconclusive";
    return out;
  }

  if (opts.chainId !== 1) {
    out.rpcError =
      "Control reads are mainnet-only (chainId=1). Refuse untrusted multi-chain RPC mapping.";
    return out;
  }

  const url = rpcUrl(opts.chainId);
  if (!url) {
    out.rpcError = "No RPC URL configured for chain";
    return out;
  }

  try {
    const client = createPublicClient({
      chain: mainnet,
      transport: http(url),
    });
    const block = await client.getBlock();
    out.blockNumber = block.number.toString();
    out.blockHash = block.hash;
    const blockNumber = block.number;

    if (opts.delayOrTimelock) {
      out.delay = opts.delayOrTimelock.toLowerCase();
      try {
        const cooldown = await client.readContract({
          address: opts.delayOrTimelock as Address,
          abi: delayAbi,
          functionName: "txCooldown",
          blockNumber,
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
          blockNumber,
        });
        out.txExpiration = exp.toString();
      } catch {
        /* optional */
      }

      const delayPage = await readModulesOn(
        client,
        opts.delayOrTimelock as Address,
        blockNumber,
      );
      out.delayModules =
        delayPage.status === "failed" ? null : delayPage.modules;
      out.delayModuleReadStatus = delayPage.status;
    }

    if (opts.safeAddress) {
      const safePage = await readModulesOn(
        client,
        opts.safeAddress as Address,
        blockNumber,
      );
      out.safeModules =
        safePage.status === "failed" ? null : safePage.modules;
      out.safeModuleReadStatus = safePage.status;
    }

    // Legacy single list: prefer Safe, else Delay — callers that need both
    // should use safeModules / delayModules.
    out.modules = out.safeModules ?? out.delayModules;
  } catch (e) {
    out.rpcError = e instanceof Error ? e.message : String(e);
  }

  return out;
}
