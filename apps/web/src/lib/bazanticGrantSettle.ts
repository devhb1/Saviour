/**
 * Server-side x402 settle via Bazantic grant (same rail as local
 * `bazantic curl --account film-base --network base`).
 *
 * Vercel secrets:
 *   BAZANTIC_GRANT_JSON         — credentials["film-base"] object from ~/.bazantic/config.json
 *   BAZANTIC_GATEWAY_DEVICE_KEY — PEM contents of ~/.bazantic/gateway/credentials/film-base.pem
 *   BAZANTIC_PAY_ACCOUNT        — default film-base
 *   BAZANTIC_PAY_NETWORK        — default base
 */

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

function grantJson(): string | null {
  return process.env.BAZANTIC_GRANT_JSON?.trim() || null;
}

function deviceKeyPem(): string | null {
  const raw = process.env.BAZANTIC_GATEWAY_DEVICE_KEY?.trim();
  if (!raw) return null;
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

export function grantSettleConfigured(): boolean {
  return Boolean(grantJson() && deviceKeyPem());
}

function resolveBazanticBin(): string {
  try {
    const require = createRequire(import.meta.url);
    return require.resolve("bazantic-cli/bin/bazantic.js");
  } catch {
    return "bazantic";
  }
}

export function settleInvestigateWithGrant(payload: {
  chainId: number;
  address: string;
  persist?: boolean;
  forceFresh?: boolean;
  registryNetwork?: string;
}): GrantSettleResult {
  const grantRaw = grantJson();
  const pem = deviceKeyPem();
  if (!grantRaw || !pem) {
    throw new Error("BAZANTIC_GRANT_JSON / BAZANTIC_GATEWAY_DEVICE_KEY not configured");
  }

  let grant: unknown;
  try {
    grant = JSON.parse(grantRaw);
  } catch {
    throw new Error("BAZANTIC_GRANT_JSON is not valid JSON");
  }

  const account = process.env.BAZANTIC_PAY_ACCOUNT?.trim() || "film-base";
  const network = process.env.BAZANTIC_PAY_NETWORK?.trim() || "base";
  const gateway = (
    process.env.BAZANTIC_GATEWAY_URL?.trim() || "https://saviour.bazgateway.com"
  ).replace(/\/$/, "");

  const dir = mkdtempSync(join(tmpdir(), "saviours-baz-"));
  mkdirSync(join(dir, "gateway", "credentials"), { recursive: true, mode: 0o700 });
  writeFileSync(
    join(dir, "config.json"),
    JSON.stringify({ gateway: { credentials: { [account]: grant } } }),
    { mode: 0o600 },
  );
  writeFileSync(join(dir, "gateway", "credentials", `${account}.pem`), pem, {
    mode: 0o600,
  });

  const body = {
    chainId: payload.chainId,
    address: payload.address,
    persist: payload.persist === true,
    forceFresh: payload.forceFresh !== false,
    registryNetwork: payload.registryNetwork ?? "sepolia",
  };

  const bin = resolveBazanticBin();
  const args = [
    bin,
    "curl",
    `${gateway}/api/investigate`,
    "-X",
    "POST",
    "-H",
    "content-type: application/json",
    "-d",
    JSON.stringify(body),
    "--account",
    account,
    "--network",
    network,
    "--max-amount",
    process.env.BAZANTIC_MAX_AMOUNT_USD?.trim() || "0.05",
    "--yes",
    "--json",
  ];

  const r = spawnSync(process.execPath, args, {
    encoding: "utf8",
    timeout: 180_000,
    env: {
      ...process.env,
      BAZANTIC_CONFIG_DIR: dir,
      BAZANTIC_GATEWAY_DEVICE_KEY: pem,
    },
  });

  const out = `${r.stdout || ""}\n${r.stderr || ""}`.trim();
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
    body?: Record<string, unknown>;
  };

  let parsed: PaidJson | null = null;
  try {
    parsed = JSON.parse(r.stdout || "") as PaidJson;
  } catch {
    parsed = null;
  }

  if (r.status !== 0 || !parsed?.ok || !parsed.paid?.transaction) {
    throw new Error(
      `x402 grant settle failed (exit ${r.status}): ${out.slice(0, 600)}`,
    );
  }

  const paid = parsed.paid;
  const investigate = parsed.body ?? {};
  const assessment = investigate.assessment as { status?: string } | undefined;

  return {
    ok: true,
    settlement: "x402-grant",
    amountUsd: paid.amountUsd ?? "0.01",
    amountBaseUnits: paid.amountBaseUnits,
    payer: paid.payer ?? "",
    transaction: paid.transaction!,
    network: (paid.network ?? network) as string,
    explorerUrl:
      paid.explorerUrl ?? `https://basescan.org/tx/${paid.transaction}`,
    body: {
      ...investigate,
      evidence:
        investigate.evidence ??
        (assessment as { evidence?: unknown } | undefined)?.evidence ??
        [],
      explanation: (investigate.explanation as string | null | undefined) ?? null,
    },
    assessmentStatus: assessment?.status ?? null,
    account,
  };
}
