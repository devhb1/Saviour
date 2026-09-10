/**
 * Resolve a paste target to a 0x address for investigate / Agents / Shield.
 * Accepts: 0x…40 · `<addr>.saviours.eth` · public ENS (e.g. jaredfromsubway.eth).
 */

import { createPublicClient, http, type Address } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import { loadRootEnv } from "../config/env";

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;
const SAVIOURS_LABEL_RE =
  /^(0x[a-fA-F0-9]{40})\.saviours\.eth$/i;

export type ResolveTargetResult =
  | {
      ok: true;
      address: Address;
      input: string;
      via: "hex" | "saviours-label" | "ens";
      ensName?: string;
    }
  | { ok: false; error: string; input: string };

function mainnetRpc(): string {
  loadRootEnv();
  return (
    process.env.MAINNET_RPC_URL?.trim() ||
    process.env.ETHEREUM_RPC_URL?.trim() ||
    process.env.SEPOLIA_RPC_URL?.trim() || // last resort — may fail for mainnet ENS
    ""
  );
}

/**
 * Normalize user paste → checksum/lowercase address for APIs.
 */
export async function resolveTargetInput(
  raw: string,
): Promise<ResolveTargetResult> {
  const input = raw.trim();
  if (!input) {
    return { ok: false, error: "Empty target", input };
  }

  if (ADDR_RE.test(input)) {
    return {
      ok: true,
      address: input.toLowerCase() as Address,
      input,
      via: "hex",
    };
  }

  const sav = input.match(SAVIOURS_LABEL_RE);
  if (sav?.[1]) {
    return {
      ok: true,
      address: sav[1].toLowerCase() as Address,
      input,
      via: "saviours-label",
      ensName: input.toLowerCase(),
    };
  }

  // Public ENS (mainnet) — jaredfromsubway.eth, vitalik.eth, …
  if (!/\.eth$/i.test(input) || input.includes("..")) {
    return {
      ok: false,
      error: "Use a 0x address, <addr>.saviours.eth, or a public *.eth name",
      input,
    };
  }

  const rpc = mainnetRpc();
  if (!rpc) {
    return {
      ok: false,
      error: "No RPC configured to resolve public ENS names",
      input,
    };
  }

  try {
    const client = createPublicClient({
      chain: mainnet,
      transport: http(rpc),
    });
    const name = normalize(input);
    const address = await client.getEnsAddress({ name });
    if (!address || address === "0x0000000000000000000000000000000000000000") {
      return {
        ok: false,
        error: `ENS name not found: ${name}`,
        input,
      };
    }
    return {
      ok: true,
      address: address.toLowerCase() as Address,
      input,
      via: "ens",
      ensName: name,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "ENS resolve failed",
      input,
    };
  }
}
