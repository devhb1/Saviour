/**
 * Live Uniswap V3 QuoterV2 quote (mainnet eth_call).
 * Used by safe-swap recipe so the second service is real, not a fixture.
 */

import { createPublicClient, http, parseAbi, type Address } from "viem";
import { mainnet } from "viem/chains";

export const UNISWAP_MAINNET = {
  sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address, // WETH
  buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address, // USDC
  router: "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD" as Address, // Universal Router
  pool: "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640" as Address, // USDC/WETH 0.05%
  quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as Address, // QuoterV2
  fee: 500, // 0.05%
  amountInWei: 10n ** 16n, // 0.01 WETH
} as const;

const quoterAbi = parseAbi([
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
]);

function mainnetRpc(): string {
  return (
    process.env.MAINNET_RPC_URL?.trim() ||
    process.env.ETH_RPC_URL?.trim() ||
    process.env.ETHEREUM_RPC_URL?.trim() ||
    "https://ethereum-rpc.publicnode.com"
  );
}

export type UniswapQuoteResult = {
  service: "uniswap-quoter-v2";
  sellToken: Address;
  buyToken: Address;
  router: Address;
  pool: Address;
  quoter: Address;
  fee: number;
  amountIn: string;
  amountOut: string;
  gasEstimate: string;
  source: "quoter-v2";
  note: string;
};

/**
 * Quote WETH → USDC via QuoterV2. Quoter is nonpayable — use simulateContract (eth_call).
 */
export async function quoteWethUsdc(): Promise<UniswapQuoteResult> {
  const client = createPublicClient({
    chain: mainnet,
    transport: http(mainnetRpc(), { timeout: 20_000, retryCount: 1 }),
  });

  const { result } = await client.simulateContract({
    address: UNISWAP_MAINNET.quoter,
    abi: quoterAbi,
    functionName: "quoteExactInputSingle",
    args: [
      {
        tokenIn: UNISWAP_MAINNET.sellToken,
        tokenOut: UNISWAP_MAINNET.buyToken,
        amountIn: UNISWAP_MAINNET.amountInWei,
        fee: UNISWAP_MAINNET.fee,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });

  const [amountOut, , , gasEstimate] = result;

  return {
    service: "uniswap-quoter-v2",
    sellToken: UNISWAP_MAINNET.sellToken,
    buyToken: UNISWAP_MAINNET.buyToken,
    router: UNISWAP_MAINNET.router,
    pool: UNISWAP_MAINNET.pool,
    quoter: UNISWAP_MAINNET.quoter,
    fee: UNISWAP_MAINNET.fee,
    amountIn: UNISWAP_MAINNET.amountInWei.toString(),
    amountOut: amountOut.toString(),
    gasEstimate: gasEstimate.toString(),
    source: "quoter-v2",
    note: "Live QuoterV2 eth_call on mainnet. Shield checks stay $0; BLOCK never pays investigate.",
  };
}
