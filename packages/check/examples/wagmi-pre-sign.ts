/**
 * Example — wagmi / viem wallet client: pre-sign counterparty check.
 * Copy into your dapp. Not a runtime dependency of @saviours/check.
 *
 *   npm i @saviours/check wagmi viem
 */
import { check, guard, SavioursBlockedError } from "@saviours/check";
import type { Address, Hex, WalletClient } from "viem";

/**
 * Resolve ENS memory ($0) before MetaMask / wallet client sends.
 * Throws SavioursBlockedError on BLOCK. WARN is returned for the caller to gate.
 */
export async function preSignCheck(to: Address): Promise<{
  decision: string;
  status?: string | null;
  ensName?: string | null;
}> {
  const r = await check(to, { mode: "ens" });
  if (r.decision === "BLOCK") {
    throw new SavioursBlockedError(r);
  }
  return {
    decision: r.decision,
    status: r.status,
    ensName: r.ensName,
  };
}

/**
 * Drop-in around walletClient.sendTransaction — ENS first, then send.
 */
export async function sendTransactionGuarded(
  walletClient: WalletClient,
  request: {
    to: Address;
    value?: bigint;
    data?: Hex;
    account: Address;
    chain?: WalletClient["chain"];
  },
): Promise<Hex> {
  await guard(request.to, { mode: "ens" });
  return walletClient.sendTransaction(request);
}

/**
 * React / wagmi sketch (peer deps: wagmi + react):
 *
 * ```tsx
 * import { useSendTransaction } from "wagmi";
 * import { preSignCheck } from "./wagmi-pre-sign";
 *
 * const { sendTransactionAsync } = useSendTransaction();
 *
 * async function onSwap(to: `0x${string}`, value: bigint) {
 *   const hit = await preSignCheck(to);
 *   if (hit.decision === "WARN") {
 *     // prompt human — product law: WARN is not SAFE
 *   }
 *   return sendTransactionAsync({ to, value });
 * }
 * ```
 */
