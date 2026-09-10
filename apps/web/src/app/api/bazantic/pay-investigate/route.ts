/**
 * POST /api/bazantic/pay-investigate
 *
 * Real x402 settle on Base via local `bazantic curl` + grant (film-base).
 * Returns assessment + Basescan transaction URL from THIS call — not a dated example.
 *
 * Requires on the host: `bazantic` CLI logged in + grant (e.g. film-base on base).
 * Env: BAZANTIC_PAY_ACCOUNT (default film-base), BAZANTIC_GATEWAY_URL
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
    return NextResponse.json(
      {
        error:
          "bazantic CLI not on this host — run `pnpm dev` locally after `bazantic login` + grant on Base, or film paid settle from a machine with the CLI",
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
    body?: {
      assessment?: { status?: string };
      [k: string]: unknown;
    };
  };

  let parsed: PaidJson | null = null;
  try {
    parsed = JSON.parse(r.stdout || "") as PaidJson;
  } catch {
    parsed = null;
  }

  if (
    r.status !== 0 ||
    !parsed ||
    !parsed.ok ||
    !parsed.paid?.transaction
  ) {
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
  const assessmentStatus = parsed.body?.assessment?.status ?? null;

  return NextResponse.json({
    ok: true,
    live: true,
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
    body: parsed.body,
  });
}
