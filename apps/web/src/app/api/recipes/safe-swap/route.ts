import { NextResponse } from "next/server";
import { quoteWethUsdc, UNISWAP_MAINNET } from "../../../../lib/uniswapQuote";

export const runtime = "nodejs";
export const maxDuration = 60;

const ATTACK_1 = "0x935bfb495e33f74d2e9735df1da66ace442ede48";

type ShieldCheck = {
  decision?: string;
  status?: string;
  ensName?: string | null;
  source?: string;
};

/**
 * POST /api/recipes/safe-swap
 * Multi-service recipe: live Uniswap QuoterV2 → shieldCheck each address ($0).
 * Body: { mode?: "abort" | "proceed" }
 * abort (default) injects ATTACK-1 as recipient → expect CANCEL.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      mode?: string;
    };
    const mode = body.mode === "proceed" ? "proceed" : "abort";
    const recipient =
      mode === "abort"
        ? ATTACK_1
        : "0x1111111111111111111111111111111111111111";

    let quote:
      | Awaited<ReturnType<typeof quoteWethUsdc>>
      | {
          service: "uniswap-quoter-v2-fallback";
          sellToken: string;
          buyToken: string;
          router: string;
          pool: string;
          quoter: string;
          fee: number;
          amountIn: string;
          amountOut: null;
          gasEstimate: null;
          source: "fallback-addresses";
          note: string;
        };

    try {
      quote = await quoteWethUsdc();
    } catch (e) {
      // Keep recipe runnable if public RPC flaps — still shield real Uniswap addrs.
      quote = {
        service: "uniswap-quoter-v2-fallback",
        sellToken: UNISWAP_MAINNET.sellToken,
        buyToken: UNISWAP_MAINNET.buyToken,
        router: UNISWAP_MAINNET.router,
        pool: UNISWAP_MAINNET.pool,
        quoter: UNISWAP_MAINNET.quoter,
        fee: UNISWAP_MAINNET.fee,
        amountIn: UNISWAP_MAINNET.amountInWei.toString(),
        amountOut: null,
        gasEstimate: null,
        source: "fallback-addresses",
        note: `QuoterV2 unavailable (${e instanceof Error ? e.message.slice(0, 120) : "rpc"}); using mainnet Uniswap addresses. Shield still live.`,
      };
    }

    const extracted = [
      { role: "router", address: quote.router },
      { role: "pool", address: quote.pool },
      { role: "quoter", address: quote.quoter },
      { role: "recipient", address: recipient },
    ];

    const origin = new URL(req.url).origin;
    const checks: Array<{
      role: string;
      address: string;
      decision?: string;
      status?: string;
      ensName?: string | null;
      source?: string;
      error?: string;
      costUsd: number;
    }> = [];

    for (const part of extracted) {
      try {
        const res = await fetch(`${origin}/api/shield/check`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chainId: 1,
            address: part.address,
            registryNetwork: "sepolia",
          }),
          signal: AbortSignal.timeout(45_000),
        });
        const json = (await res.json()) as {
          check?: ShieldCheck & {
            records?: Record<string, string>;
          };
          error?: string;
        };
        if (!res.ok) {
          checks.push({
            role: part.role,
            address: part.address,
            error: json.error ?? `HTTP ${res.status}`,
            costUsd: 0,
          });
          continue;
        }
        checks.push({
          role: part.role,
          address: part.address,
          decision: json.check?.decision,
          status:
            json.check?.status ||
            json.check?.records?.["saviours.status"] ||
            undefined,
          ensName: json.check?.ensName ?? null,
          source: json.check?.source,
          costUsd: 0,
        });
      } catch (e) {
        checks.push({
          role: part.role,
          address: part.address,
          error: e instanceof Error ? e.message : "shield failed",
          costUsd: 0,
        });
      }
    }

    const blockers = checks.filter(
      (c) => c.decision === "BLOCK" || c.decision === "WARN",
    );
    const result =
      blockers.length > 0
        ? {
            action: "CANCEL" as const,
            reasons: blockers.map(
              (b) =>
                `${b.role} ${b.ensName ?? b.address} → ${b.decision} (${b.status})`,
            ),
          }
        : {
            action: "PROCEED" as const,
            reasons: ["all extracted addresses clear of named threats"],
          };

    return NextResponse.json({
      recipe: "safe-swap-with-memory",
      mode,
      quote: {
        ...quote,
        recipient,
      },
      checks,
      result,
      pricing: {
        shieldChecks: checks.length,
        totalUsd: 0,
        law: "MEMORY HIT is free forever — never charge shieldCheck",
      },
      services: [quote.service, "saviours-shield"],
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "safe-swap recipe failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
