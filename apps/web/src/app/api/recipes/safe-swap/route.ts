import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ATTACK_1 = "0x935bfb495e33f74d2e9735df1da66ace442ede48";

const UNISWAP_FIXTURE = {
  service: "uniswap-fixture",
  sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  router: "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
  pool: "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640",
  quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
} as const;

type ShieldCheck = {
  decision?: string;
  status?: string;
  ensName?: string | null;
  source?: string;
};

/**
 * POST /api/recipes/safe-swap
 * Multi-service recipe demo: Uniswap-shaped quote → shieldCheck each address.
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

    const extracted = [
      { role: "router", address: UNISWAP_FIXTURE.router },
      { role: "pool", address: UNISWAP_FIXTURE.pool },
      { role: "quoter", address: UNISWAP_FIXTURE.quoter },
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
        ...UNISWAP_FIXTURE,
        recipient,
        note: "Uniswap-shaped fixture (real mainnet Uniswap addresses). ATTACK-1 is recipient only on abort mode.",
      },
      checks,
      result,
      pricing: {
        shieldChecks: checks.length,
        totalUsd: 0,
        law: "MEMORY HIT is free forever — never charge shieldCheck",
      },
      services: ["uniswap-fixture", "saviours-shield"],
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "safe-swap recipe failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
