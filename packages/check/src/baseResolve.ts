import {
  createPublicClient,
  http,
  type Address,
  type Hex,
} from "viem";
import { base, baseSepolia } from "viem/chains";
import {
  parseEofDelegationCode,
  simulateAuthorizationList,
  type Authorization,
} from "./eip7702.js";

export type ResolveAction = "NO_VERDICT" | "WARN" | "BLOCK" | "RPC_ERROR";

export type BaseResolveResult = {
  action: ResolveAction;
  verifiedSafe: false;
  findingId?: Hex;
  version?: number;
  evidenceHash?: Hex;
  relevantQueueOp?: boolean;
  latencyMs: number;
  subjectsChecked: Address[];
  error?: string;
};

const RESOLVE_ABI = [
  {
    type: "function",
    name: "resolve",
    stateMutability: "view",
    inputs: [
      { name: "subjectChainId", type: "uint64" },
      { name: "subject", type: "address" },
    ],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "status", type: "uint8" },
          { name: "verifiedSafe", type: "bool" },
          { name: "action", type: "uint8" },
          { name: "findingId", type: "bytes32" },
          { name: "version", type: "uint32" },
          { name: "evidenceHash", type: "bytes32" },
          { name: "delegationExposure", type: "uint8" },
          { name: "rpcOk", type: "bool" },
          { name: "relevantQueueOp", type: "bool" },
        ],
      },
    ],
  },
] as const;

const ACTION_MAP: ResolveAction[] = ["NO_VERDICT", "WARN", "BLOCK"];

export type BaseResolveOptions = {
  registryAddress: Address;
  /** Subject's chain (evidence chain), not necessarily Base */
  subjectChainId: number;
  /** Chain where eth_getCode / auth-list apply */
  txChainId: number;
  /** Prefer Base Sepolia for staging */
  registryNetwork?: "base" | "base-sepolia" | "anvil";
  rpcUrls?: string[];
  authorizationList?: Authorization[];
};

function pickChain(network: BaseResolveOptions["registryNetwork"]) {
  if (network === "base") return base;
  return baseSepolia;
}

function rank(a: ResolveAction): number {
  if (a === "BLOCK") return 3;
  if (a === "WARN") return 2;
  if (a === "NO_VERDICT") return 1;
  return 0;
}

/**
 * Keyless Base registry resolve + optional 7702 dual-check.
 * Miss → NO_VERDICT (never ALLOW). Transport failure → RPC_ERROR.
 */
export async function resolveBase(
  subject: Address,
  opts: BaseResolveOptions,
): Promise<BaseResolveResult> {
  const started = Date.now();
  const urls =
    opts.rpcUrls?.length
      ? opts.rpcUrls
      : opts.registryNetwork === "anvil"
        ? ["http://127.0.0.1:8545"]
        : opts.registryNetwork === "base"
          ? ["https://mainnet.base.org"]
          : ["https://sepolia.base.org"];

  const chain = pickChain(opts.registryNetwork ?? "base-sepolia");
  let lastErr: unknown;

  for (const url of urls) {
    try {
      const client = createPublicClient({ chain, transport: http(url) });
      const subjects: Address[] = [subject];

      if (opts.authorizationList?.length) {
        const sim = simulateAuthorizationList(opts.authorizationList, opts.txChainId);
        if (sim.impl) subjects.push(sim.impl);
      }

      // Current code on tx chain (may differ from Base) — use same RPC only if tx is Base*;
      // for L1 txChainId callers should pass a tx-chain capable URL first in rpcUrls.
      try {
        const code = (await client.request({
          method: "eth_getCode",
          params: [subject, "latest"],
        })) as string;
        if (code && code !== "0x") {
          const impl = parseEofDelegationCode(code);
          if (impl && !subjects.includes(impl)) subjects.push(impl);
        }
      } catch {
        // code read optional if RPC is Base-only while tx is L1 — auth-list still applies
      }

      let best: BaseResolveResult = {
        action: "NO_VERDICT",
        verifiedSafe: false,
        latencyMs: 0,
        subjectsChecked: subjects,
      };

      for (const s of subjects) {
        const row = await client.readContract({
          address: opts.registryAddress,
          abi: RESOLVE_ABI,
          functionName: "resolve",
          args: [BigInt(opts.subjectChainId), s],
        });
        const action = ACTION_MAP[Number(row.action)] ?? "NO_VERDICT";
        if (rank(action) >= rank(best.action)) {
          best = {
            action,
            verifiedSafe: false,
            findingId: row.findingId,
            version: Number(row.version),
            evidenceHash: row.evidenceHash,
            relevantQueueOp: row.relevantQueueOp,
            latencyMs: Date.now() - started,
            subjectsChecked: subjects,
          };
        }
      }

      best.latencyMs = Date.now() - started;
      return best;
    } catch (e) {
      lastErr = e;
    }
  }

  return {
    action: "RPC_ERROR",
    verifiedSafe: false,
    latencyMs: Date.now() - started,
    subjectsChecked: [subject],
    error: lastErr instanceof Error ? lastErr.message : String(lastErr),
  };
}

/** Map Base resolve → legacy Decision. NO_VERDICT → ESCALATE (never ALLOW). */
export function toDecision(action: ResolveAction): "BLOCK" | "WARN" | "ESCALATE" | "ALLOW" {
  if (action === "BLOCK") return "BLOCK";
  if (action === "WARN") return "WARN";
  if (action === "RPC_ERROR") return "ESCALATE";
  return "ESCALATE"; // NO_VERDICT
}
