import { NextResponse } from "next/server";
import { createPublicClient, http, namehash, parseAbi } from "viem";
import { sepolia } from "viem/chains";

export const runtime = "nodejs";

const RESOLVER = "0xF479306621F718F7d76875f67506ceD33717751c" as const;
const PUBLIC_RPC = "https://ethereum-sepolia-rpc.publicnode.com";

const abi = parseAbi([
  "function text(bytes32 node, string key) view returns (string)",
]);

/**
 * POST /api/ens-text
 * Public-RPC read of an ENS text record — no Saviours write path, no Graph.
 * Body: { ensName, key }
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { ensName?: string; key?: string };
    const ensName = (body.ensName ?? "").trim().toLowerCase();
    const key = (body.key ?? "").trim();
    if (!ensName.includes(".") || !key) {
      return NextResponse.json(
        { error: "ensName and key required" },
        { status: 400 },
      );
    }
    const client = createPublicClient({
      chain: sepolia,
      transport: http(PUBLIC_RPC),
    });
    const value = await client.readContract({
      address: RESOLVER,
      abi,
      functionName: "text",
      args: [namehash(ensName), key],
    });
    return NextResponse.json({
      ensName,
      key,
      value: typeof value === "string" ? value : "",
      rpc: "publicnode-sepolia",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ens-text failed";
    return NextResponse.json({ error: message, value: "" }, { status: 502 });
  }
}
