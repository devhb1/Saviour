import type { CheckOptions, CheckResult, Decision } from "./types.js";

const DEFAULT_BASE = "https://www.saviours.xyz";

function requireAddress(address: string): string {
  const a = address.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(a)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return a;
}

function baseUrl(opts: CheckOptions): string {
  return (
    opts.baseUrl ??
    process.env.SAVIOURS_BASE_URL ??
    process.env.PUBLIC_APP_URL ??
    DEFAULT_BASE
  ).replace(/\/$/, "");
}

export async function checkShield(
  address: string,
  opts: CheckOptions = {},
): Promise<CheckResult> {
  const addr = requireAddress(address);
  const t0 = Date.now();
  const res = await fetch(`${baseUrl(opts)}/api/shield/check`, {
    method: "POST",
    headers: { "content-type": "application/json" },
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
    ensName:
      json.check.ensName ??
      `${addr}.saviours.eth`,
    source: source === "none" && json.check.decision === "ESCALATE" ? "none" : source === "ens" ? "ens" : "shield",
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
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chainId: opts.chainId ?? 1,
      address: addr,
      persist: opts.persist ?? false,
      forceFresh: opts.forceFresh ?? false,
      registryNetwork: opts.registryNetwork ?? "sepolia",
    }),
  });
  const json = (await res.json()) as {
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
  };
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
