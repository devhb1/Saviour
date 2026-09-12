import type { CheckOptions, CheckResult, Decision } from "./types.js";

/** Canonical Bazantic x402 / MCP gateway (preferred for shield + full). */
export const BAZANTIC_GATEWAY = "https://saviours.bazgateway.com" as const;

/** Public Vercel upstream (fail-closed writes). */
export const SAVIOURS_APP_URL = "https://www.saviours.xyz" as const;

/** MCP endpoint (POST only). */
export const BAZANTIC_MCP = `${BAZANTIC_GATEWAY}/mcp` as const;

const DEFAULT_BASE = BAZANTIC_GATEWAY;

function requireAddress(address: string): string {
  const a = address.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(a)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return a;
}

function baseUrl(opts: CheckOptions): string {
  const raw =
    opts.baseUrl?.trim() ||
    process.env.BAZANTIC_GATEWAY_URL?.trim() ||
    process.env.SAVIOURS_BASE_URL?.trim() ||
    process.env.PUBLIC_APP_URL?.trim() ||
    DEFAULT_BASE;
  return raw.replace(/\/$/, "");
}

function authHeaders(opts: CheckOptions): Record<string, string> {
  const key =
    opts.apiKey?.trim() ||
    process.env.BAZANTIC_API_KEY?.trim() ||
    process.env.BAZENTI_API_KEY?.trim();
  return key ? { Authorization: `Bearer ${key}` } : {};
}

export async function checkShield(
  address: string,
  opts: CheckOptions = {},
): Promise<CheckResult> {
  const addr = requireAddress(address);
  const t0 = Date.now();
  const res = await fetch(`${baseUrl(opts)}/api/shield/check`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...authHeaders(opts),
    },
    body: JSON.stringify({
      chainId: opts.chainId ?? 1,
      address: addr,
      registryNetwork: opts.registryNetwork ?? "sepolia",
    }),
  });
  const json = (await res.json()) as {
    check?: {
      decision?: Decision;
      reason?: string;
      source?: string;
      ensName?: string | null;
      latencyMs?: number;
    };
    memoryHit?: { graphQueries?: number; aiCalls?: number } | null;
    error?: string;
  };
  if (!res.ok || !json.check?.decision) {
    throw new Error(json.error || `shield/check HTTP ${res.status}`);
  }
  const sourceRaw = (json.check.source ?? "none").toLowerCase();
  const source: CheckResult["source"] =
    sourceRaw === "ens" || sourceRaw === "registry"
      ? sourceRaw === "ens"
        ? "ens"
        : "shield"
      : "none";

  return {
    decision: json.check.decision,
    status:
      json.check.decision === "BLOCK"
        ? "TAINTED"
        : json.check.decision === "WARN"
          ? "WATCH"
          : json.check.decision === "ALLOW"
            ? "SAFE"
            : "UNKNOWN",
    ensName: json.check.ensName ?? `${addr}.saviours.eth`,
    source:
      source === "none" && json.check.decision === "ESCALATE"
        ? "none"
        : source === "ens"
          ? "ens"
          : "shield",
    reason: json.check.reason,
    latencyMs:
      typeof json.check.latencyMs === "number"
        ? json.check.latencyMs
        : Date.now() - t0,
    cost: {
      graph: json.memoryHit?.graphQueries ?? 0,
      ai: json.memoryHit?.aiCalls ?? 0,
      usd: 0,
    },
    mode: "shield",
  };
}

export async function checkFull(
  address: string,
  opts: CheckOptions = {},
): Promise<CheckResult> {
  const addr = requireAddress(address);
  const t0 = Date.now();
  const res = await fetch(`${baseUrl(opts)}/api/investigate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...authHeaders(opts),
    },
    body: JSON.stringify({
      chainId: opts.chainId ?? 1,
      address: addr,
      persist: opts.persist ?? false,
      forceFresh: opts.forceFresh ?? false,
      registryNetwork: opts.registryNetwork ?? "sepolia",
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    assessment?: { status?: string; threatTypes?: string[] };
    cost?: {
      graphQueries?: number;
      aiCalls?: number;
      latencyMs?: number;
      memoryHit?: boolean;
    };
    shield?: { decision?: Decision; source?: string };
    memoryHit?: boolean;
    error?: string;
    x402Version?: number;
  };
  if (res.status === 402) {
    throw new Error(
      "investigate unpaid (HTTP 402 x402). Settle USDC on Base via Bazantic grant, or pass apiKey / BAZANTIC_API_KEY. Gateway: https://saviours.bazgateway.com",
    );
  }
  if (!res.ok) {
    throw new Error(json.error || `investigate HTTP ${res.status}`);
  }

  const status = (json.assessment?.status ?? "UNKNOWN").toUpperCase();
  let decision: Decision = "ESCALATE";
  if (status === "TAINTED") decision = "BLOCK";
  else if (status === "WATCH") decision = "WARN";
  else if (status === "SAFE") decision = "ALLOW";
  else if (json.shield?.decision) decision = json.shield.decision;

  const graph = json.cost?.graphQueries ?? 0;
  const ai = json.cost?.aiCalls ?? 0;
  const hit = Boolean(json.memoryHit ?? json.cost?.memoryHit);

  return {
    decision,
    status,
    ensName: `${addr}.saviours.eth`,
    source: hit ? "shield" : "investigate",
    threat: json.assessment?.threatTypes?.join(" ∧ "),
    latencyMs: json.cost?.latencyMs ?? Date.now() - t0,
    cost: {
      graph,
      ai,
      usd: hit ? 0 : 0.01,
    },
    mode: "full",
    reason: hit
      ? "MEMORY HIT short-circuit"
      : "Fresh investigation (Graph + AI cite + validator)",
  };
}
