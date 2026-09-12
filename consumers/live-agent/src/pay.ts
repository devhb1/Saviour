/**
 * Investigate via Bazantic gateway (or upstream) when ENS has no memory.
 * Prefer gateway URL; falls back to PUBLIC_APP_URL / local.
 */

export type InvestigateResult = {
  verdict: string;
  ensName?: string;
  cost?: string;
  settlementNote?: string;
  raw?: unknown;
};

export async function investigateViaGateway(address: string): Promise<InvestigateResult> {
  const gateway =
    process.env.BAZANTIC_GATEWAY_URL ?? "https://saviours.bazgateway.com";
  const upstream =
    process.env.PUBLIC_APP_URL ?? "https://www.saviours.xyz";

  const body = {
    chainId: 1,
    address: address.toLowerCase(),
    persist: false,
    forceFresh: true,
    registryNetwork: "sepolia",
  };

  // Try Bazantic first (may 402 without payment headers)
  const baz = await fetch(`${gateway}/api/investigate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (baz.status === 402) {
    return {
      verdict: "PAYMENT_REQUIRED",
      cost: "0.01 USDC",
      settlementNote:
        "HTTP 402 from Bazantic — pay x402 then retry (see docs/BAZANTIC.md)",
      raw: await baz.json().catch(() => null),
    };
  }

  if (baz.ok) {
    const json = (await baz.json()) as {
      assessment?: { status?: string };
      remember?: { ensName?: string };
    };
    return {
      verdict: json.assessment?.status ?? "UNKNOWN",
      ensName: json.remember?.ensName,
      cost: "via Bazantic",
      raw: json,
    };
  }

  // Fallback: direct upstream (dev JWT / open local)
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (process.env.BAZANTIC_API_KEY) {
    headers.authorization = `Bearer ${process.env.BAZANTIC_API_KEY}`;
  }

  const res = await fetch(`${upstream}/api/investigate`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`investigate failed ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    assessment?: { status?: string };
    remember?: { ensName?: string };
  };
  return {
    verdict: json.assessment?.status ?? "UNKNOWN",
    ensName: json.remember?.ensName,
    cost: "upstream",
    raw: json,
  };
}
