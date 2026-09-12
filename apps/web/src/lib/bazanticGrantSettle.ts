/**
 * Server-side x402 settle via Bazantic grant (same rail as
 * `bazantic curl --account film-base --network base`).
 *
 * Uses vendored modules under ./vendor/bazantic (not pnpm-linked
 * node_modules/bazantic-cli) so Vercel packaging stays symlink-free.
 *
 * Vercel secrets:
 *   BAZANTIC_GRANT_JSON
 *   BAZANTIC_GATEWAY_DEVICE_KEY  (PEM, newlines as \n OK)
 */

import { createPrivateKey, type KeyObject } from "node:crypto";
import { gatewayCall as gatewayCallImpl } from "./vendor/bazantic/call.js";
import { DelegatedSigner as DelegatedSignerImpl } from "./vendor/bazantic/payment-source.js";
import { bazanticGatewayBase } from "./bazanticGateway";

export type GrantSettleResult = {
  ok: true;
  settlement: "x402-grant";
  amountUsd: string;
  amountBaseUnits?: string;
  payer: string;
  transaction: string;
  network: string;
  explorerUrl: string;
  body: Record<string, unknown>;
  assessmentStatus: string | null;
  account: string;
};

type GrantHandle = {
  grantId: string;
  signerId: string;
  walletId: string;
  walletAddress: string;
  capBaseUnits: string;
  capUsd: string;
  network: string;
  scope: string;
  expiresAt: string;
  relayUrl: string;
  privyAppId: string;
};

type PaidReceipt = {
  amountUsd?: string;
  amountBaseUnits?: string;
  payer?: string;
  transaction?: string;
  network?: string;
  explorerUrl?: string;
};

type GatewayCallResult = {
  ok: boolean;
  status: number;
  bodyText: string;
  paid: PaidReceipt | null;
};

/** Vendored JS infers overly-strict destructuring types; pin the call surface. */
const gatewayCall = gatewayCallImpl as unknown as (
  req: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    network: string;
    maxAmountUsd: string;
    source: unknown;
    confirm: () => Promise<boolean>;
  },
  deps?: object,
) => Promise<GatewayCallResult>;

const DelegatedSigner = DelegatedSignerImpl as unknown as new (args: {
  grant: GrantHandle;
  deviceKey: KeyObject;
}) => unknown;

function readGrant(): GrantHandle | null {
  const raw = process.env.BAZANTIC_GRANT_JSON?.trim();
  if (!raw) return null;
  try {
    const g = JSON.parse(raw) as GrantHandle;
    if (!g.grantId || !g.relayUrl || !g.walletAddress || !g.walletId) return null;
    return g;
  } catch {
    return null;
  }
}

function readDeviceKey(): KeyObject | null {
  const raw = process.env.BAZANTIC_GATEWAY_DEVICE_KEY?.trim();
  if (!raw) return null;
  try {
    const pem = raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
    return createPrivateKey(pem);
  } catch {
    return null;
  }
}

export function grantSettleConfigured(): boolean {
  return Boolean(readGrant() && readDeviceKey());
}

export async function settleInvestigateWithGrant(payload: {
  chainId: number;
  address: string;
  persist?: boolean;
  forceFresh?: boolean;
  registryNetwork?: string;
}): Promise<GrantSettleResult> {
  const grant = readGrant();
  const deviceKey = readDeviceKey();
  if (!grant || !deviceKey) {
    throw new Error("BAZANTIC_GRANT_JSON / BAZANTIC_GATEWAY_DEVICE_KEY not configured");
  }

  const account = process.env.BAZANTIC_PAY_ACCOUNT?.trim() || "film-base";
  const network = process.env.BAZANTIC_PAY_NETWORK?.trim() || "base";
  const gateway = bazanticGatewayBase();

  const source = new DelegatedSigner({ grant, deviceKey });
  const result = await gatewayCall(
    {
      url: `${gateway}/api/investigate`,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chainId: payload.chainId,
        address: payload.address,
        persist: payload.persist === true,
        forceFresh: payload.forceFresh !== false,
        registryNetwork: payload.registryNetwork ?? "sepolia",
      }),
      network,
      maxAmountUsd: process.env.BAZANTIC_MAX_AMOUNT_USD?.trim() || "0.05",
      source,
      confirm: async () => true,
    },
    {},
  );

  if (!result.ok || !result.paid?.transaction) {
    throw new Error(
      `grant settle failed HTTP ${result.status}: ${String(result.bodyText ?? "").slice(0, 400)}`,
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(result.bodyText) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const assessment = body.assessment as { status?: string; evidence?: unknown } | undefined;

  return {
    ok: true,
    settlement: "x402-grant",
    amountUsd: String(result.paid.amountUsd ?? "0.01"),
    amountBaseUnits: result.paid.amountBaseUnits,
    payer: String(result.paid.payer ?? grant.walletAddress),
    transaction: String(result.paid.transaction),
    network: String(result.paid.network ?? network),
    explorerUrl: String(
      result.paid.explorerUrl ??
        `https://basescan.org/tx/${result.paid.transaction}`,
    ),
    body: {
      ...body,
      evidence: body.evidence ?? assessment?.evidence ?? [],
      explanation: (body.explanation as string | null | undefined) ?? null,
    },
    assessmentStatus: assessment?.status ?? null,
    account,
  };
}
