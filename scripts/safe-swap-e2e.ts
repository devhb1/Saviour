/**
 * B3 — safe-swap-with-memory multi-service recipe e2e.
 *
 * Prefer product path: POST /api/recipes/safe-swap (live QuoterV2 + live Shield).
 * Fallback: fixed mainnet Uniswap addresses + live shieldCheck (offline smoke when
 * the web API is unreachable) — labeled, not claimed as a live quote.
 *
 *   pnpm exec tsx scripts/safe-swap-e2e.ts
 *   pnpm exec tsx scripts/safe-swap-e2e.ts --proceed
 *   pnpm recipe:safe-swap
 */

const ATTACK_1 =
  "0x935bfb495e33f74d2e9735df1da66ace442ede48" as const;

/** Offline smoke only — real mainnet Uniswap addresses, not a QuoterV2 response. */
const UNISWAP_ADDRESS_SET = {
  service: "uniswap-address-set-offline",
  note: "Offline address-set smoke when /api/recipes/safe-swap is unreachable. Product path uses live QuoterV2.",
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
    "http://127.0.0.1:3000"
  ).replace(/\/$/, "");
}

function gatewayBase(): string {
  return (
    process.env.BAZANTIC_GATEWAY_URL?.trim() ||
    process.env.NEXT_PUBLIC_BAZANTIC_GATEWAY_URL?.trim() ||
    "https://saviours.bazgateway.com"
  ).replace(/\/$/, "");
}

type ShieldHit = {
  address: string;
  role?: string;
  decision?: string;
  status?: string;
  ensName?: string | null;
  source?: string;
  error?: string;
};

async function shieldCheck(base: string, address: string): Promise<ShieldHit> {
  const res = await fetch(`${base}/api/shield/check`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chainId: 1,
      address,
      registryNetwork: "sepolia",
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    check?: ShieldHit;
    error?: string;
    decision?: string;
    status?: string;
    ensName?: string | null;
    source?: string;
  };
  if (!res.ok) {
    return {
      address,
      error: json.error || `HTTP ${res.status}`,
    };
  }
  const check = json.check ?? json;
  return {
    address,
    decision: check.decision,
    status: check.status,
    ensName: check.ensName,
    source: check.source,
  };
}

async function tryProductApi(mode: "abort" | "proceed"): Promise<boolean> {
  const base = publicBase();
  try {
    const res = await fetch(`${base}/api/recipes/safe-swap`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      result?: { action?: string; reasons?: string[] };
      quote?: { service?: string; source?: string };
      error?: string;
    };
    if (!res.ok) {
      console.warn(
        `product API ${base}/api/recipes/safe-swap → HTTP ${res.status}: ${json.error ?? "fail"}; falling back to offline address-set`,
      );
      return false;
    }
    const action = json.result?.action ?? "";
    console.log("safe-swap-with-memory e2e");
    console.log("mode:", mode);
    console.log("path: POST /api/recipes/safe-swap (product)");
    console.log(
      "quote service:",
      json.quote?.service ?? "?",
      json.quote?.source ? `(${json.quote.source})` : "",
    );
    console.log("RESULT:", action || "UNKNOWN");
    if (json.result?.reasons?.length) {
      for (const r of json.result.reasons) console.log(" ", r);
    }
    if (mode === "abort" && action !== "CANCEL") {
      console.error("FAIL expected CANCEL from product API", json);
      process.exit(1);
    }
    if (mode === "proceed" && action !== "PROCEED") {
      console.error("FAIL expected PROCEED from product API", json);
      process.exit(1);
    }
    console.log(
      mode === "abort"
        ? "OK multi-service flow: live QuoterV2 → Saviours shield → abort"
        : "OK proceed path via product API",
    );
    return true;
  } catch (e) {
    console.warn(
      `product API unreachable (${e instanceof Error ? e.message : String(e)}); falling back to offline address-set`,
    );
    return false;
  }
}

function buildOfflineQuote(mode: "abort" | "proceed") {
  const recipient =
    mode === "abort"
      ? ATTACK_1
      : "0x1111111111111111111111111111111111111111";
  return {
    ...UNISWAP_ADDRESS_SET,
    mode,
    recipient,
    extracted: [
      { role: "router", address: UNISWAP_ADDRESS_SET.router },
      { role: "pool", address: UNISWAP_ADDRESS_SET.pool },
      { role: "quoter", address: UNISWAP_ADDRESS_SET.quoter },
      { role: "recipient", address: recipient },
    ],
  };
}

async function offlineSmoke(mode: "abort" | "proceed") {
  const quote = buildOfflineQuote(mode);
  const bases = [gatewayBase(), publicBase()].filter(
    (v, i, a) => a.indexOf(v) === i,
  );

  console.log("safe-swap-with-memory e2e");
  console.log("mode:", mode);
  console.log("path: offline address-set + live shieldCheck");
  console.log("quote service:", quote.service);
  console.log("note:", quote.note);
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
      "OK offline smoke: address-set → Saviours shield → abort (not a live Quoter claim)",
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

async function main() {
  const proceed = process.argv.includes("--proceed");
  const mode = proceed ? "proceed" : "abort";
  const usedApi = await tryProductApi(mode);
  if (!usedApi) await offlineSmoke(mode);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
