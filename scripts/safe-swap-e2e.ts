/**
 * B3 — safe-swap-with-memory multi-service recipe e2e.
 *
 * Simulates a Uniswap-shaped quote (router / pool / recipient), then live
 * Saviours shieldCheck on each extracted address ($0). Abort path injects
 * ATTACK-1 as recipient so the recipe CANCELS on a named threat.
 *
 *   pnpm exec tsx scripts/safe-swap-e2e.ts
 *   pnpm exec tsx scripts/safe-swap-e2e.ts --proceed
 *   pnpm recipe:safe-swap
 */

const ATTACK_1 =
  "0x935bfb495e33f74d2e9735df1da66ace442ede48" as const;

/** Canonical Uniswap v3 / Universal Router addresses on Ethereum mainnet. */
const UNISWAP_FIXTURE = {
  service: "uniswap-fixture",
  note: "Uniswap-shaped quote fixture — addresses are real mainnet Uniswap infrastructure; ATTACK-1 is injected only on the abort path.",
  sellToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
  buyToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  router: "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD", // Universal Router
  pool: "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640", // USDC/WETH 0.05%
  quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
} as const;

function publicBase(): string {
  return (
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://www.saviours.xyz"
  ).replace(/\/$/, "");
}

function gatewayBase(): string {
  return (
    process.env.BAZANTIC_GATEWAY_URL?.trim() ||
    "https://saviour.bazgateway.com"
  ).replace(/\/$/, "");
}

type ShieldHit = {
  address: string;
  role: string;
  decision?: string;
  status?: string;
  ensName?: string | null;
  source?: string;
  error?: string;
};

async function shieldCheck(
  base: string,
  address: string,
): Promise<ShieldHit & { raw?: unknown }> {
  const res = await fetch(`${base}/api/shield/check`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chainId: 1,
      address,
      registryNetwork: "sepolia",
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const json = (await res.json()) as {
    check?: {
      decision?: string;
      status?: string;
      ensName?: string | null;
      source?: string;
      records?: Record<string, string>;
      reason?: string;
    };
    error?: string;
  };
  if (!res.ok) {
    return {
      address,
      role: "",
      error: json.error ?? `HTTP ${res.status}`,
    };
  }
  return {
    address,
    role: "",
    decision: json.check?.decision,
    status:
      json.check?.status ||
      json.check?.records?.["saviours.status"] ||
      undefined,
    ensName: json.check?.ensName,
    source: json.check?.source,
    raw: json,
  };
}

function buildQuote(mode: "abort" | "proceed") {
  const recipient =
    mode === "abort"
      ? ATTACK_1
      : "0x1111111111111111111111111111111111111111";
  return {
    ...UNISWAP_FIXTURE,
    mode,
    recipient,
    extracted: [
      { role: "router", address: UNISWAP_FIXTURE.router },
      { role: "pool", address: UNISWAP_FIXTURE.pool },
      { role: "quoter", address: UNISWAP_FIXTURE.quoter },
      { role: "recipient", address: recipient },
    ],
  };
}

async function main() {
  const proceed = process.argv.includes("--proceed");
  const mode = proceed ? "proceed" : "abort";
  const quote = buildQuote(mode);
  const bases = [gatewayBase(), publicBase()].filter(
    (v, i, a) => a.indexOf(v) === i,
  );

  console.log("safe-swap-with-memory e2e");
  console.log("mode:", mode);
  console.log("quote service:", quote.service);
  console.log(
    "extracted:",
    quote.extracted.map((e) => `${e.role}=${e.address}`).join(" · "),
  );

  let baseUsed = bases[0]!;
  const hits: ShieldHit[] = [];

  for (const part of quote.extracted) {
    let hit: ShieldHit | null = null;
    let lastErr = "";
    for (const base of bases) {
      try {
        const r = await shieldCheck(base, part.address);
        if (!r.error) {
          hit = { ...r, role: part.role };
          baseUsed = base;
          break;
        }
        lastErr = r.error;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }
    if (!hit) {
      hits.push({
        address: part.address,
        role: part.role,
        error: lastErr || "shield failed",
      });
      continue;
    }
    hits.push(hit);
    console.log(
      `  shield ${part.role} ${part.address.slice(0, 10)}… → ${hit.decision}/${hit.status ?? "?"} source=${hit.source ?? "?"} $0`,
    );
  }

  const blockers = hits.filter(
    (h) => h.decision === "BLOCK" || h.decision === "WARN",
  );
  const failed = hits.filter((h) => h.error);

  console.log("\nshield host:", baseUsed);
  if (failed.length) {
    console.error("FAIL shield errors:", failed);
    process.exit(1);
  }

  if (mode === "abort") {
    if (blockers.length === 0) {
      console.error(
        "FAIL expected CANCEL — ATTACK-1 recipient should BLOCK/WARN",
      );
      process.exit(1);
    }
    console.log("\nRESULT: CANCEL");
    for (const b of blockers) {
      console.log(
        `  reason: ${b.role} ${b.ensName ?? b.address} → ${b.decision} (${b.status})`,
      );
    }
    console.log(
      "OK multi-service flow: Uniswap-shaped quote → Saviours shield → abort",
    );
    return;
  }

  if (blockers.length) {
    console.error("FAIL proceed mode hit blockers:", blockers);
    process.exit(1);
  }
  console.log("\nRESULT: PROCEED (quote cleared)");
  console.log("OK proceed path — no named threats on extracted addresses");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
