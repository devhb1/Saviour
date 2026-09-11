/**
 * POST /api/bazantic/pay-investigate
 *
 * 1) Prefer real x402 settle via local `bazantic curl` + grant (film-base) → Basescan tx.
 * 2) If CLI missing but BAZANTIC_API_KEY / BAZENTI_API_KEY is set → Bearer JWT
 *    developer bypass (gateway funded account). Live Graph+AI investigate; no Basescan tx.
 *
 * Env: BAZANTIC_PAY_ACCOUNT, BAZANTIC_GATEWAY_URL, BAZANTIC_API_KEY / BAZENTI_API_KEY
 */

import { spawnSync } from "node:child_process";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const GATEWAY = (
  process.env.BAZANTIC_GATEWAY_URL?.trim() || "https://saviour.bazgateway.com"
).replace(/\/$/, "");

type Body = {
  chainId?: number;
  address?: string;
  persist?: boolean;
  forceFresh?: boolean;
  registryNetwork?: "sepolia" | "anvil";
};

type InvestigateBody = {
  assessment?: {
    status?: string;
    confidence?: number;
    threatTypes?: string[];
    evidence?: unknown;
    explanation?: string;
  };
  explanation?: string;
  signals?: unknown[];
  evidence?: unknown[];
  cost?: unknown;
  banner?: string;
  remember?: unknown;
  shield?: unknown;
  protocols?: unknown;
  [k: string]: unknown;
};

function apiKey(): string | null {
  return (
    process.env.BAZANTIC_API_KEY?.trim() ||
    process.env.BAZENTI_API_KEY?.trim() ||
    null
  );
}

async function investigateWithJwt(
  payload: Record<string, unknown>,
  key: string,
): Promise<NextResponse> {
  const res = await fetch(`${GATEWAY}/api/investigate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let body: InvestigateBody = {};
  try {
    body = JSON.parse(text) as InvestigateBody;
  } catch {
    return NextResponse.json(
      {
        error: "JWT investigate returned non-JSON",
        detail: text.slice(0, 400),
        status: res.status,
      },
      { status: 502 },
    );
  }
  if (!res.ok) {
    return NextResponse.json(
      {
        error: `JWT investigate HTTP ${res.status}`,
        detail: text.slice(0, 400),
      },
      { status: 502 },
    );
  }
  const assessmentStatus = body.assessment?.status ?? null;
  return NextResponse.json({
    ok: true,
    live: true,
    settlement: "developer-jwt",
    settledAt: new Date().toISOString(),
    account: "gateway-bearer",
    network: "base",
    amountUsd: null,
    amountBaseUnits: null,
    payer: null,
    transaction: null,
    explorerUrl: null,
    assessmentStatus,
    note: "Developer JWT bypass (gateway funded account). Live Graph+AI — not an x402 Basescan settle. Film real x402 on pnpm dev + film-base grant.",
    body: {
      ...body,
      evidence:
        body.evidence ??
        (body.assessment as { evidence?: unknown } | undefined)?.evidence ??
        [],
      explanation: body.explanation ?? null,
    },
  });
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const chainId = Number(body.chainId ?? 1);
  const address = String(body.address ?? "").toLowerCase();
  if (!Number.isInteger(chainId) || chainId <= 0) {
    return NextResponse.json({ error: "Invalid chainId" }, { status: 400 });
  }
  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const account = process.env.BAZANTIC_PAY_ACCOUNT?.trim() || "film-base";
  const network = process.env.BAZANTIC_PAY_NETWORK?.trim() || "base";
  const payload = {
    chainId,
    address,
    persist: body.persist === true,
    forceFresh: body.forceFresh !== false,
    registryNetwork: body.registryNetwork ?? "sepolia",
  };

  const which = spawnSync("which", ["bazantic"], { encoding: "utf8" });
  if (which.status !== 0) {
    const key = apiKey();
    if (key) {
      return investigateWithJwt(payload, key);
    }
    return NextResponse.json(
      {
        error:
          "bazantic CLI not on this host and no BAZANTIC_API_KEY — set the key on Vercel for JWT investigate, or film x402 settle on pnpm dev + film-base",
        unpaidOk: true,
        hint: "POST gateway /api/investigate without pay still returns live HTTP 402",
      },
      { status: 503 },
    );
  }

  const r = spawnSync(
    "bazantic",
    [
      "curl",
      `${GATEWAY}/api/investigate`,
      "-X",
      "POST",
      "-H",
      "content-type: application/json",
      "-d",
      JSON.stringify(payload),
      "--account",
      account,
      "--network",
      network,
      "--max-amount",
      "0.05",
      "--yes",
      "--json",
    ],
    { encoding: "utf8", timeout: 180_000 },
  );

  const out = `${r.stdout || ""}\n${r.stderr || ""}`.trim();
  type PaidJson = {
    ok?: boolean;
    status?: number;
    paid?: {
      amountUsd?: string;
      amountBaseUnits?: string;
      payer?: string;
      transaction?: string;
      network?: string;
      explorerUrl?: string;
    };
    body?: InvestigateBody;
  };

  let parsed: PaidJson | null = null;
  try {
    parsed = JSON.parse(r.stdout || "") as PaidJson;
  } catch {
    parsed = null;
  }

  if (r.status !== 0 || !parsed || !parsed.ok || !parsed.paid?.transaction) {
    // CLI present but settle failed — try JWT before hard-failing
    const key = apiKey();
    if (key) {
      return investigateWithJwt(payload, key);
    }
    return NextResponse.json(
      {
        error: "x402 settle failed",
        detail: out.slice(0, 600),
        account,
        network,
        exit: r.status,
      },
      { status: 502 },
    );
  }

  const paid = parsed.paid;
  const investigate = (parsed.body ?? {}) as InvestigateBody;
  const assessmentStatus = investigate.assessment?.status ?? null;

  return NextResponse.json({
    ok: true,
    live: true,
    settlement: "x402-cli",
    settledAt: new Date().toISOString(),
    account,
    network: paid.network ?? network,
    amountUsd: paid.amountUsd,
    amountBaseUnits: paid.amountBaseUnits,
    payer: paid.payer,
    transaction: paid.transaction,
    explorerUrl:
      paid.explorerUrl ?? `https://basescan.org/tx/${paid.transaction}`,
    assessmentStatus,
    body: {
      ...investigate,
      evidence:
        investigate.evidence ??
        (investigate.assessment as { evidence?: unknown } | undefined)
          ?.evidence ??
        [],
      explanation: investigate.explanation ?? null,
    },
  });
}
