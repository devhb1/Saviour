/**
 * POST /api/bazantic/pay-investigate
 *
 * Order:
 * 1) Local `bazantic` CLI on PATH (dev laptop) → x402 Basescan tx
 * 2) Vercel grant secrets (BAZANTIC_GRANT_JSON + BAZANTIC_GATEWAY_DEVICE_KEY) → same x402
 * 3) Bearer JWT (BAZANTIC_API_KEY) → live Graph+AI, no settle tx
 */

import { spawnSync } from "node:child_process";
import { NextResponse } from "next/server";
import {
  grantSettleConfigured,
  settleInvestigateWithGrant,
} from "../../../../lib/bazanticGrantSettle";
import {
  DEMO_PAY_CAP,
  DEMO_PAY_COOKIE,
  parsePayCount,
  remainingPays,
} from "../../../../lib/demoPayBudget";

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
    assessmentStatus: body.assessment?.status ?? null,
    note: "Developer JWT bypass — live Graph+AI, not an x402 Basescan settle. Configure BAZANTIC_GRANT_JSON + BAZANTIC_GATEWAY_DEVICE_KEY for real Base USDC settle on this host.",
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

function jsonFromCliSettle(
  parsed: {
    paid: {
      amountUsd?: string;
      amountBaseUnits?: string;
      payer?: string;
      transaction: string;
      network?: string;
      explorerUrl?: string;
    };
    body?: InvestigateBody;
    account: string;
    network: string;
    settlement: string;
  },
  usedBefore: number,
) {
  const investigate = (parsed.body ?? {}) as InvestigateBody;
  const used = usedBefore + 1;
  const res = NextResponse.json({
    ok: true,
    live: true,
    settlement: parsed.settlement,
    settledAt: new Date().toISOString(),
    account: parsed.account,
    network: parsed.paid.network ?? parsed.network,
    amountUsd: parsed.paid.amountUsd,
    amountBaseUnits: parsed.paid.amountBaseUnits,
    payer: parsed.paid.payer,
    transaction: parsed.paid.transaction,
    explorerUrl:
      parsed.paid.explorerUrl ??
      `https://basescan.org/tx/${parsed.paid.transaction}`,
    assessmentStatus: investigate.assessment?.status ?? null,
    demoPaysUsed: used,
    demoPaysCap: DEMO_PAY_CAP,
    demoPaysRemaining: remainingPays(used),
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
  return withPayBudget(res, usedBefore, true);
}

function readDemoPayCount(request: Request): number {
  const raw = request.headers.get("cookie") ?? "";
  const match = raw
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${DEMO_PAY_COOKIE}=`));
  return parsePayCount(match?.slice(DEMO_PAY_COOKIE.length + 1));
}

function withPayBudget(
  res: NextResponse,
  usedBefore: number,
  charged: boolean,
): NextResponse {
  const used = charged ? usedBefore + 1 : usedBefore;
  res.cookies.set(DEMO_PAY_COOKIE, String(used), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h demo session
  });
  // Expose remaining for UI (non-httpOnly echo via header)
  res.headers.set("x-saviours-demo-pays-used", String(used));
  res.headers.set(
    "x-saviours-demo-pays-remaining",
    String(remainingPays(used)),
  );
  return res;
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

  const usedBefore = readDemoPayCount(request);
  if (usedBefore >= DEMO_PAY_CAP) {
    return NextResponse.json(
      {
        ok: false,
        error: `Demo pay cap reached (${DEMO_PAY_CAP} / session)`,
        detail:
          "Playground settles from the Bazantic grant account, not your wallet. Cap protects the grant. Reload later or use shield $0 / memory hits.",
        demoPaysUsed: usedBefore,
        demoPaysCap: DEMO_PAY_CAP,
        demoPaysRemaining: 0,
      },
      { status: 429 },
    );
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

  // 1) Local CLI on PATH
  const which = spawnSync("which", ["bazantic"], { encoding: "utf8" });
  if (which.status === 0) {
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
    type PaidJson = {
      ok?: boolean;
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
    if (r.status === 0 && parsed?.ok && parsed.paid?.transaction) {
      return jsonFromCliSettle(
        {
          paid: {
            ...parsed.paid,
            transaction: parsed.paid.transaction,
          },
          body: parsed.body,
          account,
          network,
          settlement: "x402-cli",
        },
        usedBefore,
      );
    }
  }

  // 2) Vercel / headless grant secrets → real Base USDC settle (in-process, no CLI spawn)
  if (grantSettleConfigured()) {
    try {
      const settled = await settleInvestigateWithGrant(payload);
      return jsonFromCliSettle(
        {
          paid: {
            amountUsd: settled.amountUsd,
            amountBaseUnits: settled.amountBaseUnits,
            payer: settled.payer,
            transaction: settled.transaction,
            network: settled.network,
            explorerUrl: settled.explorerUrl,
          },
          body: settled.body as InvestigateBody,
          account: settled.account,
          network: settled.network,
          settlement: settled.settlement,
        },
        usedBefore,
      );
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      // Fall through to JWT if grant settle fails
      const key = apiKey();
      if (key) {
        const jwtRes = await investigateWithJwt(payload, key);
        const jwtJson = (await jwtRes.json()) as Record<string, unknown>;
        const used = usedBefore + 1;
        const res = NextResponse.json(
          {
            ...jwtJson,
            grantError: detail.slice(0, 400),
            demoPaysUsed: used,
            demoPaysCap: DEMO_PAY_CAP,
            demoPaysRemaining: remainingPays(used),
          },
          { status: jwtRes.status },
        );
        return withPayBudget(res, usedBefore, jwtRes.ok);
      }
      return NextResponse.json(
        { error: "x402 grant settle failed", detail: detail.slice(0, 600) },
        { status: 502 },
      );
    }
  }

  // 3) JWT bypass
  const key = apiKey();
  if (key) {
    const jwtRes = await investigateWithJwt(payload, key);
    const jwtJson = (await jwtRes.json()) as Record<string, unknown>;
    const used = usedBefore + 1;
    const res = NextResponse.json(
      {
        ...jwtJson,
        grantConfigured: grantSettleConfigured(),
        demoPaysUsed: used,
        demoPaysCap: DEMO_PAY_CAP,
        demoPaysRemaining: remainingPays(used),
      },
      { status: jwtRes.status },
    );
    return withPayBudget(res, usedBefore, jwtRes.ok);
  }

  return NextResponse.json(
    {
      error:
        "No settle path: install bazantic CLI, or set BAZANTIC_GRANT_JSON + BAZANTIC_GATEWAY_DEVICE_KEY on Vercel, or BAZANTIC_API_KEY for JWT-only",
      unpaidOk: true,
      hint: "POST gateway /api/investigate without pay still returns live HTTP 402",
    },
    { status: 503 },
  );
}
